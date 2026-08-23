'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;
  const S = globalThis.MAT_SHARED;
  const $id = (id) => MAT.dom.getElementById(id);

  const MAX_BATCH_ACTIVITIES = 30;
  const MAX_BATCH_FILES = 30;
  const MAX_BATCH_TOTAL_BYTES = 20 * 1024 * 1024;
  const DOWNLOAD_INTERVAL_MS = 900;

  const LOTE_SECTION = [
    '',
    '## Lote de múltiplas atividades',
    '',
    'Quando esta correção envolver mais de uma atividade ao mesmo tempo (várias atividades enviadas juntas), adapte a saída da seguinte forma:',
    '',
    '- Inclua as colunas `cmid` e `atividade` no início do CSV.',
    '- Preserve o `cmid` e o nome exatamente como aparecem no arquivo `manifesto_atividades.csv`.',
    '- Formato: `cmid;atividade;nome;nota;feedback;situacao`',
    '- Gere uma única tabela CSV cobrindo todos os alunos de todas as atividades enviadas, com uma linha por aluno por atividade.',
    '- Todas as demais regras deste agente (limitações, estilo, tratamento de fóruns, validação) continuam se aplicando normalmente a cada linha.'
  ].join('\n');

  const csvEscape = (value) => `"${S.neutralizeSpreadsheetFormula(value).replace(/"/g, '""')}"`;
  const slug = (value = '') => U.normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'uc';
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const triggerDownload = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const buildDownloadAllUrl = (assignment) => {
    const base = assignment.gradingUrl || assignment.url;
    const url = new URL(base, location.origin);
    url.searchParams.set('id', assignment.cmid);
    url.searchParams.set('action', 'downloadall');
    return url.href;
  };

  const pendingAssignments = (snapshot) => (snapshot?.activityPanorama?.assignments || [])
    .filter((assignment) => (assignment.metrics?.pending || 0) > 0 && assignment.cmid && (assignment.gradingUrl || assignment.url));

  async function downloadAllForCorrection() {
    const snapshot = MAT.state.snapshot;
    if (!snapshot) return MAT.ui.toast('Execute a análise completa antes de baixar tudo.');

    const pending = pendingAssignments(snapshot);
    if (!pending.length) return MAT.ui.toast('Não há atividades com correção pendente para baixar.');
    if (pending.length > MAX_BATCH_ACTIVITIES) {
      return MAT.ui.toast(`Muitas atividades pendentes (${pending.length}). O limite por lote é ${MAX_BATCH_ACTIVITIES}; filtre por unidade ou corrija em partes.`);
    }

    const courseSlug = slug(snapshot.course?.name);

    const manifestRows = pending.map((assignment) => [assignment.cmid, assignment.name, assignment.dueText || '', assignment.gradingUrl || assignment.url]);
    const manifestCsv = '\ufeff' + ['cmid;atividade;prazo;url_atividade', ...manifestRows.map((row) => row.map(csvEscape).join(';'))].join('\n');
    U.downloadBlob(manifestCsv, `manifesto_atividades_${courseSlug}.csv`, 'text/csv;charset=utf-8');

    const combinedAgent = `${MAT.assistedGrading?.AGENT_MARKDOWN || ''}${LOTE_SECTION}\n`;
    U.downloadBlob(combinedAgent, 'agente-corretor-moodle-universal-lote.md', 'text/markdown;charset=utf-8');

    MAT.ui.toast(`Baixando os envios de ${pending.length} atividade(s). O navegador pode pedir permissão para múltiplos downloads — permita para continuar.`);

    for (let i = 0; i < pending.length; i++) {
      triggerDownload(buildDownloadAllUrl(pending[i]));
      if (i < pending.length - 1) await delay(DOWNLOAD_INTERVAL_MS);
    }

    MAT.ui.toast('Downloads disparados. Confira a pasta de downloads: um ZIP por atividade + manifesto + agente para a IA.');
  }

  // -----------------------------------------------------------------------------------
  // "Lançar tudo": upload do CSV único (atividade;nome;nota;feedback;situacao), casamento
  // por atividade e disparo do lançamento totalmente automático via background.
  // -----------------------------------------------------------------------------------

  function parseBatchCsv(text) {
    return S.parseBatchCsv(text);
  }

  function groupRecordsByActivity(records, assignments) {
    const groups = new Map(); // cmid -> { assignment, records: [] }
    const unmatched = [];

    for (const record of records) {
      const match = S.matchActivity(record, assignments);
      const assignment = match.status === 'exact' ? match.assignment : null;
      if (!assignment) { unmatched.push({ ...record, match }); continue; }
      if (!groups.has(assignment.cmid)) groups.set(assignment.cmid, { assignment, records: [] });
      groups.get(assignment.cmid).records.push({
        studentId: record.studentId,
        nome: record.nome,
        nota: record.nota,
        feedback: record.feedback,
        situacaoRaw: record.situacaoRaw,
        sourceRow: record.rowNumber,
      });
    }

    return { groups: [...groups.values()], unmatched };
  }

  // -----------------------------------------------------------------------------------
  // UI: modal de "Lançar tudo"
  // -----------------------------------------------------------------------------------

  const STATE = {
    parsed: null,
    files: [],
    groups: [],
    unmatched: [],
    pendingMappings: [],
    batchId: null,
    running: false,
    results: [],
    onlyVerificationIssues: false,
    historyRecordedBatchId: null,
    returnFocus: null,
    keyHandler: null,
  };

  const hasActivityColumns = (parsed) => Boolean(parsed && (parsed.indexes?.atividadeId !== -1 || parsed.indexes?.atividade !== -1));

  const isBatchBlocked = () => !STATE.groups.length
    || STATE.unmatched.length > 0
    || STATE.pendingMappings.length > 0
    || STATE.parsed?.errors?.length > 0;

  function rebuildBatchState(assignments = pendingAssignments(MAT.state.snapshot)) {
    const records = [];
    const errors = [];
    const warnings = [];
    const pendingMappings = [];
    const identifiers = new Map();

    for (const [fileIndex, item] of STATE.files.entries()) {
      if (item.error) {
        errors.push(`${item.name}: ${item.error}`);
        continue;
      }
      errors.push(...(item.parsed.errors || []).map((error) => `${item.name}: ${error}`));
      warnings.push(...(item.parsed.warnings || []).map((warning) => `${item.name}: ${warning}`));

      const selectedAssignment = item.selectedCmid
        ? assignments.find((assignment) => String(assignment.cmid) === String(item.selectedCmid))
        : null;
      if (!item.embeddedActivity && !selectedAssignment) pendingMappings.push({ fileIndex, fileName: item.name });

      for (const parsedRecord of item.parsed.records || []) {
        const record = item.embeddedActivity
          ? { ...parsedRecord, sourceFile: item.name }
          : selectedAssignment
            ? { ...parsedRecord, atividadeId: String(selectedAssignment.cmid), atividade: selectedAssignment.name, sourceFile: item.name }
            : null;
        if (!record) continue;
        const activityKey = record.atividadeId ? `id:${record.atividadeId}` : `nome:${U.normalizeText(record.atividade)}`;
        const studentKey = record.studentId ? `id:${record.studentId}` : `nome:${U.normalizeText(record.nome)}`;
        const identifier = `${activityKey}|${studentKey}`;
        if (identifiers.has(identifier)) {
          const previous = identifiers.get(identifier);
          errors.push(`${item.name}, linha ${record.rowNumber}: registro duplicado com ${previous.fileName}, linha ${previous.rowNumber}.`);
          continue;
        }
        identifiers.set(identifier, { fileName: item.name, rowNumber: record.rowNumber });
        records.push(record);
      }
    }

    const { groups, unmatched } = groupRecordsByActivity(records, assignments);
    STATE.parsed = { records, errors, warnings };
    STATE.groups = groups;
    STATE.unmatched = unmatched;
    STATE.pendingMappings = pendingMappings;
  }

  function closeModal() {
    if (STATE.running) return MAT.ui.toast('Cancele ou aguarde a conclusão do lote antes de fechar.');
    $id('mat-batch-backdrop')?.remove();
    if (STATE.keyHandler) document.removeEventListener('keydown', STATE.keyHandler);
    MAT.state.operationMode = 'consulta';
    MAT.ui.updateHeader();
    STATE.returnFocus?.focus?.();
  }

  function renderPreview() {
    const body = $id('mat-batch-preview');
    if (!body) return;

    if (!STATE.files.length) {
      body.innerHTML = '<p class="mat-footer-note">Selecione um CSV combinado ou vários CSVs individuais para validar o lote.</p>';
      return;
    }

    const assignments = pendingAssignments(MAT.state.snapshot);
    const fileRows = STATE.files.map((item, index) => {
      const mapping = item.error
        ? `<span class="mat-text-danger">Arquivo inválido</span>`
        : item.embeddedActivity
          ? '<span class="mat-badge mat-badge-success">Informada no CSV</span>'
          : `<label class="mat-sr-only" for="mat-batch-file-map-${index}">Atividade do arquivo ${U.escapeHtml(item.name)}</label><select id="mat-batch-file-map-${index}" class="mat-input mat-batch-file-map" data-batch-file-index="${index}" aria-label="Atividade do arquivo ${U.escapeHtml(item.name)}"><option value="">Selecione a atividade</option>${assignments.map((assignment) => `<option value="${U.escapeHtml(assignment.cmid)}" ${String(item.selectedCmid) === String(assignment.cmid) ? 'selected' : ''}>${U.escapeHtml(assignment.name)} (CMID ${U.escapeHtml(assignment.cmid)})</option>`).join('')}</select>`;
      const recordCount = item.parsed?.records?.length || 0;
      return `<tr><td><strong>${U.escapeHtml(item.name)}</strong></td><td>${mapping}</td><td>${recordCount}</td></tr>`;
    }).join('');

    const matchedRows = STATE.groups.map((group) => `
      <tr>
        <td><strong>${U.escapeHtml(group.assignment.name)}</strong><div class="mat-footer-note">CMID ${U.escapeHtml(group.assignment.cmid)}</div></td>
        <td>${group.records.length}</td>
        <td><span class="mat-badge mat-badge-success">Correspondência exata</span></td>
      </tr>`).join('');

    const unmatchedRows = STATE.unmatched.length
      ? `<tr><td colspan="3"><strong class="mat-text-danger">Lote bloqueado: ${STATE.unmatched.length} registro(s) sem correspondência exata.</strong><div class="mat-footer-note">Revise CMID ou atividade: ${U.escapeHtml([...new Set(STATE.unmatched.map((r) => r.atividadeId || r.atividade))].join(', '))}</div></td></tr>`
      : '';

    const validationRows = STATE.parsed?.errors?.length
      ? `<tr><td colspan="3"><div class="mat-warning mat-error" role="alert"><strong>Erros de validação:</strong><ul>${STATE.parsed.errors.map((error) => `<li>${U.escapeHtml(error)}</li>`).join('')}</ul></div></td></tr>`
      : '';

    const pendingMappingWarning = STATE.pendingMappings.length
      ? `<div class="mat-warning" role="status"><strong>Confirmação necessária:</strong> selecione a atividade correspondente a ${STATE.pendingMappings.length} arquivo(s).</div>`
      : '';

    body.innerHTML = `
      <div class="mat-section-title">Arquivos selecionados</div>
      <div class="mat-table-wrap"><table class="mat-table mat-batch-files-table">
        <thead><tr><th>Arquivo</th><th>Atividade</th><th>Registros</th></tr></thead>
        <tbody>${fileRows}</tbody>
      </table></div>
      ${pendingMappingWarning}
      <div class="mat-section-title">Resumo do lote</div>
      <table class="mat-table">
        <thead><tr><th>Atividade</th><th>Registros</th><th>Status</th></tr></thead>
        <tbody>${matchedRows || ''}${unmatchedRows}${validationRows}</tbody>
      </table>`;
  }

  function updateBatchControls() {
    const blocked = isBatchBlocked();
    const confirmInput = $id('mat-batch-confirm');
    const launchBtn = $id('mat-batch-launch');
    if (confirmInput) {
      confirmInput.disabled = blocked;
      confirmInput.checked = false;
    }
    if (launchBtn) {
      launchBtn.disabled = true;
      launchBtn.textContent = 'Confirmar salvamento';
      delete launchBtn.dataset.action;
    }
    const log = $id('mat-batch-log');
    if (!log) return;
    if (blocked) {
      log.innerHTML = '<div class="mat-warning mat-error" role="alert"><strong>Revisão necessária:</strong> associe todos os arquivos às atividades e corrija os erros indicados.</div>';
      return;
    }
    log.innerHTML = `<div class="mat-info" role="status"><strong>Arquivos validados:</strong> ${STATE.files.length} arquivo(s), ${STATE.groups.length} atividade(s) e ${STATE.parsed.records.length} registro(s), sem bloqueios.</div>`;
  }

  async function handleBatchFiles(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    try {
      if (files.length > MAX_BATCH_FILES) throw new Error(`Selecione no máximo ${MAX_BATCH_FILES} arquivos por lote.`);
      const totalBytes = files.reduce((total, file) => total + file.size, 0);
      if (totalBytes > MAX_BATCH_TOTAL_BYTES) throw new Error('O conjunto de arquivos excede o limite de 20 MB.');
      const snapshot = MAT.state.snapshot;
      const assignments = pendingAssignments(snapshot);
      STATE.files = await Promise.all(files.map(async (file) => {
        try {
          if (file.size > S.LIMITS.maxFileBytes) throw new Error('O arquivo excede o limite individual de 5 MB.');
          const parsed = S.parseBatchCsv(await file.text(), { allowMissingActivity: true });
          const embeddedActivity = hasActivityColumns(parsed);
          const fileMatch = embeddedActivity ? null : S.matchActivityFromFileName(file.name, assignments);
          return {
            name: file.name,
            size: file.size,
            parsed,
            embeddedActivity,
            selectedCmid: fileMatch?.status === 'exact' ? String(fileMatch.assignment.cmid) : '',
            matchMethod: fileMatch?.method || '',
            error: ''
          };
        } catch (error) {
          return { name: file.name, size: file.size, parsed: null, embeddedActivity: false, selectedCmid: '', error: error.message };
        }
      }));
      rebuildBatchState(assignments);
      renderPreview();
      updateBatchControls();
    } catch (error) {
      STATE.parsed = null;
      STATE.files = [];
      STATE.groups = [];
      STATE.unmatched = [];
      STATE.pendingMappings = [];
      const confirmInput = $id('mat-batch-confirm');
      if (confirmInput) { confirmInput.disabled = true; confirmInput.checked = false; }
      renderPreview();
      const log = $id('mat-batch-log');
      if (log) log.innerHTML = `<div class="mat-warning"><strong>Erro no arquivo:</strong> ${U.escapeHtml(error.message)}</div>`;
    }
  }

  function handleFileMappingChange(event) {
    const select = event.target.closest('[data-batch-file-index]');
    if (!select) return;
    const item = STATE.files[Number(select.dataset.batchFileIndex)];
    if (!item || item.embeddedActivity) return;
    item.selectedCmid = select.value;
    rebuildBatchState();
    renderPreview();
    updateBatchControls();
  }

  function renderProgressRow(activityName, phase, result) {
    const list = $id('mat-batch-progress-list');
    if (!list) return;
    const id = `mat-batch-row-${U.normalizeText(activityName).replace(/[^a-z0-9]+/g, '-')}`;
    let row = $id(id);
    if (!row) {
      row = document.createElement('div');
      row.id = id;
      row.className = 'mat-batch-row';
      list.appendChild(row);
    }
    const statusLabel = phase === 'verificando' ? 'Conferindo no Moodle…'
      : phase === 'processando' ? 'Processando…'
      : result?.outcome === 'sucesso' ? 'Sucesso'
      : result?.outcome === 'divergente' ? 'Divergência'
      : result?.outcome === 'nao_verificado' ? 'Não verificado'
      : result?.outcome === 'sem_alteracoes' ? 'Sem alterações'
      : result?.outcome === 'pre_visualizado' ? 'Pré-visualizado'
      : result?.outcome === 'cancelado' ? 'Cancelado'
      : result ? 'Erro' : '—';
    const tone = result?.outcome === 'sucesso' ? 'success' : result?.outcome === 'erro' ? 'danger' : result ? 'warning' : 'neutral';
    row.innerHTML = `<strong>${U.escapeHtml(activityName)}</strong> — <span class="mat-badge mat-badge-${tone}">${statusLabel}</span>${result?.message ? `<div class="mat-footer-note">${U.escapeHtml(result.message)}</div>` : ''}`;
  }

  function verificationStatusMeta(status) {
    const values = {
      confirmed: { label: 'Confirmado', tone: 'success' },
      divergent: { label: 'Divergente', tone: 'danger' },
      not_found: { label: 'Não localizado', tone: 'warning' },
      not_verifiable: { label: 'Não verificável', tone: 'warning' },
      not_requested: { label: 'Não solicitado', tone: 'neutral' },
    };
    return values[status] || values.not_verifiable;
  }

  function renderFieldStatus(field, type) {
    const meta = verificationStatusMeta(field?.status);
    const badge = `<span class="mat-badge mat-badge-${meta.tone}">${meta.label}</span>`;
    if (type !== 'feedback' || !field || !['divergent', 'not_verifiable'].includes(field.status)) return badge;
    return `${badge}<details class="mat-verification-details"><summary>Comparar textos</summary><div><strong>CSV</strong><p>${U.escapeHtml(field.expected || 'Sem conteúdo')}</p><strong>Moodle</strong><p>${U.escapeHtml(field.actual || 'Sem conteúdo')}</p></div></details>`;
  }

  function renderVerificationPanel() {
    const panel = $id('mat-batch-verification');
    if (!panel) return;
    const items = STATE.results.flatMap((result) => {
      const verified = (result.verification?.items || []).map((item) => ({
        ...item,
        activityName: result.activityName || '',
        cmid: result.cmid || '',
      }));
      if (verified.length || result.outcome !== 'nao_verificado') return verified;
      return [{
        activityName: result.activityName || '', cmid: result.cmid || '', nome: '', moodleName: '',
        status: 'not_verifiable',
        grade: { expected: '', actual: '', status: 'not_requested' },
        feedback: { expected: '', actual: '', status: 'not_requested' },
        message: result.message || 'A conferência não foi concluída.',
      }];
    });
    if (!items.length) {
      panel.hidden = true;
      return;
    }

    const summary = items.reduce((totals, item) => {
      totals.total += 1;
      if (item.status === 'confirmed') totals.confirmed += 1;
      else if (item.status === 'divergent') totals.divergent += 1;
      else if (item.status === 'not_found') totals.notFound += 1;
      else totals.notVerifiable += 1;
      return totals;
    }, { total: 0, confirmed: 0, divergent: 0, notFound: 0, notVerifiable: 0 });
    const visibleItems = STATE.onlyVerificationIssues ? items.filter((item) => item.status !== 'confirmed') : items;
    const rows = visibleItems.map((item) => {
      const meta = verificationStatusMeta(item.status);
      return `<tr>
        <td><strong>${U.escapeHtml(item.activityName)}</strong><div class="mat-footer-note">CMID ${U.escapeHtml(item.cmid)}</div></td>
        <td>${U.escapeHtml(item.moodleName || item.nome || 'Não localizado')}</td>
        <td>${U.escapeHtml(item.grade?.expected || 'Não solicitado')}</td>
        <td>${U.escapeHtml(item.grade?.actual || 'Não disponível')}<div class="mat-verification-field-status">${renderFieldStatus(item.grade, 'grade')}</div></td>
        <td>${renderFieldStatus(item.feedback, 'feedback')}</td>
        <td><span class="mat-badge mat-badge-${meta.tone}">${meta.label}</span>${item.message ? `<div class="mat-footer-note">${U.escapeHtml(item.message)}</div>` : ''}</td>
      </tr>`;
    }).join('');

    panel.hidden = false;
    panel.innerHTML = `
      <div class="mat-section-head"><div><h3 id="mat-batch-verification-title">Conferência de notas e correções</h3><p>Comparação entre o CSV e os valores relidos após a confirmação do Moodle.</p></div></div>
      <div class="mat-verification-summary" role="status" aria-live="polite">
        <strong>${summary.confirmed} de ${summary.total} confirmado(s)</strong>
        <span>${summary.divergent} divergente(s)</span>
        <span>${summary.notFound} não localizado(s)</span>
        <span>${summary.notVerifiable} não verificável(is)</span>
      </div>
      <div class="mat-verification-toolbar">
        <label class="mat-check"><input id="mat-batch-only-issues" type="checkbox" ${STATE.onlyVerificationIssues ? 'checked' : ''} /> Mostrar somente divergências e itens não verificados</label>
        <button class="mat-btn mat-btn-sm" id="mat-batch-refresh-dashboard" type="button">Atualizar painel do curso</button>
      </div>
      <div class="mat-table-wrap"><table class="mat-table mat-verification-table">
        <thead><tr><th>Atividade</th><th>Aluno</th><th>Nota esperada</th><th>Nota no Moodle</th><th>Feedback</th><th>Situação</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">Nenhuma divergência encontrada.</td></tr>'}</tbody>
      </table></div>`;

    $id('mat-batch-only-issues')?.addEventListener('change', (event) => {
      STATE.onlyVerificationIssues = event.target.checked;
      renderVerificationPanel();
    });
    $id('mat-batch-refresh-dashboard')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try { await MAT.main?.refreshAnalysis?.(); }
      finally { button.disabled = false; button.removeAttribute('aria-busy'); }
    });
  }

  async function recordVerificationHistory() {
    if (!MAT.state.course?.id || !STATE.results.length || !MAT.storage?.addAction) return;
    if (STATE.historyRecordedBatchId === STATE.batchId) return;
    const items = STATE.results.flatMap((result) => result.verification?.items || []);
    const totals = items.reduce((summary, item) => {
      summary.total += 1;
      if (item.status === 'confirmed') summary.confirmed += 1;
      else if (item.status === 'divergent') summary.divergent += 1;
      else summary.pending += 1;
      return summary;
    }, { total: 0, confirmed: 0, divergent: 0, pending: 0 });
    const failedActivities = STATE.results.filter((result) => result.outcome === 'erro').length;
    await MAT.storage.addAction({
      type: 'conferencia_lote',
      title: 'Conferência de correções em lote',
      note: `${STATE.results.length} atividade(s) processada(s). ${totals.total} registro(s) relido(s): ${totals.confirmed} confirmado(s), ${totals.divergent} divergente(s) e ${totals.pending} pendente(s) de conferência. ${failedActivities} atividade(s) sem salvamento confirmado.`,
    }, MAT.state.course.id);
    MAT.state.actions = await MAT.storage.loadActions(MAT.state.course.id);
    MAT.ui.renderView?.('historico');
    STATE.historyRecordedBatchId = STATE.batchId;
  }

  function handleBatchMessage(message) {
    if (!message || message.batchId !== STATE.batchId) return;
    if (message.type === 'MAT_BATCH_PROGRESS') {
      renderProgressRow(message.activityName, message.phase, message.result);
      const counter = $id('mat-batch-counter');
      if (counter) counter.textContent = `${message.index + 1} de ${message.total}`;
    }
    if (message.type === 'MAT_BATCH_DONE') {
      STATE.running = false;
      MAT.state.operationMode = 'concluido';
      STATE.results = message.results || [];
      const launchBtn = $id('mat-batch-launch');
      const cancelBtn = $id('mat-batch-cancel');
      const reportBtn = $id('mat-batch-report');
      const errorCount = STATE.results.filter((r) => r.outcome === 'erro').length;
      const divergentCount = STATE.results.filter((r) => r.outcome === 'divergente').length;
      const unverifiedCount = STATE.results.filter((r) => r.outcome === 'nao_verificado').length;
      if (launchBtn) {
        launchBtn.disabled = false;
        launchBtn.dataset.action = 'review-results';
        launchBtn.textContent = errorCount ? 'Revisar falhas'
          : divergentCount ? 'Revisar divergências'
            : unverifiedCount ? 'Conferir manualmente'
              : 'Ver conferência';
      }
      if (cancelBtn) cancelBtn.hidden = true;
      if (reportBtn) { reportBtn.hidden = false; reportBtn.textContent = 'Baixar conferência'; }
      const successCount = STATE.results.filter((r) => r.outcome === 'sucesso').length;
      renderVerificationPanel();
      recordVerificationHistory().catch((error) => {
        MAT.state.storageError = error?.message || 'Não foi possível registrar a conferência no histórico local.';
      });
      if (errorCount) {
        MAT.ui.toast(`Lote concluído com falhas: ${errorCount} de ${STATE.results.length} atividade(s) não foram salvas.`, 'error');
      } else if (divergentCount || unverifiedCount) {
        MAT.ui.toast(`Salvamento concluído com conferência pendente: ${divergentCount} atividade(s) divergente(s) e ${unverifiedCount} não verificada(s).`, 'warning');
      } else {
        MAT.ui.toast(`Lote concluído e conferido: ${successCount} de ${STATE.results.length} atividade(s) confirmada(s) no Moodle.`);
      }
    }
  }

  function downloadBatchReport() {
    if (!STATE.results.length) return;
    const headers = ['atividade', 'cmid', 'aluno', 'resultado_atividade', 'situacao_conferencia', 'nota_esperada', 'nota_moodle', 'situacao_nota', 'feedback_esperado', 'feedback_moodle', 'situacao_feedback', 'mensagem'];
    const rows = STATE.results.flatMap((result) => {
      const items = result.verification?.items || [];
      if (!items.length) return [[result.activityName || '', result.cmid || '', '', result.outcome || '', 'nao_verificado', '', '', '', '', '', '', result.message || '']];
      return items.map((item) => [
        result.activityName || '', result.cmid || '', item.moodleName || item.nome || '', result.outcome || '', item.status || '',
        item.grade?.expected || '', item.grade?.actual || '', item.grade?.status || '',
        item.feedback?.expected || '', item.feedback?.actual || '', item.feedback?.status || '', item.message || result.message || '',
      ]);
    });
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    U.downloadBlob(csv, `relatorio_conferencia_lote_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  }

  function handleBatchPrimaryAction(event) {
    if (event.currentTarget.dataset.action === 'review-results') {
      const verification = $id('mat-batch-verification');
      const target = verification?.hidden ? $id('mat-batch-progress-list') : verification;
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      const heading = $id('mat-batch-verification-title');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      return;
    }
    startBatch();
  }

  function startBatch() {
    if (!STATE.groups.length || STATE.running) return;
    if (STATE.groups.length > MAX_BATCH_ACTIVITIES) {
      return MAT.ui.toast(`Muitas atividades no lote (${STATE.groups.length}). O limite é ${MAX_BATCH_ACTIVITIES}.`);
    }

    if (isBatchBlocked()) {
      return MAT.ui.toast('O lote possui bloqueios e não pode ser salvo.');
    }
    const confirmed = $id('mat-batch-confirm')?.checked;
    if (!confirmed) return MAT.ui.toast('Confirme a revisão das alterações antes de salvar.');

    const overwriteGrade = $id('mat-batch-overwrite-grade')?.checked ?? false;
    const overwriteFeedback = $id('mat-batch-overwrite-feedback')?.checked ?? false;

    STATE.batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    STATE.running = true;
    STATE.results = [];
    MAT.state.operationMode = 'salvamento';
    MAT.ui.updateHeader();

    const list = $id('mat-batch-progress-list');
    if (list) list.innerHTML = '';
    const verificationPanel = $id('mat-batch-verification');
    if (verificationPanel) { verificationPanel.hidden = true; verificationPanel.innerHTML = ''; }

    const jobs = STATE.groups.map((group) => ({
      cmid: group.assignment.cmid,
      gradingUrl: group.assignment.gradingUrl || group.assignment.url,
      activityName: group.assignment.name,
      records: group.records,
    }));

    const launchBtn = $id('mat-batch-launch');
    const cancelBtn = $id('mat-batch-cancel');
    const reportBtn = $id('mat-batch-report');
    if (launchBtn) { delete launchBtn.dataset.action; launchBtn.disabled = true; launchBtn.textContent = 'Salvando notas'; }
    if (cancelBtn) cancelBtn.hidden = false;
    if (reportBtn) reportBtn.hidden = true;

    chrome.runtime.sendMessage({
      type: 'MAT_BATCH_LAUNCH_START',
      batchId: STATE.batchId,
      jobs,
      options: { overwriteGrade, overwriteFeedback, flexMatch: false, dryRun: false },
    }, (response) => {
      if (chrome.runtime.lastError || response?.accepted === false) {
        STATE.running = false;
        MAT.state.operationMode = 'preparacao';
        MAT.ui.updateHeader();
        if (launchBtn) { launchBtn.disabled = false; launchBtn.textContent = 'Confirmar salvamento'; }
        if (cancelBtn) cancelBtn.hidden = true;
        MAT.ui.toast(`Falha ao iniciar o lote: ${chrome.runtime.lastError?.message || response?.error || 'serviço indisponível'}`, 'error');
      }
    });
  }

  function cancelBatch() {
    if (!STATE.batchId) return;
    chrome.runtime.sendMessage({ type: 'MAT_BATCH_CANCEL', batchId: STATE.batchId });
    MAT.ui.toast('Cancelamento solicitado. As atividades já em andamento ainda serão concluídas.');
  }

  function openModal() {
    if ($id('mat-batch-backdrop')) return;
    STATE.parsed = null;
    STATE.files = [];
    STATE.groups = [];
    STATE.unmatched = [];
    STATE.pendingMappings = [];
    STATE.batchId = null;
    STATE.running = false;
    STATE.results = [];
    STATE.onlyVerificationIssues = false;
    STATE.historyRecordedBatchId = null;
    STATE.returnFocus = MAT.dom.ensureHost().activeElement;
    const snapshot = MAT.state.snapshot;
    const pendingCount = pendingAssignments(snapshot).length;

    const backdrop = document.createElement('div');
    backdrop.id = 'mat-batch-backdrop';
    backdrop.className = 'mat-batch-backdrop';
    backdrop.innerHTML = `
      <div class="mat-batch-modal" role="dialog" aria-modal="true" aria-labelledby="mat-batch-title">
        <header class="mat-batch-header">
          <h2 id="mat-batch-title">Revisar correção em lote</h2>
          <button type="button" id="mat-batch-close" aria-label="Fechar">×</button>
        </header>
        <div class="mat-batch-body">
          <p>${pendingCount} atividade(s) com correção pendente foram reconhecidas nesta UC. Você pode selecionar um CSV combinado ou vários CSVs individuais.</p>
          <div class="mat-warning"><strong>Alteração acadêmica:</strong> a etapa final salvará notas e feedbacks no Moodle. O processo será bloqueado se houver atividade, estudante ou nota sem validação.</div>

          <label class="mat-check"><input id="mat-batch-overwrite-grade" type="checkbox" /> Sobrescrever notas existentes</label>
          <label class="mat-check"><input id="mat-batch-overwrite-feedback" type="checkbox" /> Sobrescrever feedbacks existentes</label>
          <div class="mat-info">No CSV combinado, informe CMID ou atividade. Nos arquivos individuais, a atividade pode ser reconhecida pelo nome do arquivo ou confirmada na seleção exibida abaixo. Correspondências aproximadas não são salvas automaticamente.</div>

          <div class="mat-form-field">
            <label for="mat-batch-file">Arquivos CSV</label>
            <input id="mat-batch-file" type="file" accept=".csv,.txt,.tsv" multiple aria-describedby="mat-batch-file-help" />
            <div id="mat-batch-file-help" class="mat-footer-note">Selecione até 30 arquivos. Use Ctrl ou Shift para escolher vários arquivos na mesma janela.</div>
          </div>

          <div id="mat-batch-preview"><p class="mat-footer-note">Selecione um CSV combinado ou vários CSVs individuais para ver a prévia.</p></div>
          <div id="mat-batch-log" aria-live="polite" aria-atomic="true"></div>

          <label class="mat-check mat-confirm-change"><input id="mat-batch-confirm" type="checkbox" disabled /> Revisei curso, atividades, estudantes e alterações apresentadas acima.</label>

          <div class="mat-form-actions">
            <button class="mat-btn mat-btn-sm" id="mat-batch-cancel" type="button" hidden>Cancelar lote</button>
            <button class="mat-btn mat-btn-sm" id="mat-batch-report" type="button" hidden>Baixar relatório</button>
            <span id="mat-batch-counter" class="mat-footer-note"></span>
            <button class="mat-btn mat-btn-primary" id="mat-batch-launch" type="button" disabled>Confirmar salvamento</button>
          </div>

          <div id="mat-batch-progress-list" class="mat-batch-progress-list"></div>
          <section id="mat-batch-verification" class="mat-batch-verification" aria-labelledby="mat-batch-verification-title" hidden></section>
        </div>
      </div>`;

    MAT.dom.append(backdrop);
    MAT.state.operationMode = 'preparacao';
    MAT.ui.updateHeader();

    STATE.keyHandler = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      const modal = backdrop.querySelector('.mat-batch-modal');
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && MAT.dom.ensureHost().activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && MAT.dom.ensureHost().activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', STATE.keyHandler);
    $id('mat-batch-close').addEventListener('click', closeModal);
    $id('mat-batch-file').addEventListener('change', handleBatchFiles);
    $id('mat-batch-preview').addEventListener('change', handleFileMappingChange);
    $id('mat-batch-launch').addEventListener('click', handleBatchPrimaryAction);
    $id('mat-batch-cancel').addEventListener('click', cancelBatch);
    $id('mat-batch-report').addEventListener('click', downloadBatchReport);
    $id('mat-batch-confirm').addEventListener('change', (event) => {
      const blocked = isBatchBlocked();
      $id('mat-batch-launch').disabled = blocked || !event.target.checked;
    });
    $id('mat-batch-close').focus();
  }

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender?.id !== chrome.runtime.id) return;
    if (message?.type === 'MAT_BATCH_PROGRESS' || message?.type === 'MAT_BATCH_DONE') {
      handleBatchMessage(message);
    }
  });

  MAT.batchGrading = { downloadAllForCorrection, openModal };
})();
