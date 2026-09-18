'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;
  const S = globalThis.MAT_SHARED;
  const $id = (id) => MAT.dom.getElementById(id);

  const MAX_BATCH_ACTIVITIES = 30;
  const MAX_BATCH_FILES = 30;
  const MAX_BATCH_TOTAL_BYTES = 20 * 1024 * 1024;
  const MAX_AI_SINGLE_ACTIVITY_BYTES = 500 * 1024 * 1024;
  const MAX_AI_MASTER_PACKAGE_BYTES = 450 * 1024 * 1024;

  const csvEscape = (value) => `"${S.neutralizeSpreadsheetFormula(value).replace(/"/g, '""')}"`;
  const slug = (value = '') => U.normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'uc';
  const buildDownloadAllUrl = (assignment) => {
    const base = assignment.gradingUrl || assignment.url;
    const url = new URL(base, location.origin);
    url.searchParams.set('id', assignment.cmid);
    url.searchParams.set('action', 'downloadall');
    return url.href;
  };

  const buildAssignmentViewUrl = (assignment) => {
    const url = new URL(assignment.url || assignment.gradingUrl, location.origin);
    url.pathname = '/mod/assign/view.php';
    url.search = '';
    url.searchParams.set('id', assignment.cmid);
    return url.href;
  };

  const buildAssignmentGradingUrl = (assignment) => {
    const url = new URL(assignment.gradingUrl || assignment.url, location.origin);
    url.pathname = '/mod/assign/view.php';
    url.search = '';
    url.searchParams.set('id', assignment.cmid);
    url.searchParams.set('action', 'grading');
    url.searchParams.set('quickgrading', '1');
    url.searchParams.set('status', 'all');
    url.searchParams.set('perpage', '20');
    return url.href;
  };

  const safeText = (node, limit = 50000) => U.cleanText(node?.textContent || '').slice(0, limit);
  const descriptionSelector = '#intro .no-overflow, #intro, [data-region="activity-description"], .activity-description, .mod_introbox, [data-region="activity-intro"], .mod_intro';
  const labeledValue = (doc, labels) => {
    const accepted = labels.map((label) => U.normalizeText(label));
    for (const row of doc.querySelectorAll('tr, .row, [data-region="activity-dates"] > div')) {
      const cells = [...row.querySelectorAll(':scope > th, :scope > td, :scope > div')];
      if (cells.length < 2) continue;
      if (accepted.some((label) => U.normalizeText(cells[0].textContent).includes(label))) return safeText(cells.slice(1).find(Boolean));
    }
    return '';
  };

  const extractAssignmentContext = (doc, assignment, gradingDoc = null) => {
    const descriptionNode = doc.querySelector(descriptionSelector) || gradingDoc?.querySelector(descriptionSelector);
    const criteriaNodes = [...doc.querySelectorAll('[data-region="gradingform_rubric"], .gradingform_rubric, .rubric_criteria, .criterion, .criteria')];
    const body = safeText(doc.body, 100000);
    const pageGradeText = labeledValue(doc, ['nota máxima', 'nota maxíma', 'maximum grade', 'nota'])
      || body.match(/(?:nota m[aá]xima|maximum grade)\s*:?\s*(\d+(?:[.,]\d+)?)/i)?.[1]
      || '';
    const inputGradeText = [...(gradingDoc || doc).querySelectorAll('input[max]')]
      .map((input) => String(input.getAttribute('max') || '').trim())
      .find((value) => /^\d+(?:[.,]\d+)?$/.test(value) && Number(value.replace(',', '.')) > 0) || '';
    const snapshotGradeText = String(assignment.maxGrade ?? assignment.gradeMax ?? assignment.metrics?.maxGrade ?? '').trim();
    const gradeSources = [
      ['página da atividade', pageGradeText],
      ['campo de nota do Moodle', inputGradeText],
      ['análise local', snapshotGradeText],
    ].filter(([, value]) => value && S.parseGrade(value).valid && S.parseGrade(value).number > 0);
    const distinctGrades = [...new Set(gradeSources.map(([, value]) => S.parseGrade(value).number))];
    const gradeConflict = distinctGrades.length > 1;
    const gradeText = gradeConflict ? '' : (gradeSources[0]?.[1] || '');
    const gradeSource = gradeConflict ? 'fontes divergentes' : (gradeSources[0]?.[0] || 'não localizada');
    const gradeConfidence = gradeConflict ? 'conflito' : gradeSources.length >= 2 ? 'alta' : gradeSources.length === 1 ? 'média' : 'insuficiente';
    const dueText = labeledValue(doc, ['data de entrega', 'data limite', 'prazo', 'due date']) || assignment.dueText || '';
    const description = safeText(descriptionNode);
    const criteria = [...new Set(criteriaNodes.map((node) => safeText(node)).filter((value) => value.length > 5))].join('\n\n').slice(0, 50000);
    const warnings = [];
    if (!description) warnings.push('Enunciado não localizado na página acessível da atividade.');
    if (!criteria) warnings.push('Critérios ou rubrica não localizados na página acessível da atividade.');
    if (gradeConflict) warnings.push(`Conflito na nota máxima: ${gradeSources.map(([source, value]) => `${source}=${value}`).join(', ')}.`);
    else if (!gradeText) warnings.push('Nota máxima não localizada na página acessível da atividade.');
    return { description, criteria, gradeText, gradeSource, gradeConfidence, gradeConflict, dueText, warnings };
  };

  async function fetchMoodleResource(url, label, binary = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      if (!U.isAllowedMoodleUrl(url)) throw new Error(`${label}: endereço fora dos ambientes autorizados.`);
      const response = await fetch(url, { credentials: 'include', cache: 'no-store', redirect: 'follow', signal: controller.signal });
      if (!response.ok) throw new Error(`${label}: HTTP ${response.status}.`);
      if (!U.isAllowedMoodleUrl(response.url) || /\/login\//i.test(new URL(response.url).pathname)) throw new Error(`${label}: sessão expirada ou redirecionamento não autorizado.`);
      if (binary) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error(`${label}: o Moodle não retornou um arquivo ZIP válido.`);
        return bytes;
      }
      const html = await response.text();
      if (/name=["']username["']/i.test(html) && /name=["']password["']/i.test(html)) throw new Error(`${label}: sessão do Moodle expirada.`);
      return new DOMParser().parseFromString(html, 'text/html');
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error(`${label}: tempo limite de 2 minutos excedido.`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  const pendingAssignments = (snapshot) => (snapshot?.activityPanorama?.assignments || [])
    .filter((assignment) => (assignment.metrics?.pending || 0) > 0 && assignment.cmid && (assignment.gradingUrl || assignment.url));

  function buildAiActivityPackageEntries(activityEntries, manifestRow) {
    const manifestCsv = '\ufeff' + ['ambiente;curso_id;curso;cmid;atividade;tipo_atividade;prazo;nota_maxima;nota_maxima_status;nota_maxima_fonte;enunciado;criterios;url_atividade', manifestRow.map(csvEscape).join(';')].join('\n');
    return [
      { name: 'manifesto_atividade.csv', content: manifestCsv },
      { name: 'agente-corretor-moodle-universal.md', content: `${MAT.assistedGrading?.AGENT_MARKDOWN || ''}\n` },
      { name: 'LEIA-ME.txt', content: 'Este pacote corresponde a uma única atividade e a um único curso. Procure o enunciado em enunciado_da_atividade.txt, anexos_do_enunciado e arquivos_sap_da_uc. Um arquivo SAP é associado por nome da atividade e seção da UC, mas seu conteúdo ainda requer conferência do tutor. Se houver AVISO_ENUNCIADO_EM_ANEXO_OU_NAO_LOCALIZADO.txt, verifique esses arquivos e a página do Moodle antes de corrigir. Não atribua nota por IA sem o enunciado confirmado. Preserve ambiente, curso_id, curso, cmid, atividade e nota_maxima no CSV de retorno. Nas atividades regulares, a IA avalia desempenho_0_100 e deixa nota vazia; a extensão calcula a nota proporcional antes de enviar. Se a entrega for de outra atividade ou o resultado for zero, deixe ambos vazios e gere somente feedback. Em SENAI Play, valide a evidência e informe a situação; quando pontuada, a extensão aplica a nota máxima confirmada. Se houver conflito ou dado não localizado, não invente essa informação e solicite conferência humana.' },
      ...activityEntries,
    ];
  }

  const entryByteLength = (entry) => entry.bytes?.byteLength ?? new TextEncoder().encode(String(entry.content ?? '')).byteLength;

  function splitActivityBundles(bundles, maxBytes = MAX_AI_MASTER_PACKAGE_BYTES) {
    const parts = [];
    let current = { bundles: [], bytes: 0 };
    for (const bundle of bundles) {
      if (current.bundles.length && current.bytes + bundle.bytes > maxBytes) {
        parts.push(current);
        current = { bundles: [], bytes: 0 };
      }
      current.bundles.push(bundle);
      current.bytes += bundle.bytes;
    }
    if (current.bundles.length) parts.push(current);
    return parts;
  }

  function buildMasterPackageEntries(part, partIndex, partCount) {
    const header = 'ambiente;curso_id;curso;cmid;atividade;tipo_atividade;prazo;nota_maxima;nota_maxima_status;nota_maxima_fonte;enunciado;criterios;url_atividade';
    const manifest = `\ufeff${[header, ...part.bundles.map((bundle) => bundle.manifestRow.map(csvEscape).join(';'))].join('\n')}`;
    const readme = [
      'PACOTE MESTRE PARA CORREÇÃO COM IA',
      '',
      `Parte ${partIndex + 1} de ${partCount}.`,
      `Atividades nesta parte: ${part.bundles.length}.`,
      '',
      'Cada pasta corresponde a uma única atividade e contém os envios, o contexto encontrado e as instruções próprias. Se houver aviso sobre enunciado ou anexos, confira a página do Moodle antes de corrigir.',
      'Não misture resultados entre pastas. Preserve ambiente, curso_id, curso, cmid, atividade e nota_maxima no CSV de retorno.',
    ].join('\n');
    return [
      { name: 'LEIA-ME-PACOTE-MESTRE.txt', content: readme },
      { name: 'manifesto_geral.csv', content: manifest },
      ...part.bundles.flatMap((bundle) => bundle.entries.map((entry) => ({ ...entry, name: `${bundle.folder}/${entry.name}` }))),
    ];
  }

  async function downloadAllForCorrection() {
    const snapshot = MAT.state.snapshot;
    if (!snapshot) return MAT.ui.toast('Execute a análise completa antes de baixar tudo.');

    const pending = pendingAssignments(snapshot);
    if (!pending.length) return MAT.ui.toast('Não há atividades com correção pendente para baixar.');
    if (pending.length > MAX_BATCH_ACTIVITIES) {
      return MAT.ui.toast(`Muitas atividades pendentes (${pending.length}). O limite por lote é ${MAX_BATCH_ACTIVITIES}; filtre por unidade ou corrija em partes.`);
    }

    const courseSlug = slug(snapshot.course?.name);
    const bundles = [];
    const failures = [];
    const missingStatements = [];
    const attachedStatements = [];
    let courseSections = snapshot.course?.sections || [];
    let courseResourceWarning = '';
    if (snapshot.course?.id && MAT.state.adapter?.extractSections) {
      try {
        const courseUrl = `${location.origin}/course/view.php?id=${encodeURIComponent(snapshot.course.id)}`;
        const courseDoc = await fetchMoodleResource(courseUrl, 'Recursos SAP da página do curso');
        const liveSections = MAT.state.adapter.extractSections(courseDoc);
        if (liveSections.length) courseSections = liveSections;
        else courseResourceWarning = 'A página do curso não apresentou seções; os vínculos dos recursos SAP foram consultados na última análise salva.';
      } catch (error) {
        courseResourceWarning = `Não foi possível atualizar a lista de arquivos SAP do curso: ${error.message}. Os vínculos foram consultados na última análise salva.`;
      }
    }
    MAT.ui.toast(`Preparando um pacote mestre com ${pending.length} atividade(s). Aguarde a coleta dos enunciados e envios.`);

    for (let index = 0; index < pending.length; index += 1) {
      const assignment = pending[index];
      try {
        MAT.ui.toast(`Preparando ${index + 1} de ${pending.length}: ${assignment.name}`);
        const [doc, gradingDoc, submissionsZip] = await Promise.all([
          fetchMoodleResource(buildAssignmentViewUrl(assignment), `Enunciado de ${assignment.name}`),
          fetchMoodleResource(buildAssignmentGradingUrl(assignment), `Escala de nota de ${assignment.name}`),
          fetchMoodleResource(buildDownloadAllUrl(assignment), `Entregas de ${assignment.name}`, true),
        ]);
        if (submissionsZip.length > MAX_AI_SINGLE_ACTIVITY_BYTES) {
          throw new Error(`${assignment.name}: os envios desta atividade ultrapassam o limite individual de 500 MB.`);
        }
        const context = extractAssignmentContext(doc, assignment, gradingDoc);
        const attachments = await U.fetchAssignmentAttachments(doc, buildAssignmentViewUrl(assignment));
        const resources = MAT.statementResources.matchingResources(courseSections, assignment);
        const resourceFiles = [];
        const resourceErrors = [];
        for (const resource of resources) {
          try { resourceFiles.push({ ...await MAT.statementResources.fetchStatementResource(resource), cmid: resource.cmid }); }
          catch (error) { resourceErrors.push(`Arquivo SAP ${resource.name} (CMID ${resource.cmid}): ${error.message}`); }
        }
        const foundFiles = attachments.files.length + resourceFiles.length;
        if (!context.description && !foundFiles) missingStatements.push(`${assignment.name} (CMID ${assignment.cmid})`);
        else if (!context.description) attachedStatements.push(`${assignment.name} (CMID ${assignment.cmid})`);
        const activityType = /senai\s*play/i.test(`${assignment.name} ${context.description}`) ? 'senai_play' : 'atividade_regular';
        const metadata = [
          `Curso ou UC: ${snapshot.course?.name || 'Não identificado'}`,
          `Atividade: ${assignment.name}`,
          `CMID: ${assignment.cmid}`,
          `Prazo: ${context.dueText || 'Não localizado'}`,
          `Nota máxima: ${context.gradeText || 'Não localizada'}`,
          `Status da nota máxima: ${context.gradeConfidence}`,
          `Fonte da nota máxima: ${context.gradeSource}`,
          `Tipo da atividade: ${activityType}`,
          `URL: ${buildAssignmentViewUrl(assignment)}`,
          `Enunciado: ${context.description ? 'texto localizado' : foundFiles ? 'arquivo associado; conteúdo deve ser conferido' : 'não localizado'}`,
          `Anexos do enunciado: ${attachments.files.length} baixado(s); ${attachments.errors.length} falha(s)`,
          `Recursos SAP da mesma UC: ${resourceFiles.length} baixado(s); ${resourceErrors.length} falha(s)`,
          ...resourceFiles.map((file) => `Arquivo SAP associado: ${file.name} (CMID ${file.cmid}); origem ${file.source}`),
          `Critérios ou rubrica: ${context.criteria ? 'localizados' : 'não localizados'}`,
          '',
          context.warnings.length || attachments.errors.length || resourceErrors.length || courseResourceWarning ? `AVISOS:\n${[...context.warnings.filter((warning) => !foundFiles || !warning.startsWith('Enunciado não localizado')), ...attachments.errors, ...resourceErrors, ...(courseResourceWarning ? [courseResourceWarning] : []), ...(resourceFiles.length ? ['Confirme que o arquivo SAP contém o enunciado desta tarefa antes de atribuir notas.'] : [])].map((warning) => `- ${warning}`).join('\n')}` : 'Nenhum aviso de contexto.',
        ].join('\n');
        const activityEntries = [
          { name: 'envios_dos_alunos.zip', bytes: submissionsZip },
          ...(context.description
            ? [{ name: 'enunciado_da_atividade.txt', content: context.description }]
            : [{ name: 'AVISO_ENUNCIADO_EM_ANEXO_OU_NAO_LOCALIZADO.txt', content: `O texto do enunciado não foi localizado nas páginas acessíveis desta tarefa. ${foundFiles ? `${foundFiles} arquivo(s) associado(s) foram incluídos em anexos_do_enunciado ou arquivos_sap_da_uc. Confira qual contém o enunciado.` : 'Nenhum arquivo de enunciado pôde ser baixado.'} Abra ${buildAssignmentViewUrl(assignment)} antes de usar IA para atribuir notas. Não corrija sem conferir o enunciado.` }]),
          ...attachments.files.map((file, fileIndex) => ({ name: `anexos_do_enunciado/${fileIndex + 1}_${file.name}`, bytes: file.bytes })),
          ...resourceFiles.map((file, fileIndex) => ({ name: `arquivos_sap_da_uc/${fileIndex + 1}_${file.cmid}_${file.name}`, bytes: file.bytes })),
          ...(attachments.errors.length ? [{ name: 'AVISO_ANEXOS_NAO_BAIXADOS.txt', content: attachments.errors.join('\n') }] : []),
          ...(resourceErrors.length || courseResourceWarning ? [{ name: 'AVISO_RECURSOS_SAP.txt', content: [...resourceErrors, courseResourceWarning].filter(Boolean).join('\n') }] : []),
          { name: 'criterios_de_avaliacao.txt', content: context.criteria || 'Critérios ou rubrica não localizados automaticamente. Não presuma critérios que não estejam presentes nos materiais fornecidos.' },
          { name: 'dados_da_atividade.txt', content: metadata },
          { name: 'criterios_de_pontuacao.txt', content: context.gradeText
            ? `NOTA MÁXIMA CONFIRMADA: ${context.gradeText}\nAvalie o desempenho em 0 a 100 e preencha somente desempenho_0_100 no CSV. Deixe nota vazia: a extensão converterá proporcionalmente para a escala da atividade (desempenho ÷ 100 × ${context.gradeText}), com duas casas decimais.\nResultado zero exige feedback e nota vazia.\nEm SENAI Play validado, informe a situação e o feedback; a extensão aplicará a nota máxima confirmada.`
            : 'A nota máxima não foi confirmada ou apresenta conflito. Não atribua nota automaticamente. Gere feedback e solicite conferência humana.' },
        ];
        const manifestRow = [location.hostname, snapshot.course?.id || '', snapshot.course?.name || '', assignment.cmid, assignment.name, activityType, context.dueText, context.gradeText, context.gradeConfidence, context.gradeSource, context.description ? 'texto localizado' : foundFiles ? 'arquivo associado, conferir' : 'não localizado', context.criteria ? 'localizados' : 'não localizados', buildAssignmentViewUrl(assignment)];
        const entries = buildAiActivityPackageEntries(activityEntries, manifestRow);
        bundles.push({
          folder: `${String(index + 1).padStart(2, '0')}_${assignment.cmid}_${slug(assignment.name)}`,
          entries,
          manifestRow,
          bytes: entries.reduce((total, entry) => total + entryByteLength(entry), 0),
        });
      } catch (error) {
        failures.push(`${assignment.name}: ${error?.message || 'falha na preparação'}`);
      }
    }

    if (!bundles.length) {
      MAT.ui.toast(`Nenhuma atividade pôde ser preparada. ${failures.slice(0, 2).join(' ')}`, 'error');
      return;
    }
    const parts = splitActivityBundles(bundles);
    const date = new Date().toISOString().slice(0, 10);
    parts.forEach((part, index) => {
      const suffix = parts.length > 1 ? `_parte_${String(index + 1).padStart(2, '0')}_de_${String(parts.length).padStart(2, '0')}` : '';
      const filename = `pacote_mestre_correcao_ia_${courseSlug}_${date}${suffix}.zip`;
      U.downloadBlob(U.makeZipBlob(buildMasterPackageEntries(part, index, parts.length)), filename, 'application/zip');
    });
    if (failures.length) {
      MAT.ui.toast(`${bundles.length} atividade(s) incluída(s) em ${parts.length} arquivo(s) e ${failures.length} com falha. ${missingStatements.length ? `Enunciado não localizado em ${missingStatements.length} atividade(s). ` : ''}${attachedStatements.length ? `${attachedStatements.length} atividade(s) com enunciado possivelmente em anexo. ` : ''}${failures.slice(0, 2).join(' ')}`, 'error');
      return;
    }
    if (missingStatements.length || attachedStatements.length) {
      MAT.ui.toast(`Pacote preparado com ${bundles.length} atividade(s). ${attachedStatements.length ? `Material em anexo para ${attachedStatements.slice(0, 2).join('; ')}. ` : ''}${missingStatements.length ? `Enunciado não localizado em ${missingStatements.slice(0, 2).join('; ')}. ` : ''}Confira antes de corrigir.`, 'error');
      return;
    }
    MAT.ui.toast(parts.length === 1
      ? `Pacote mestre preparado com ${bundles.length} atividade(s) em um único ZIP.`
      : `O volume excedeu 450 MB. Foram geradas ${parts.length} partes, mantendo cada atividade inteira.`);
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
    const errors = [];
    const warnings = [];

    for (const record of records) {
      const match = S.matchActivity(record, assignments);
      const assignment = match.status === 'exact' ? match.assignment : null;
      if (!assignment) { unmatched.push({ ...record, match }); continue; }
      if (!groups.has(assignment.cmid)) groups.set(assignment.cmid, { assignment, records: [] });
      const policy = S.applyAcademicGradePolicy(record, assignment);
      errors.push(...policy.errors.map((message) => `Linha ${record.rowNumber}: ${message}`));
      warnings.push(...policy.warnings.map((message) => `Linha ${record.rowNumber}: ${message}`));
      groups.get(assignment.cmid).records.push({
        studentId: record.studentId,
        nome: record.nome,
        nota: policy.record.nota,
        desempenho: policy.record.desempenho,
        feedback: policy.record.feedback,
        situacaoRaw: policy.record.situacaoRaw,
        notaMaxima: policy.record.notaMaxima,
        notaMaximaStatus: policy.record.notaMaximaStatus,
        notaMaximaFonte: policy.record.notaMaximaFonte,
        tipoAtividade: policy.record.tipoAtividade,
        sourceRow: record.rowNumber,
      });
    }

    return { groups: [...groups.values()], unmatched, errors, warnings };
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
    previewAccepted: false,
    previewSignature: '',
    editingRecordKey: '',
    batchId: null,
    running: false,
    results: [],
    onlyVerificationIssues: false,
    historyRecordedBatchId: null,
    gradeResolution: {},
    returnFocus: null,
    keyHandler: null,
  };

  const hasActivityColumns = (parsed) => Boolean(parsed && (parsed.indexes?.atividadeId !== -1 || parsed.indexes?.atividade !== -1));

  const isBatchBlocked = () => !STATE.groups.length
    || STATE.unmatched.length > 0
    || STATE.pendingMappings.length > 0
    || STATE.parsed?.errors?.length > 0;

  function buildPreviewSignature() {
    return JSON.stringify({
      overwriteGrade: $id('mat-batch-overwrite-grade')?.checked ?? false,
      overwriteFeedback: $id('mat-batch-overwrite-feedback')?.checked ?? false,
      groups: STATE.groups.map((group) => ({
        cmid: String(group.assignment.cmid),
        records: group.records.map((record) => [record.studentId || '', record.nome, record.desempenho, record.nota, record.notaMaxima, record.notaMaximaStatus, record.feedback]),
      })),
    });
  }

  function invalidateChangePreview() {
    STATE.previewAccepted = false;
    STATE.previewSignature = '';
    const panel = $id('mat-batch-change-preview');
    if (panel) { panel.hidden = true; panel.innerHTML = ''; }
    const confirmInput = $id('mat-batch-confirm');
    if (confirmInput) { confirmInput.checked = false; confirmInput.disabled = true; }
  }

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

      const currentCourseId = String(MAT.state.course?.id || MAT.state.snapshot?.course?.id || '');
      const currentCourseName = U.normalizeText(MAT.state.snapshot?.course?.name || MAT.state.course?.name || '');
      for (const record of item.parsed.records || []) {
        if (record.cursoId && String(record.cursoId) !== currentCourseId) errors.push(`${item.name}, linha ${record.rowNumber}: curso_id ${record.cursoId} não corresponde ao curso aberto (${currentCourseId}).`);
        else if (!record.cursoId && record.curso && currentCourseName && U.normalizeText(record.curso) !== currentCourseName) errors.push(`${item.name}, linha ${record.rowNumber}: curso "${record.curso}" não corresponde ao curso aberto.`);
        if (record.ambiente && /\./.test(record.ambiente) && U.normalizeText(record.ambiente) !== U.normalizeText(location.hostname)) errors.push(`${item.name}, linha ${record.rowNumber}: ambiente ${record.ambiente} não corresponde a ${location.hostname}.`);
      }

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

    const grouped = groupRecordsByActivity(records, assignments);
    errors.push(...grouped.errors);
    warnings.push(...grouped.warnings);
    STATE.parsed = { records, errors, warnings };
    STATE.groups = grouped.groups;
    STATE.unmatched = grouped.unmatched;
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
        <td><span class="mat-badge mat-badge-success">Correspondência exata</span>${maximumResolutionLabel(group.assignment)}</td>
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
    const previewCurrent = STATE.previewAccepted && STATE.previewSignature === buildPreviewSignature();
    updateBatchSteps();
    const reviewBtn = $id('mat-batch-review-changes');
    const confirmInput = $id('mat-batch-confirm');
    const launchBtn = $id('mat-batch-launch');
    if (reviewBtn) reviewBtn.disabled = blocked;
    if (confirmInput) {
      confirmInput.disabled = blocked || !previewCurrent;
      if (confirmInput.disabled) confirmInput.checked = false;
    }
    if (launchBtn) {
      launchBtn.disabled = blocked || !previewCurrent || !confirmInput?.checked;
      launchBtn.textContent = 'Confirmar salvamento';
      delete launchBtn.dataset.action;
    }
    const log = $id('mat-batch-log');
    const summary = $id('mat-batch-error-summary');
    if (summary) {
      const invalidFiles = STATE.files.map((file, index) => ({ file, index })).filter(({ file }) => file.error || file.parsed?.errors?.length);
      const mapping = STATE.files.findIndex((file) => !file.error && !file.embeddedActivity && !file.selectedCmid);
      const messages = invalidFiles.map(({ file, index }) => `<li><button type="button" data-batch-focus="mat-batch-file">${U.escapeHtml(file.name)}: ${U.escapeHtml(file.error || file.parsed.errors.join('; '))}. Substituir arquivo</button></li>`);
      if (mapping >= 0) messages.push(`<li><button type="button" data-batch-focus="mat-batch-file-map-${mapping}">Selecionar atividade do arquivo ${U.escapeHtml(STATE.files[mapping].name)}</button></li>`);
      if (STATE.unmatched.length) messages.push(`<li><button type="button" data-batch-focus="mat-batch-file">${STATE.unmatched.length} registro(s) sem atividade exata. Confira CMID ou substitua o CSV.</button></li>`);
      if (blocked && STATE.files.length && messages.length) {
        summary.hidden = false;
        summary.innerHTML = `<strong>Corrija ${messages.length} bloqueio(s) antes de conferir</strong><ul>${messages.join('')}</ul>`;
      } else { summary.hidden = true; summary.innerHTML = ''; }
    }
    if (!log) return;
    if (blocked) {
      log.innerHTML = '<div class="mat-warning mat-error" role="alert"><strong>Revisão necessária:</strong> associe todos os arquivos às atividades e corrija os erros indicados.</div>';
      return;
    }
    log.innerHTML = `<div class="mat-info" role="status"><strong>Arquivos validados:</strong> ${STATE.files.length} arquivo(s), ${STATE.groups.length} atividade(s) e ${STATE.parsed.records.length} registro(s), sem bloqueios. ${previewCurrent ? 'Alterações conferidas.' : 'Clique em Conferir alterações antes de autorizar o salvamento.'}</div>`;
  }

  function updateBatchSteps() {
    const current = STATE.results.length ? 5 : STATE.running ? 4 : !STATE.files.length ? 1 : isBatchBlocked() ? 2 : STATE.previewAccepted ? 4 : 3;
    $id('mat-batch-steps')?.querySelectorAll('[data-step]')?.forEach((step) => {
      const index = Number(step.dataset.step);
      step.dataset.state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
      if (index === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  function confirmedRecordMaxGrade(group, record) {
    const recordMaxGrade = S.parseGrade(record.notaMaxima || '');
    const assignmentMaxGrade = S.parseGrade(group.assignment.maxGrade ?? group.assignment.gradeMax ?? group.assignment.metrics?.maxGrade ?? '');
    if (recordMaxGrade.valid && recordMaxGrade.number > 0) return recordMaxGrade.number;
    if (assignmentMaxGrade.valid && assignmentMaxGrade.number > 0) return assignmentMaxGrade.number;
    return null;
  }

  function assignmentMaximum(assignment) {
    const parsed = S.parseGrade(assignment?.maxGrade ?? assignment?.gradeMax ?? assignment?.metrics?.maxGrade ?? '');
    return parsed.valid && parsed.number > 0 ? parsed.number : null;
  }

  function recordNeedsMaximum(record, assignment) {
    if (String(record?.desempenho || '').trim()) return true;
    const situation = S.normalizeSituationCode(record?.situacaoRaw || record?.situacao || '');
    const activityText = U.normalizeText(`${assignment?.name || record?.atividade || ''} ${record?.tipoAtividade || ''}`);
    const isSenaiPlay = /senai\s*play/.test(activityText);
    return isSenaiPlay && ['senai_play_validado', 'validado', 'corrigido'].includes(situation);
  }

  function maximumResolutionLabel(assignment) {
    const key = String(assignment?.cmid || '');
    const resolution = STATE.gradeResolution[key];
    const maximum = assignmentMaximum(assignment);
    if (resolution?.status === 'loading') {
      return '<div class="mat-footer-note">Confirmando a nota máxima no Moodle...</div>';
    }
    if (resolution?.status === 'conflict') {
      return `<div class="mat-footer-note mat-text-danger">Nota máxima com conflito: ${U.escapeHtml(resolution.message || 'confira a atividade antes de continuar.')}</div>`;
    }
    if (maximum !== null) {
      const source = String(assignment.maxGradeSource || resolution?.source || 'Moodle').trim();
      const manual = resolution?.status === 'manual' || /manual/i.test(source);
      return `<div class="mat-footer-note">Nota máxima: <strong>${U.escapeHtml(S.formatGradePtBr(maximum))}</strong>. Fonte: ${U.escapeHtml(source)}.${manual ? ' Valor informado manualmente pelo tutor.' : ''}</div>`;
    }
    const message = resolution?.status === 'missing' || resolution?.status === 'error'
      ? U.escapeHtml(resolution.message || 'não foi possível identificar a escala da atividade.')
      : 'A escala ainda não foi identificada automaticamente.';
    return `
      <div class="mat-footer-note mat-text-danger">Nota máxima não confirmada: ${message}</div>
      <div class="mat-manual-max-grade" data-manual-max-grade-for="${U.escapeHtml(key)}">
        <label for="mat-manual-max-grade-${U.escapeHtml(key)}">Informar nota máxima manualmente</label>
        <div class="mat-manual-max-grade__control">
          <input
            id="mat-manual-max-grade-${U.escapeHtml(key)}"
            class="mat-input"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Ex.: 100"
            aria-describedby="mat-manual-max-grade-help-${U.escapeHtml(key)}"
            data-manual-max-grade-input="${U.escapeHtml(key)}"
          />
          <button
            type="button"
            class="mat-btn mat-btn-primary mat-btn-sm"
            data-apply-manual-max-grade="${U.escapeHtml(key)}"
          >Aplicar</button>
        </div>
        <div id="mat-manual-max-grade-help-${U.escapeHtml(key)}" class="mat-footer-note">
          Use somente o valor máximo configurado na atividade do Moodle. Esse valor será usado para converter desempenho_0_100.
        </div>
        <div id="mat-manual-max-grade-error-${U.escapeHtml(key)}" class="mat-inline-grade-error" role="alert"></div>
      </div>`;
  }

  function applyManualMaximum(cmid) {
    const assignments = pendingAssignments(MAT.state.snapshot);
    const assignment = assignments.find((item) => String(item.cmid) === String(cmid));
    const input = $id(`mat-manual-max-grade-${cmid}`);
    const errorBox = $id(`mat-manual-max-grade-error-${cmid}`);
    if (!assignment || !input) return MAT.ui.toast('Não foi possível localizar a atividade para informar a nota máxima.', 'error');

    const parsed = S.parseGrade(input.value);
    if (!parsed.valid || parsed.number === null || parsed.number <= 0) {
      if (errorBox) errorBox.textContent = 'Informe uma nota máxima numérica maior que zero.';
      input.focus();
      return;
    }

    updateAssignmentMaximum(assignment, parsed.number, 'informada manualmente pelo tutor', 'confirmada_manual');
    STATE.gradeResolution[String(cmid)] = {
      status: 'manual',
      maximum: parsed.number,
      source: 'informada manualmente pelo tutor',
      confidence: 'manual',
    };

    invalidateChangePreview();
    rebuildBatchState(assignments);
    renderPreview();
    updateBatchControls();
    MAT.ui.toast(`Nota máxima ${S.formatGradePtBr(parsed.number)} aplicada à atividade. Confira as notas calculadas antes de salvar.`);
    $id('mat-batch-review-changes')?.focus();
  }

  function handleBatchPreviewClick(event) {
    const button = event.target.closest('[data-apply-manual-max-grade]');
    if (!button) return;
    applyManualMaximum(button.dataset.applyManualMaxGrade);
  }

  function handleBatchPreviewKeydown(event) {
    const input = event.target.closest('[data-manual-max-grade-input]');
    if (!input || event.key !== 'Enter') return;
    event.preventDefault();
    applyManualMaximum(input.dataset.manualMaxGradeInput);
  }

  function updateAssignmentMaximum(assignment, maximum, source, status = 'alta') {
    assignment.maxGrade = maximum;
    assignment.maxGradeSource = source || 'Moodle';
    assignment.maxGradeStatus = status || 'alta';
    const snapshotAssignments = MAT.state.snapshot?.activityPanorama?.assignments || MAT.state.snapshot?.assignments || [];
    const snapshotAssignment = snapshotAssignments.find((item) => String(item.cmid) === String(assignment.cmid));
    if (snapshotAssignment && snapshotAssignment !== assignment) {
      snapshotAssignment.maxGrade = maximum;
      snapshotAssignment.maxGradeSource = assignment.maxGradeSource;
      snapshotAssignment.maxGradeStatus = assignment.maxGradeStatus;
    }
  }

  async function resolveAssignmentMaximum(assignment) {
    if (!assignment?.cmid) return null;
    const key = String(assignment.cmid);
    const current = assignmentMaximum(assignment);
    if (current !== null) {
      STATE.gradeResolution[key] = { status: 'confirmed', maximum: current, source: assignment.maxGradeSource || 'análise local' };
      return current;
    }
    STATE.gradeResolution[key] = { status: 'loading', maximum: null, source: '' };

    try {
      const [viewResult, gradingResult] = await Promise.allSettled([
        fetchMoodleResource(buildAssignmentViewUrl(assignment), `Atividade ${assignment.name}`),
        fetchMoodleResource(buildAssignmentGradingUrl(assignment), `Escala de nota de ${assignment.name}`),
      ]);
      const viewDoc = viewResult.status === 'fulfilled' ? viewResult.value : null;
      const gradingDoc = gradingResult.status === 'fulfilled' ? gradingResult.value : null;
      const primaryDoc = viewDoc || gradingDoc;
      if (!primaryDoc) {
        const messages = [viewResult, gradingResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.message)
          .filter(Boolean);
        throw new Error(messages.join(' ') || 'As páginas da atividade não puderam ser consultadas.');
      }

      const context = extractAssignmentContext(primaryDoc, assignment, gradingDoc || primaryDoc);
      if (context.gradeConflict) {
        STATE.gradeResolution[key] = {
          status: 'conflict',
          maximum: null,
          source: context.gradeSource,
          message: context.warnings.find((warning) => /conflito na nota máxima/i.test(warning)) || 'As fontes do Moodle apresentam valores diferentes.',
        };
        return null;
      }

      const parsed = S.parseGrade(context.gradeText);
      if (!parsed.valid || parsed.number === null || parsed.number <= 0) {
        STATE.gradeResolution[key] = {
          status: 'missing',
          maximum: null,
          source: context.gradeSource,
          message: 'A escala não apareceu nem na atividade nem na tela de avaliação.',
        };
        return null;
      }

      updateAssignmentMaximum(assignment, parsed.number, context.gradeSource, context.gradeConfidence);
      STATE.gradeResolution[key] = {
        status: 'confirmed',
        maximum: parsed.number,
        source: context.gradeSource,
        confidence: context.gradeConfidence,
      };
      return parsed.number;
    } catch (error) {
      STATE.gradeResolution[key] = {
        status: 'error',
        maximum: null,
        source: '',
        message: error?.message || 'Falha ao consultar a escala da atividade.',
      };
      return null;
    }
  }

  async function ensureMaximumsForFiles(assignments) {
    const targets = new Map();
    for (const item of STATE.files) {
      if (item.error || !item.parsed?.records?.length) continue;
      if (!item.embeddedActivity && item.selectedCmid) {
        const assignment = assignments.find((candidate) => String(candidate.cmid) === String(item.selectedCmid));
        if (assignment && item.parsed.records.some((record) => recordNeedsMaximum(record, assignment)) && assignmentMaximum(assignment) === null) {
          targets.set(String(assignment.cmid), assignment);
        }
        continue;
      }
      if (item.embeddedActivity) {
        for (const record of item.parsed.records) {
          const match = S.matchActivity(record, assignments);
          const assignment = match.status === 'exact' ? match.assignment : null;
          if (assignment && recordNeedsMaximum(record, assignment) && assignmentMaximum(assignment) === null) {
            targets.set(String(assignment.cmid), assignment);
          }
        }
      }
    }

    if (!targets.size) return;
    targets.forEach((assignment) => {
      STATE.gradeResolution[String(assignment.cmid)] = { status: 'loading', maximum: null, source: '' };
    });
    MAT.ui.toast(`Confirmando a nota máxima de ${targets.size} atividade(s) diretamente no Moodle...`);
    await Promise.all([...targets.values()].map((assignment) => resolveAssignmentMaximum(assignment)));
  }

  function renderChangePreview() {
    if (isBatchBlocked()) return MAT.ui.toast('Corrija os bloqueios antes de conferir as alterações.');
    const overwriteGrade = $id('mat-batch-overwrite-grade')?.checked ?? false;
    const overwriteFeedback = $id('mat-batch-overwrite-feedback')?.checked ?? false;
    const records = STATE.groups.flatMap((group, groupIndex) => group.records.map((record, recordIndex) => ({ group, record, groupIndex, recordIndex })));
    const gradeCount = records.filter(({ record }) => String(record.nota ?? '').trim() !== '').length;
    const feedbackCount = records.filter(({ record }) => String(record.feedback ?? '').trim() !== '').length;
    const rows = records.map(({ group, record, groupIndex, recordIndex }) => {
      const recordKey = `${groupIndex}:${recordIndex}`;
      const isEditing = STATE.editingRecordKey === recordKey;
      const hasGrade = String(record.nota ?? '').trim() !== '';
      const hasFeedback = String(record.feedback ?? '').trim() !== '';
      const recordMaxGrade = S.parseGrade(record.notaMaxima || '');
      const assignmentMaxGrade = S.parseGrade(group.assignment.maxGrade ?? group.assignment.gradeMax ?? group.assignment.metrics?.maxGrade ?? '');
      const confirmedMaxGrade = confirmedRecordMaxGrade(group, record);
      const maxGradeStatus = String(record.notaMaximaStatus || '').trim();
      const maxGradeUnsafe = /conflito|insuficiente|nao localizada|não localizada/i.test(maxGradeStatus);
      const maxGradeSource = String(record.notaMaximaFonte || (recordMaxGrade.valid ? 'CSV' : assignmentMaxGrade.valid ? (group.assignment.maxGradeSource || 'Moodle') : '')).trim();
      const maxGrade = confirmedMaxGrade === null
        ? '<span class="mat-badge mat-badge-warning">Não confirmada</span>'
        : `<strong>${U.escapeHtml(S.formatGradePtBr(confirmedMaxGrade))}</strong>${maxGradeUnsafe ? '<div><span class="mat-badge mat-badge-warning">Requer conferência</span></div>' : ''}${maxGradeSource ? `<div class="mat-footer-note">Fonte: ${U.escapeHtml(maxGradeSource)}</div>` : ''}`;
      if (isEditing) return `<tr class="mat-change-edit-row">
        <td data-label="Atividade"><strong>${U.escapeHtml(group.assignment.name)}</strong><div class="mat-footer-note">CMID ${U.escapeHtml(group.assignment.cmid)}</div></td>
        <td data-label="Aluno">${U.escapeHtml(record.nome || record.studentId || 'Não identificado')}</td>
        <td data-label="Nota"><label class="mat-sr-only" for="mat-edit-grade-${groupIndex}-${recordIndex}">Editar nota</label><input class="mat-input mat-change-grade-input" id="mat-edit-grade-${groupIndex}-${recordIndex}" data-edit-grade type="text" inputmode="decimal" value="${U.escapeHtml(record.nota || '')}" placeholder="Manter atual" /></td>
        <td data-label="Nota máxima">${maxGrade}</td>
        <td data-label="Feedback"><label class="mat-sr-only" for="mat-edit-feedback-${groupIndex}-${recordIndex}">Editar feedback</label><textarea class="mat-input mat-change-feedback-input" id="mat-edit-feedback-${groupIndex}-${recordIndex}" data-edit-feedback rows="5" maxlength="${S.LIMITS.maxCellLength}" placeholder="Manter feedback atual">${U.escapeHtml(record.feedback || '')}</textarea></td>
        <td data-label="Ação"><div class="mat-change-edit-actions"><button class="mat-btn mat-btn-primary mat-btn-sm" type="button" data-save-record="${recordKey}">Salvar edição</button><button class="mat-btn mat-btn-sm" type="button" data-cancel-record>Cancelar</button></div><div class="mat-footer-note" id="mat-edit-error-${groupIndex}-${recordIndex}" role="alert"></div></td>
      </tr>`;
      const studentLabel = U.escapeHtml(record.nome || record.studentId || 'aluno');
      const grade = `<div class="mat-inline-grade-editor">
        <label for="mat-inline-grade-${groupIndex}-${recordIndex}">Nota a enviar</label>
        ${record.desempenho ? `<span class="mat-inline-grade-help">Avaliação da IA: ${U.escapeHtml(S.formatGradePtBr(record.desempenho))}/100. Cálculo: ${U.escapeHtml(S.formatGradePtBr(record.desempenho))} ÷ 100 × ${U.escapeHtml(S.formatGradePtBr(confirmedMaxGrade))} = ${U.escapeHtml(S.formatGradePtBr(record.nota))}.</span>` : ''}
        <div class="mat-inline-grade-control">
          <input class="mat-input mat-change-grade-input" id="mat-inline-grade-${groupIndex}-${recordIndex}" data-inline-grade="${recordKey}" type="text" inputmode="decimal" value="${hasGrade ? U.escapeHtml(S.formatGradePtBr(record.nota)) : ''}" placeholder="Sem nota" aria-describedby="mat-inline-grade-help-${groupIndex}-${recordIndex}" />
          <button class="mat-btn mat-btn-primary mat-btn-sm" type="button" data-save-grade="${recordKey}" aria-label="Salvar nova nota de ${studentLabel}">Aplicar</button>
        </div>
        <span class="mat-inline-grade-help" id="mat-inline-grade-help-${groupIndex}-${recordIndex}">${confirmedMaxGrade === null ? 'Limite ainda não confirmado' : `Máximo ${U.escapeHtml(S.formatGradePtBr(confirmedMaxGrade))}`}</span>
        <span class="mat-inline-grade-error" id="mat-inline-grade-error-${groupIndex}-${recordIndex}" role="alert"></span>
      </div>`;
      const feedback = hasFeedback
        ? `<details class="mat-change-details"><summary>Ver feedback</summary><p>${U.escapeHtml(record.feedback)}</p></details>`
        : '<span class="mat-text-muted">Manter feedback atual</span>';
      const actions = [
        hasGrade ? (overwriteGrade ? 'Nota: preencher ou sobrescrever' : 'Nota: preencher se estiver vazia') : '',
        hasFeedback ? (overwriteFeedback ? 'Feedback: preencher ou sobrescrever' : 'Feedback: preencher se estiver vazio') : '',
      ].filter(Boolean).join('<br>') || 'Nenhuma alteração solicitada';
      return `<tr>
        <td data-label="Atividade"><strong>${U.escapeHtml(group.assignment.name)}</strong><div class="mat-footer-note">CMID ${U.escapeHtml(group.assignment.cmid)}</div></td>
        <td data-label="Aluno">${U.escapeHtml(record.nome || record.studentId || 'Não identificado')}</td>
        <td data-label="Nota">${grade}</td><td data-label="Nota máxima">${maxGrade}</td><td data-label="Feedback">${feedback}</td><td data-label="Ação prevista">${actions}<div class="mat-change-edit-actions"><button class="mat-btn mat-btn-sm" type="button" data-edit-record="${recordKey}" aria-label="Editar nota e feedback de ${U.escapeHtml(record.nome || record.studentId || 'aluno')}">Editar</button></div></td>
      </tr>`;
    }).join('');
    const panel = $id('mat-batch-change-preview');
    panel.hidden = false;
    panel.innerHTML = `
      <div class="mat-section-head"><div><h3 id="mat-batch-change-preview-title">Alterações antes de salvar</h3><p>Confira os valores do CSV que serão enviados ao Moodle.</p></div></div>
      <div class="mat-verification-summary" role="status"><strong>${records.length} aluno(s)</strong><span>${gradeCount} nota(s)</span><span>${feedbackCount} feedback(s)</span></div>
      <div class="mat-info"><strong>Regra de proteção:</strong> ${overwriteGrade ? 'notas existentes poderão ser sobrescritas' : 'notas existentes serão preservadas'}; ${overwriteFeedback ? 'feedbacks existentes poderão ser sobrescritos' : 'feedbacks existentes serão preservados'}.</div>
      <div class="mat-table-wrap"><table class="mat-table mat-change-preview-table">
        <thead><tr><th>Atividade</th><th>Aluno</th><th>Nota</th><th>Nota máxima</th><th>Feedback</th><th>Ação prevista</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
    STATE.previewAccepted = true;
    STATE.previewSignature = buildPreviewSignature();
    const confirmInput = $id('mat-batch-confirm');
    if (confirmInput) { confirmInput.disabled = false; confirmInput.checked = false; }
    updateBatchControls();
    panel.onclick = handleChangePreviewAction;
    const heading = $id('mat-batch-change-preview-title');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    panel.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function handleChangePreviewAction(event) {
    const saveGradeButton = event.target.closest('[data-save-grade]');
    if (saveGradeButton) {
      const [groupIndexText, recordIndexText] = saveGradeButton.dataset.saveGrade.split(':');
      const groupIndex = Number(groupIndexText);
      const recordIndex = Number(recordIndexText);
      const group = STATE.groups[groupIndex];
      const record = group?.records?.[recordIndex];
      const gradeInput = $id(`mat-inline-grade-${groupIndex}-${recordIndex}`);
      const errorBox = $id(`mat-inline-grade-error-${groupIndex}-${recordIndex}`);
      if (!record || !gradeInput) return MAT.ui.toast('Não foi possível localizar a nota para edição.', 'error');
      const parsedGrade = S.parseGrade(gradeInput.value);
      if (!parsedGrade.valid) {
        if (errorBox) errorBox.textContent = 'Informe uma nota numérica válida ou deixe o campo vazio.';
        gradeInput.focus();
        return;
      }
      const maxGrade = confirmedRecordMaxGrade(group, record);
      if (parsedGrade.number !== null && maxGrade !== null && parsedGrade.number > maxGrade) {
        if (errorBox) errorBox.textContent = `A nota não pode ultrapassar ${S.formatGradePtBr(maxGrade)}.`;
        gradeInput.focus();
        return;
      }
      if (parsedGrade.number === 0 && !String(record.feedback || '').trim()) {
        if (errorBox) errorBox.textContent = 'Nota zero exige feedback. Edite o feedback antes de continuar.';
        gradeInput.focus();
        return;
      }
      record.nota = parsedGrade.number === null || parsedGrade.number === 0 ? '' : S.formatGradePtBr(parsedGrade.number);
      record.notaNumero = parsedGrade.number === null || parsedGrade.number === 0 ? null : parsedGrade.number;
      record.desempenho = '';
      STATE.previewAccepted = false;
      STATE.previewSignature = '';
      const confirmInput = $id('mat-batch-confirm');
      if (confirmInput) confirmInput.checked = false;
      renderChangePreview();
      MAT.ui.toast('Nota atualizada. Revise o valor e confirme novamente antes do envio.');
      $id(`mat-inline-grade-${groupIndex}-${recordIndex}`)?.focus();
      return;
    }
    const editButton = event.target.closest('[data-edit-record]');
    if (editButton) {
      STATE.editingRecordKey = editButton.dataset.editRecord;
      renderChangePreview();
      const [groupIndex, recordIndex] = STATE.editingRecordKey.split(':');
      $id(`mat-edit-grade-${groupIndex}-${recordIndex}`)?.focus();
      return;
    }
    if (event.target.closest('[data-cancel-record]')) {
      STATE.editingRecordKey = '';
      renderChangePreview();
      return;
    }
    const saveButton = event.target.closest('[data-save-record]');
    if (!saveButton) return;
    const [groupIndexText, recordIndexText] = saveButton.dataset.saveRecord.split(':');
    const groupIndex = Number(groupIndexText);
    const recordIndex = Number(recordIndexText);
    const record = STATE.groups[groupIndex]?.records?.[recordIndex];
    if (!record) return MAT.ui.toast('Não foi possível localizar o registro para edição.', 'error');
    const gradeInput = $id(`mat-edit-grade-${groupIndex}-${recordIndex}`);
    const feedbackInput = $id(`mat-edit-feedback-${groupIndex}-${recordIndex}`);
    const errorBox = $id(`mat-edit-error-${groupIndex}-${recordIndex}`);
    const grade = String(gradeInput?.value || '').trim();
    const feedback = String(feedbackInput?.value || '').trim();
    const parsedGrade = S.parseGrade(grade);
    if (!parsedGrade.valid) {
      if (errorBox) errorBox.textContent = 'Informe uma nota numérica igual ou maior que zero, ou deixe o campo vazio.';
      gradeInput?.focus();
      return;
    }
    const editedMaximum = confirmedRecordMaxGrade(STATE.groups[groupIndex], record);
    if (parsedGrade.number !== null && editedMaximum !== null && parsedGrade.number > editedMaximum) {
      if (errorBox) errorBox.textContent = `A nota não pode ultrapassar ${S.formatGradePtBr(editedMaximum)}.`;
      gradeInput?.focus();
      return;
    }
    if (parsedGrade.number === 0 && !feedback) {
      if (errorBox) errorBox.textContent = 'Nota zero não é lançada automaticamente. Escreva o feedback e deixe a nota em branco.';
      feedbackInput?.focus();
      return;
    }
    if (feedback.length > S.LIMITS.maxCellLength) {
      if (errorBox) errorBox.textContent = `O feedback não pode exceder ${S.LIMITS.maxCellLength} caracteres.`;
      feedbackInput?.focus();
      return;
    }
    record.nota = parsedGrade.number === 0 ? '' : S.formatGradePtBr(parsedGrade.number);
    record.notaNumero = parsedGrade.number === 0 ? null : parsedGrade.number;
    record.desempenho = '';
    record.feedback = feedback;
    STATE.editingRecordKey = '';
    invalidateChangePreview();
    updateBatchControls();
    MAT.ui.toast('Edição salva. Clique em Conferir alterações para revisar novamente antes do salvamento.');
    $id('mat-batch-review-changes')?.focus();
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
      invalidateChangePreview();
      await ensureMaximumsForFiles(assignments);
      rebuildBatchState(assignments);
      renderPreview();
      updateBatchControls();
    } catch (error) {
      invalidateChangePreview();
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
      updateBatchSteps();
    }
  }

  async function handleFileMappingChange(event) {
    const select = event.target.closest('[data-batch-file-index]');
    if (!select) return;
    const item = STATE.files[Number(select.dataset.batchFileIndex)];
    if (!item || item.embeddedActivity) return;
    item.selectedCmid = select.value;
    invalidateChangePreview();
    const assignments = pendingAssignments(MAT.state.snapshot);
    select.disabled = true;
    select.setAttribute('aria-busy', 'true');
    try {
      await ensureMaximumsForFiles(assignments);
      rebuildBatchState(assignments);
      renderPreview();
      updateBatchControls();
      $id(`mat-batch-file-map-${select.dataset.batchFileIndex}`)?.focus({ preventScroll: true });
    } finally {
      const current = $id(`mat-batch-file-map-${select.dataset.batchFileIndex}`);
      if (current) {
        current.disabled = false;
        current.removeAttribute('aria-busy');
      }
    }
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
    const statusLabel = phase === 'descobrindo' ? 'Localizando alunos em todas as páginas…'
      : phase === 'verificando' ? 'Conferindo no Moodle…'
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
      status: totals.pending || totals.divergent || failedActivities ? 'parcial' : 'confirmada',
      note: `${STATE.results.length} atividade(s) processada(s). ${totals.total} registro(s) relido(s): ${totals.confirmed} confirmado(s), ${totals.divergent} divergente(s) e ${totals.pending} pendente(s) de conferência. ${failedActivities} atividade(s) sem salvamento confirmado.`,
    }, MAT.state.course.id);
    for (const result of STATE.results) {
      if (!result.cmid || !['sucesso', 'erro', 'divergente', 'nao_verificado'].includes(result.outcome)) continue;
      const checked = result.verification?.items || [];
      const confirmed = result.outcome === 'sucesso' && checked.length > 0 && checked.every((item) => item.status === 'confirmed');
      await MAT.storage.addAction({
        type: 'conferencia_atividade',
        title: `Conferência de ${result.activityName || `atividade ${result.cmid}`}`,
        assignmentId: String(result.cmid),
        activityName: result.activityName || '',
        outcome: confirmed ? 'sucesso' : result.outcome === 'divergente' ? 'divergente' : 'nao_verificado',
        status: confirmed ? 'confirmada' : 'aguardando_conferencia',
        note: confirmed ? 'Nota e feedback conferidos no Moodle.' : 'Confira nota e feedback no Moodle antes de considerar a correção concluída.'
      }, MAT.state.course.id);
    }
    MAT.state.actions = await MAT.storage.loadActions(MAT.state.course.id);
    MAT.ui.renderView?.('historico');
    MAT.ui.renderView?.('hoje');
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
      updateBatchSteps();
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
    const headers = ['atividade', 'cmid', 'aluno', 'resultado_atividade', 'situacao_conferencia', 'nota_esperada', 'nota_moodle', 'situacao_nota', 'feedback_esperado', 'feedback_moodle', 'situacao_feedback', 'paginas_consultadas', 'alunos_reconhecidos', 'mensagem'];
    const rows = STATE.results.flatMap((result) => {
      const items = result.verification?.items || [];
      const pagesRead = result.diagnostics?.pagesRead ?? '';
      const recognizedStudents = result.diagnostics?.recognizedStudents ?? '';
      if (!items.length) return [[result.activityName || '', result.cmid || '', '', result.outcome || '', 'nao_verificado', '', '', '', '', '', '', pagesRead, recognizedStudents, result.message || '']];
      return items.map((item) => [
        result.activityName || '', result.cmid || '', item.moodleName || item.nome || '', result.outcome || '', item.status || '',
        item.grade?.expected || '', item.grade?.actual || '', item.grade?.status || '',
        item.feedback?.expected || '', item.feedback?.actual || '', item.feedback?.status || '', pagesRead, recognizedStudents, item.message || result.message || '',
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
    if (!STATE.previewAccepted || STATE.previewSignature !== buildPreviewSignature()) {
      return MAT.ui.toast('Confira novamente as notas e os feedbacks antes de salvar.');
    }
    const confirmed = $id('mat-batch-confirm')?.checked;
    if (!confirmed) return MAT.ui.toast('Confirme a revisão das alterações antes de salvar.');

    const overwriteGrade = $id('mat-batch-overwrite-grade')?.checked ?? false;
    const overwriteFeedback = $id('mat-batch-overwrite-feedback')?.checked ?? false;

    STATE.batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    STATE.running = true;
    updateBatchSteps();
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
        updateBatchSteps();
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
    STATE.previewAccepted = false;
    STATE.previewSignature = '';
    STATE.editingRecordKey = '';
    STATE.batchId = null;
    STATE.running = false;
    STATE.results = [];
    STATE.onlyVerificationIssues = false;
    STATE.historyRecordedBatchId = null;
    STATE.gradeResolution = {};
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
          <ol class="mat-batch-steps" id="mat-batch-steps" aria-label="Etapas do lançamento"><li data-step="1">1. Arquivos</li><li data-step="2">2. Atividades</li><li data-step="3">3. Conferência</li><li data-step="4">4. Salvamento</li><li data-step="5">5. Verificação</li></ol>
          <p>${pendingCount} atividade(s) com correção pendente foram reconhecidas nesta UC. Você pode selecionar um CSV combinado ou vários CSVs individuais.</p>
          <div id="mat-batch-error-summary" class="mat-warning mat-error mat-batch-error-summary" role="alert" hidden></div>
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

          <div class="mat-form-actions mat-batch-review-actions">
            <button class="mat-btn mat-btn-primary" id="mat-batch-review-changes" type="button" disabled>Conferir alterações</button>
          </div>
          <section id="mat-batch-change-preview" class="mat-batch-change-preview" aria-labelledby="mat-batch-change-preview-title" hidden></section>

          <label class="mat-check mat-confirm-change"><input id="mat-batch-confirm" type="checkbox" disabled /> Conferi as notas, os feedbacks e as regras de sobrescrita apresentadas acima.</label>

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
    $id('mat-batch-error-summary').addEventListener('click', (event) => {
      const button = event.target.closest('[data-batch-focus]');
      if (button) $id(button.dataset.batchFocus)?.focus();
    });
    $id('mat-batch-preview').addEventListener('change', handleFileMappingChange);
    $id('mat-batch-preview').addEventListener('click', handleBatchPreviewClick);
    $id('mat-batch-preview').addEventListener('keydown', handleBatchPreviewKeydown);
    $id('mat-batch-review-changes').addEventListener('click', renderChangePreview);
    for (const id of ['mat-batch-overwrite-grade', 'mat-batch-overwrite-feedback']) {
      $id(id).addEventListener('change', () => { invalidateChangePreview(); updateBatchControls(); });
    }
    $id('mat-batch-launch').addEventListener('click', handleBatchPrimaryAction);
    $id('mat-batch-cancel').addEventListener('click', cancelBatch);
    $id('mat-batch-report').addEventListener('click', downloadBatchReport);
    $id('mat-batch-confirm').addEventListener('change', (event) => {
      const blocked = isBatchBlocked();
      const previewCurrent = STATE.previewAccepted && STATE.previewSignature === buildPreviewSignature();
      $id('mat-batch-launch').disabled = blocked || !previewCurrent || !event.target.checked;
    });
    updateBatchSteps();
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
