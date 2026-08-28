'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;

  const csvEscape = (value) => {
    const text = globalThis.MAT_SHARED.neutralizeSpreadsheetFormula(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const slug = (value = '') => U.normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80);

  const htmlEscape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const evidenceMatrix = (actions = []) => ({
    headers: ['id', 'data_hora', 'titulo', 'tipo', 'situacao', 'aluno', 'canal', 'descricao', 'atualizado_em'],
    rows: actions.map((action) => [action.id || '', action.createdAt || '', action.title || '', action.type || '', action.status || '', action.studentName || '', action.channel || '', action.note || '', action.updatedAt || ''])
  });

  const evidenceHtml = ({ snapshot, actions, gradebook, checklist, generatedAt }) => {
    const course = snapshot?.course || {};
    const firstRecord = actions.length ? actions[actions.length - 1]?.createdAt : null;
    const lastRecord = actions.length ? actions[0]?.createdAt : null;
    const rows = actions.length ? actions.map((action) => `<tr><td>${htmlEscape(U.formatDate(action.createdAt, true))}</td><td>${htmlEscape(action.title || action.type || 'Ação registrada')}</td><td>${htmlEscape(action.studentName || '')}</td><td>${htmlEscape(action.status || 'realizada')}</td><td>${htmlEscape(action.channel || '')}</td><td>${htmlEscape(action.note || '')}</td></tr>`).join('') : '<tr><td colspan="6">Nenhum registro disponível para o período.</td></tr>';
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de evidências</title><style>body{font:14px Arial,sans-serif;color:#1f2937;margin:32px}h1{color:#174a7e;margin-bottom:4px}h2{margin-top:28px}.meta{display:grid;grid-template-columns:180px 1fr;gap:7px 14px;background:#f3f6fa;padding:16px;border-radius:8px}.label{font-weight:700}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}th{background:#174a7e;color:#fff}tr:nth-child(even){background:#f8fafc}.note{color:#475569;margin-top:18px}@media print{body{margin:12mm}thead{display:table-header-group}}</style></head><body><h1>Relatório de evidências do Assistente EaD SENAI</h1><p>Registro operacional gerado localmente a partir dos dados disponíveis neste navegador.</p><div class="meta"><span class="label">Curso</span><span>${htmlEscape(course.name || 'Não identificado')}</span><span class="label">UC</span><span>${htmlEscape(course.activeUcName || 'Não definida')}</span><span class="label">Ambiente</span><span>${htmlEscape(course.environment || location.hostname)}</span><span class="label">Curso ID</span><span>${htmlEscape(course.id || '')}</span><span class="label">Gerado em</span><span>${htmlEscape(U.formatDate(generatedAt, true))}</span><span class="label">Registros</span><span>${actions.length}</span><span class="label">Período registrado</span><span>${firstRecord ? `${htmlEscape(U.formatDate(firstRecord, true))} a ${htmlEscape(U.formatDate(lastRecord, true))}` : 'Sem registros'}</span><span class="label">Livro de notas incluído</span><span>${gradebook ? 'Sim' : 'Não'}</span><span class="label">Checklist incluído</span><span>${Object.keys(checklist || {}).length ? 'Sim' : 'Não'}</span></div><h2>Histórico de ações</h2><table><thead><tr><th>Data e hora</th><th>Ação</th><th>Aluno</th><th>Situação</th><th>Canal</th><th>Evidência registrada</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Este relatório reproduz os registros mantidos localmente conforme o período de retenção configurado. Mensagens podem aparecer com o conteúdo omitido quando a opção de armazenamento de mensagens estiver desativada. Use a função de impressão do navegador para gerar uma cópia em PDF.</p></body></html>`;
  };

  const exportEvidencePackage = ({ snapshot, actions = [], gradebook = null, checklist = {} } = {}) => {
    if (!snapshot?.course) return false;
    const generatedAt = new Date().toISOString();
    const matrix = evidenceMatrix(actions);
    const csv = '\ufeff' + [matrix.headers, ...matrix.rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    const payload = { schemaVersion: 1, extensionVersion: MAT.VERSION, generatedAt, coverage: { retentionDays: MAT.state.settings?.retentionDays || 90, recordCount: actions.length, firstRecordAt: actions.length ? actions[actions.length - 1]?.createdAt || null : null, lastRecordAt: actions.length ? actions[0]?.createdAt || null : null, maximumLocalRecordsPerCourse: 2000 }, course: snapshot.course, actions, checklist, snapshot, gradebook };
    const readme = ['PACOTE DE EVIDÊNCIAS DO ASSISTENTE EAD SENAI', '', `Gerado em: ${generatedAt}`, `Curso: ${snapshot.course.name || 'Não identificado'}`, `UC: ${snapshot.course.activeUcName || 'Não definida'}`, `Registros incluídos: ${actions.length}`, '', 'Arquivos:', '- relatorio_evidencias.html: relatório visual para consulta e impressão em PDF.', '- historico_acoes.csv: histórico tabular para Excel ou planilha.', '- auditoria_completa.json: dados estruturados do histórico, retrato, checklist e notas disponíveis.', '', 'O pacote reflete os dados existentes neste navegador e o período de retenção configurado no momento da exportação.'].join('\n');
    const entries = [{ name: 'LEIA-ME.txt', content: readme }, { name: 'relatorio_evidencias.html', content: evidenceHtml({ snapshot, actions, gradebook, checklist, generatedAt }) }, { name: 'historico_acoes.csv', content: csv }, { name: 'auditoria_completa.json', content: JSON.stringify(payload, null, 2) }];
    const filename = `evidencias_assistente_ead_${slug(snapshot.course.name)}_${generatedAt.slice(0, 10)}.zip`;
    U.downloadBlob(U.makeZipBlob(entries), filename, 'application/zip');
    return { filename, recordCount: actions.length };
  };

  const exportSnapshotJson = (snapshot, actions = []) => {
    const safe = { ...snapshot, localActions: actions };
    U.downloadBlob(JSON.stringify(safe, null, 2), `assistente_ead_${slug(snapshot.course.name)}_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const exportStudentsCsv = (snapshot) => {
    const headers = [
      'nome', 'email', 'ultimo_acesso', 'dias_sem_acesso', 'nivel_risco', 'motivos',
      'acao_recomendada', 'atividades_sem_entrega', 'entregas_aguardando_correcao', 'nota_total', 'url_perfil'
    ];
    const rows = snapshot.students.map((student) => [
      student.name,
      student.email,
      student.lastAccessText,
      student.lastAccessDays,
      student.riskLevel,
      student.riskReasons.map((reason) => reason.text).join(' | '),
      student.recommendedAction,
      student.missingAssignments,
      student.pendingGrading,
      student.gradeTotal,
      student.profileUrl
    ]);
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    U.downloadBlob(csv, `alunos_${slug(snapshot.course.name)}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  };

  const exportPendingGradingCsv = (snapshot) => {
    const headers = ['atividade', 'aluno', 'status', 'data_modificacao', 'arquivo_anexado', 'url_correcao'];
    const rows = [];
    (snapshot.activityPanorama?.assignments || snapshot.assignments).forEach((assignment) => {
      assignment.gradingRows?.filter((row) => row.requiresGrading || row.submitted && !row.graded).forEach((row) => rows.push([
        assignment.name,
        row.studentName,
        row.statusText,
        row.modifiedText,
        row.files?.length ? 'Sim' : 'Não',
        assignment.gradingUrl || assignment.url
      ]));
    });
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    U.downloadBlob(csv, `correcoes_pendentes_${slug(snapshot.course.name)}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  };

  const exportActivitiesCsv = (snapshot) => {
    const panorama = snapshot.activityPanorama;
    if (!panorama) return;
    const headers = [
      'uc', 'atividade', 'tipo', 'prazo', 'entregas_esperadas', 'entregas_realizadas',
      'entregas_corrigidas', 'faltam_corrigir', 'sem_entrega', 'percentual_entrega',
      'percentual_correcao', 'status', 'correcao_confirmada', 'confianca', 'fonte_dos_numeros', 'url_atividade', 'url_correcao'
    ];
    const rows = panorama.assignments.map((assignment) => {
      const metrics = assignment.metrics || {};
      return [
        panorama.scope.label,
        assignment.name,
        'Tarefa',
        assignment.dueText,
        metrics.expected,
        metrics.delivered,
        metrics.corrected,
        metrics.pending,
        metrics.missing,
        metrics.deliveryRate,
        metrics.correctionRate,
        metrics.status,
        metrics.pendingKnown ? 'Sim' : 'Não',
        metrics.confidence,
        metrics.source,
        assignment.url,
        assignment.gradingUrl || assignment.url
      ];
    });
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    U.downloadBlob(csv, `panorama_atividades_${slug(panorama.scope.label)}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  };


  const gradeSituation = (student, gradebook, settings = {}) => {
    if (!gradebook?.courseTotalItem) return 'Total final não identificado';
    const total = student.courseTotal;
    if (total === null || total === undefined) return 'Sem nota final';
    const minimum = Number(settings.minimumGrade ?? 60);
    const recoveryMin = Number(settings.recoveryMin ?? 40);
    const recoveryMax = Number(settings.recoveryMax ?? 59.99);
    if (total >= minimum) return 'Média alcançada';
    if (total >= recoveryMin && total <= recoveryMax) return 'Recuperação';
    return 'Abaixo da faixa de recuperação';
  };

  const gradebookMatrix = (gradebook, settings = {}) => {
    const items = gradebook?.items || [];
    const headers = [
      'nome',
      'email',
      ...items.map((item) => item.maxGrade === null || item.maxGrade === undefined ? item.name : `${item.name} (máx. ${item.maxGrade})`),
      'itens_com_nota',
      'itens_sem_nota',
      'situacao_final',
      'url_perfil'
    ];
    const rows = (gradebook?.students || []).map((student) => [
      student.studentName,
      student.email || '',
      ...items.map((item) => {
        const entry = student.grades?.[item.key];
        return entry?.value === null || entry?.value === undefined ? '' : entry.value;
      }),
      student.gradedItems ?? items.filter((item) => student.grades?.[item.key]?.value !== null && student.grades?.[item.key]?.value !== undefined).length,
      student.missingItems ?? items.filter((item) => student.grades?.[item.key]?.value === null || student.grades?.[item.key]?.value === undefined).length,
      gradeSituation(student, gradebook, settings),
      student.profileUrl || ''
    ]);
    return { headers, rows };
  };

  const exportGradebookCsv = (gradebook, settings = {}) => {
    if (!gradebook?.items?.length) return false;
    const matrix = gradebookMatrix(gradebook, settings);
    const csv = '\ufeff' + [matrix.headers, ...matrix.rows].map((row) => row.map(csvEscape).join(';')).join('\n');
    U.downloadBlob(csv, `relatorio_notas_${slug(gradebook.course?.name || 'curso')}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    return true;
  };

  const xmlEscape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const spreadsheetCell = (value, style = '') => {
    const numeric = typeof value === 'number' && Number.isFinite(value);
    const styleAttribute = style ? ` ss:StyleID="${style}"` : '';
    return `<Cell${styleAttribute}><Data ss:Type="${numeric ? 'Number' : 'String'}">${xmlEscape(value)}</Data></Cell>`;
  };

  const exportGradebookExcel = (gradebook, settings = {}) => {
    if (!gradebook?.items?.length) return false;
    const matrix = gradebookMatrix(gradebook, settings);
    const header = matrix.headers.map((value) => spreadsheetCell(value, 'Header')).join('');
    const rows = matrix.rows.map((row) => `<Row>${row.map((value, index) => spreadsheetCell(value, index === 0 ? 'Name' : '')).join('')}</Row>`).join('');
    const title = `Relatório de notas - ${gradebook.course?.name || 'Curso'}`;
    const summaryRows = [
      ['Curso', gradebook.course?.name || ''],
      ['Ambiente', gradebook.course?.environment || ''],
      ['Data da coleta', U.formatDate(gradebook.meta?.collectedAt || new Date(), true)],
      ['Situação da leitura', gradebook.meta?.partial ? 'Parcial, requer conferência' : 'Concluída'],
      ['Alunos', gradebook.summary?.studentCount || 0],
      ['Itens de nota', gradebook.summary?.itemCount || 0],
      ['Células com nota', gradebook.summary?.gradedCells || 0],
      ['Células sem nota', gradebook.summary?.missingCells || 0],
      ['Total do curso identificado', gradebook.courseTotalItem ? gradebook.courseTotalItem.name : 'Não'],
      ['Filtro de grupo', gradebook.meta?.limitedByGroup ? gradebook.meta.selectedGroup || 'Ativo' : 'Todos os participantes'],
      ['Categorias recolhidas detectadas', gradebook.meta?.collapsedCategoriesDetected ? 'Sim' : 'Não'],
      ['Observação', 'Os valores reproduzem o livro de notas. O assistente não recalcula médias, pesos, categorias ou fórmulas.']
    ].map(([label, value]) => `<Row>${spreadsheetCell(label, 'Label')}${spreadsheetCell(value)}</Row>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>${xmlEscape(title)}</Title><Created>${new Date().toISOString()}</Created></DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#174A7E" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="Name"><Font ss:Bold="1"/></Style>
  <Style ss:ID="Label"><Font ss:Bold="1"/><Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Resumo">
  <Table><Column ss:Width="210"/><Column ss:Width="420"/><Row ss:Height="30">${spreadsheetCell(title, 'Header')}${spreadsheetCell('')}</Row>${summaryRows}</Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions>
 </Worksheet>
 <Worksheet ss:Name="Notas">
  <Table>
   <Column ss:Width="190"/><Column ss:Width="170"/>
   <Row ss:Height="36">${header}</Row>
   ${rows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions>
 </Worksheet>
</Workbook>`;
    U.downloadBlob(`\ufeff${xml}`, `relatorio_notas_${slug(gradebook.course?.name || 'curso')}_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    return true;
  };

  const exportDiagnostics = (snapshot) => {
    const payload = {
      extensionVersion: MAT.VERSION,
      meta: snapshot.meta,
      course: snapshot.course,
      sources: snapshot.sources,
      diagnostics: snapshot.diagnostics,
      counts: snapshot.summary,
      activities: (snapshot.activityPanorama?.assignments || snapshot.assignments || []).map((assignment) => ({
        cmid: assignment.cmid,
        name: assignment.name,
        collectionStatus: assignment.collectionStatus,
        gradingCollectionStatus: assignment.gradingCollectionStatus,
        summaryCounts: assignment.summaryCounts,
        gradingVerification: assignment.gradingVerification,
        gradingDiagnostics: assignment.gradingDiagnostics,
        metrics: assignment.metrics,
        gradingRowCounts: {
          total: assignment.gradingRows?.length || 0,
          submitted: assignment.gradingRows?.filter((row) => row.submitted || row.graded).length || 0,
          graded: assignment.gradingRows?.filter((row) => row.graded).length || 0,
          pending: assignment.gradingRows?.filter((row) => row.requiresGrading || row.submitted && !row.graded).length || 0,
          missing: assignment.gradingRows?.filter((row) => row.missing).length || 0,
          unknown: assignment.gradingRows?.filter((row) => row.unknown).length || 0
        },
        url: assignment.url,
        gradingUrl: assignment.gradingUrl
      })),
      location: { href: location.href, host: location.hostname },
      generatedAt: new Date().toISOString()
    };
    U.downloadBlob(JSON.stringify(payload, null, 2), `diagnostico_assistente_ead_${Date.now()}.json`);
  };

  MAT.exporters = { exportSnapshotJson, exportEvidencePackage, exportStudentsCsv, exportPendingGradingCsv, exportActivitiesCsv, exportGradebookCsv, exportGradebookExcel, exportDiagnostics, gradeSituation };
})();
