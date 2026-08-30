'use strict';

const DASHBOARD_KEY = 'mat_executive_dashboard_v1';
const HISTORY_KEY = 'mat_executive_dashboard_history_v1';
const AUDIT_KEY = 'mat_audit_log_v1';
const THEME_KEY = 'mat_dashboard_theme';
const NAV_KEY = 'mat_dashboard_nav_v1';
const state = { payload: null, filtered: [], history: [], auditEvents: [], filteredAudit: [], academicData: null, view: 'overview', directoryHandle: null };
const $ = (id) => document.getElementById(id);
const text = (value) => String(value ?? '');
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const formatDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : 'Não identificada';
const formatDateTime = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Não identificada';
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const sum = (courses, key) => courses.reduce((total, course) => total + (number(course[key]) || 0), 0);

function toast(message, type = '') {
  const region = $('toast-region');
  const item = document.createElement('div');
  item.className = `toast ${type}`.trim();
  item.textContent = message;
  region.appendChild(item);
  setTimeout(() => item.remove(), 6000);
}

function readingStatus(course) {
  if (number(course.errors) > 0) return 'Parcial';
  if (number(course.unverified) > 0) return 'Conferir';
  if (course.totalPending === null || course.totalPending === undefined) return 'Não coletada';
  return 'Concluída';
}

function metric(label, value, detail = '', danger = false) {
  return `<article class="metric${danger ? ' danger' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</article>`;
}

function quality(label, value, detail) {
  return `<article class="quality"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function viewHead(title, description, action = '') {
  return `<header class="view-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>${action}</header>`;
}

function empty(message) {
  return `<div class="empty"><strong>Nenhum registro disponível</strong><br>${escapeHtml(message)}</div>`;
}

function applyFilters() {
  const environment = $('filter-environment').value;
  const vigency = $('filter-vigency').value;
  const status = $('filter-status').value;
  const query = $('filter-search').value.trim().toLowerCase();
  state.filtered = state.payload.courses.filter((course) => {
    if (environment && course.environment !== environment) return false;
    if (vigency && course.vigency !== vigency) return false;
    const reading = readingStatus(course);
    if (status === 'pending' && !(number(course.totalPending) > 0)) return false;
    if (status === 'clear' && !(number(course.totalPending) === 0 && reading === 'Concluída')) return false;
    if (status === 'review' && reading === 'Concluída') return false;
    return !query || `${course.groupName} ${course.name} ${course.courseId}`.toLowerCase().includes(query);
  });
  renderView();
}

function courseTable(courses = state.filtered) {
  const rows = courses.map((course) => {
    const reading = readingStatus(course);
    const pending = number(course.totalPending);
    const completion = number(course.completionPercentage);
    const rowClass = pending > 0 ? 'pending' : reading !== 'Concluída' ? 'review' : '';
    return `<tr class="${rowClass}"><td><strong>${escapeHtml(course.groupName || 'Não identificada')}</strong></td><td><a href="${escapeHtml(course.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(course.name)}</a><br><small>ID ${escapeHtml(course.courseId)}</small></td><td>${escapeHtml(course.vigencyLabel || course.vigency)}</td><td>${escapeHtml(formatDate(course.startsAt))} a ${escapeHtml(formatDate(course.endsAt))}</td><td>${completion === null ? 'Não coletada' : `${completion}%`}</td><td>${number(course.studentCount) ?? 'Não coletado'}</td><td>${number(course.classAverage) ?? 'Não coletada'}</td><td class="${pending > 0 ? 'status-red' : pending === 0 ? 'status-green' : 'status-amber'}">${pending === null ? 'Não coletada' : pending}</td><td>${escapeHtml(reading)}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Turma</th><th>UC ou curso</th><th>Vigência</th><th>Período</th><th>Conclusão</th><th>Alunos</th><th>Média</th><th>Pendências</th><th>Leitura</th></tr></thead><tbody>${rows || '<tr><td colspan="9">Nenhum registro corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
}

function overview() {
  const courses = state.filtered;
  const pending = sum(courses, 'totalPending');
  const current = courses.filter((course) => course.vigency === 'current').length;
  const future = courses.filter((course) => course.vigency === 'future').length;
  const students = courses.map((course) => number(course.studentCount)).filter((value) => value !== null);
  const completion = courses.map((course) => number(course.completionPercentage)).filter((value) => value !== null);
  const grades = courses.map((course) => number(course.classAverage)).filter((value) => value !== null);
  const verified = courses.filter((course) => readingStatus(course) === 'Concluída').length;
  const review = courses.length - verified;
  const affected = courses.filter((course) => number(course.totalPending) > 0).length;
  const top = [...courses].filter((course) => number(course.totalPending) > 0).sort((a, b) => number(b.totalPending) - number(a.totalPending)).slice(0, 8);
  const maxPending = Math.max(1, ...top.map((course) => number(course.totalPending) || 0));
  return viewHead('Prioridades de hoje', 'Acompanhe os principais indicadores e comece pelas UCs que exigem ação.')
    + `<section class="metrics">${metric('Cursos e UCs', courses.length, `${current} atuais e ${future} futuras`)}${metric('Alunos identificados', students.length ? students.reduce((a, b) => a + b, 0) : 'Não coletado', `${students.length} turma(s) com fonte`)}${metric('Pendências', pending, `${affected} UC(s) com ação`, pending > 0)}${metric('Conclusão média', completion.length ? `${average(completion).toFixed(1)}%` : 'Não coletada', `${completion.length} UC(s) com fonte`)}${metric('Média das turmas', grades.length ? average(grades).toFixed(1) : 'Não coletada', `${grades.length} turma(s) com fonte`)}${metric('Conferir leitura', review, `${verified} leitura(s) concluída(s)`)}</section>`
    + `<section class="panel"><div class="panel-head"><div><h3>Maiores filas de correção</h3><p>Prioridade por volume confirmado de pendências.</p></div><button class="button" data-open-view="queue" type="button">Ver fila completa</button></div><div class="chart-list">${top.length ? top.map((course) => `<div class="chart-row"><span>${escapeHtml(course.name)}</span><div class="bar danger" role="img" aria-label="${number(course.totalPending)} pendências"><span style="width:${Math.max(4, number(course.totalPending) / maxPending * 100)}%"></span></div><strong>${number(course.totalPending)}</strong></div>`).join('') : empty('Nenhuma pendência confirmada nos filtros atuais.')}</div></section>`
    + `<section class="panel"><div class="panel-head"><div><h3>Qualidade dos dados</h3><p>Somente fontes reconhecidas entram nos cálculos.</p></div></div><div class="quality-grid">${quality('Cobertura da leitura', courses.length ? `${Math.round(verified / courses.length * 100)}%` : '0%', `${verified} de ${courses.length} concluída(s)`)}${quality('UCs atuais', current, 'Vigência reconhecida')}${quality('Turmas futuras', future, 'Com início reconhecido')}${quality('Turmas com pendências', affected, `${pending} correção(ões) confirmada(s)`)}</div></section>`;
}

function courses() { return viewHead('Turmas e UCs', `${state.filtered.length} registro(s) após os filtros globais.`) + `<section class="panel">${courseTable()}</section>`; }
function risk() {
  const atRisk = state.filtered.filter((course) => number(course.totalPending) > 0 || readingStatus(course) !== 'Concluída').sort((a, b) => (number(b.totalPending) || 0) - (number(a.totalPending) || 0));
  return viewHead('Alunos em risco', 'Triagem por UC. Dados nominais só aparecem quando o Moodle fornece uma fonte segura.') + '<p class="notice info">A coleta agregada não persiste nomes de estudantes. Abra a UC para realizar a análise individual.</p>' + `<section class="metrics">${metric('UCs para acompanhar', atRisk.length)}${metric('Pendências confirmadas', sum(atRisk, 'totalPending'), 'Itens aguardando avaliação', sum(atRisk, 'totalPending') > 0)}${metric('Leituras incompletas', atRisk.filter((course) => readingStatus(course) !== 'Concluída').length)}${metric('Alunos nominais', 'Não coletados', 'Proteção de dados por padrão')}</section><section class="panel">${courseTable(atRisk)}</section>`;
}
function performance() {
  const measured = state.filtered.filter((course) => number(course.completionPercentage) !== null || number(course.classAverage) !== null).sort((a, b) => (number(a.completionPercentage) ?? 101) - (number(b.completionPercentage) ?? 101));
  return viewHead('Notas e desempenho', 'Conclusão de atividades e média da turma são indicadores separados.') + '<p class="notice info">Ausência de fonte aparece como “Não coletada” e nunca como zero.</p>' + `<section class="panel"><div class="panel-head"><div><h3>Conclusão por UC</h3><p>${measured.length} UC(s) com pelo menos uma métrica reconhecida.</p></div></div><div class="chart-list">${measured.length ? measured.map((course) => { const value = number(course.completionPercentage); return `<div class="chart-row"><span>${escapeHtml(course.name)}</span><div class="bar" role="img" aria-label="${value === null ? 'Conclusão não disponível' : `${value}% de conclusão`}"><span style="width:${value ?? 0}%"></span></div><strong>${value === null ? 'N/D' : `${value}%`}</strong></div>`; }).join('') : empty('O Moodle ainda não forneceu métricas de conclusão ou média.')}</div></section>`;
}
function tutors() { return viewHead('Tutores e monitores', 'Cobertura operacional por responsável.') + '<p class="notice warning">Os cartões da página inicial não fornecem identificação padronizada do tutor em todos os ambientes. A Central não atribui cursos sem fonte verificável.</p>' + `<section class="metrics">${metric('Tutores identificados', 'Não coletado')}${metric('Cursos sem responsável', 'Não verificável')}${metric('Carga média por tutor', 'Não calculável')}</section>`; }
function calendar() { const future = state.filtered.filter((course) => course.vigency === 'future' && course.startsAt).sort((a, b) => a.startsAt - b.startsAt); return viewHead('Calendário de futuras turmas', 'Cursos e UCs ordenados pela data de início reconhecida.') + `<div class="calendar-grid">${future.length ? future.map((course) => `<article class="calendar-card"><time datetime="${new Date(course.startsAt).toISOString()}">${escapeHtml(formatDate(course.startsAt))}${course.endsAt ? ` a ${escapeHtml(formatDate(course.endsAt))}` : ''}</time><h3>${escapeHtml(course.name)}</h3><p>${escapeHtml(course.groupName || 'Turma não identificada')}</p><a href="${escapeHtml(course.url)}" target="_blank" rel="noopener noreferrer">Abrir no Moodle</a></article>`).join('') : empty('Nenhuma turma futura com data reconhecida corresponde aos filtros.')}</div>`; }
function queue() { const items = state.filtered.map((course) => ({ ...course, priority: (number(course.totalPending) || 0) * 10 + (readingStatus(course) === 'Parcial' ? 5 : readingStatus(course) === 'Conferir' ? 3 : 0) })).filter((course) => course.priority > 0).sort((a, b) => b.priority - a.priority); return viewHead('Fila de trabalho', 'Priorização por volume de pendências e integridade da leitura.') + `<section class="panel"><div class="table-wrap"><table><thead><tr><th>Prioridade</th><th>Turma</th><th>UC</th><th>Pendências</th><th>Leitura</th><th>Ação</th></tr></thead><tbody>${items.map((course, index) => `<tr class="${number(course.totalPending) > 0 ? 'pending' : 'review'}"><td><span class="badge ${index < 3 ? 'red' : ''}">${index + 1}</span></td><td>${escapeHtml(course.groupName || 'Não identificada')}</td><td>${escapeHtml(course.name)}</td><td>${number(course.totalPending) ?? 'Não coletada'}</td><td>${escapeHtml(readingStatus(course))}</td><td><a href="${escapeHtml(course.url)}" target="_blank" rel="noopener noreferrer">Abrir UC</a></td></tr>`).join('') || '<tr><td colspan="6">Nenhuma ação pendente nos filtros atuais.</td></tr>'}</tbody></table></div></section>`; }
function environments() { const groups = state.filtered.reduce((result, course) => { const key = course.environment || 'Não identificado'; (result[key] ||= []).push(course); return result; }, {}); return viewHead('Comparativo de ambientes', 'Cobertura e pendências por domínio Moodle.') + `<section class="metrics">${Object.entries(groups).map(([name, items]) => metric(name, items.length, `${sum(items, 'totalPending')} pendência(s)`, sum(items, 'totalPending') > 0)).join('') || metric('Ambientes', 0)}</section><section class="panel">${courseTable()}</section>`; }

function auditFilters() {
  const period = $('audit-period')?.value || '30';
  const result = $('audit-result')?.value || '';
  const type = $('audit-type')?.value || '';
  const query = ($('audit-search')?.value || '').trim().toLowerCase();
  const cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
  state.filteredAudit = state.auditEvents.filter((event) => {
    if (cutoff && Date.parse(event.createdAt || 0) < cutoff) return false;
    if (result && event.result !== result) return false;
    if (type && event.eventType !== type) return false;
    return !query || `${event.courseName} ${event.ucName} ${event.activityName} ${event.message} ${globalThis.MAT_AUDIT_EXPORT.eventLabel(event.eventType)}`.toLowerCase().includes(query);
  });
  renderView();
}

function history() {
  const events = state.filteredAudit;
  const success = events.filter((event) => event.result === 'success').length;
  const partial = events.filter((event) => event.result === 'partial').length;
  const errors = events.filter((event) => event.result === 'error').length;
  const types = [...new Set(state.auditEvents.map((event) => event.eventType).filter(Boolean))].sort();
  const timeline = events.slice(0, 100).map((event) => `<article class="audit-event"><div class="event-icon" aria-hidden="true">${event.result === 'error' ? '!' : event.result === 'partial' ? '?' : '✓'}</div><div class="event-copy"><strong>${escapeHtml(globalThis.MAT_AUDIT_EXPORT.eventLabel(event.eventType))}</strong><span>${escapeHtml([event.courseName || event.courseId, event.ucName, event.activityName].filter(Boolean).join(' · ') || 'Contexto geral')}</span><span>${escapeHtml(event.message || 'Registro operacional local.')}</span><time datetime="${escapeHtml(event.createdAt)}">${escapeHtml(formatDateTime(event.createdAt))}</time></div><span class="event-result ${escapeHtml(event.result || 'info')}">${escapeHtml(event.result === 'success' ? 'Concluído' : event.result === 'partial' ? 'Parcial' : event.result === 'error' ? 'Falha' : 'Informativo')}</span></article>`).join('');
  const folderName = state.directoryHandle?.name || 'Nenhuma pasta selecionada';
  const directorySupported = globalThis.MAT_DIRECTORY.supported();
  return viewHead('Auditoria Local', 'Evidências organizadas por ação, curso, data e resultado.', '<button class="button primary" data-audit-action="export-directory" type="button">Exportar evidências</button>')
    + `<section class="metrics audit-summary">${metric('Eventos exibidos', events.length)}${metric('Concluídos', success)}${metric('Parciais', partial, 'Exigem conferência')}${metric('Falhas tratadas', errors, 'Com orientação de recuperação', errors > 0)}</section>`
    + `<section class="panel"><div class="directory-card"><div><h3>Pasta das evidências</h3><p class="directory-status"><span class="status-dot" aria-hidden="true"></span><span><strong>${escapeHtml(folderName)}</strong><br>${directorySupported ? 'A pasta só será usada após sua autorização.' : 'Acesso direto indisponível. Use o download em ZIP.'}</span></p><label class="privacy-option"><input id="include-academic-data" type="checkbox"><span>Incluir dados acadêmicos individuais disponíveis nesta exportação. Esta opção pode incluir nomes, notas e feedbacks.</span></label></div><div class="actions"><button class="button secondary" data-audit-action="choose-directory" type="button" ${directorySupported ? '' : 'disabled'}>Escolher pasta</button><button class="button secondary" data-audit-action="download-zip" type="button">Baixar ZIP</button></div></div></section>`
    + `<section class="panel"><div class="panel-head"><div><h3>Linha do tempo</h3><p>Até 100 registros por visualização. O pacote exporta todo o conjunto filtrado.</p></div></div><div class="audit-toolbar"><label>Período<select id="audit-period"><option value="30">Últimos 30 dias</option><option value="7">Últimos 7 dias</option><option value="1">Hoje</option><option value="all">Todo o histórico</option></select></label><label>Resultado<select id="audit-result"><option value="">Todos</option><option value="success">Concluído</option><option value="partial">Parcial</option><option value="error">Falha</option><option value="info">Informativo</option></select></label><label>Tipo<select id="audit-type"><option value="">Todos</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(globalThis.MAT_AUDIT_EXPORT.eventLabel(type))}</option>`).join('')}</select></label><label>Pesquisar<input id="audit-search" type="search" placeholder="Curso, UC, atividade ou ação"></label></div><div class="timeline">${timeline || empty('Realize uma análise ou registre uma ação para iniciar a linha do tempo.')}</div></section>`;
}

function reports() { return viewHead('Central de relatórios', 'Exporte exatamente o conjunto resultante dos filtros globais.') + `<div class="report-grid"><article class="report-card"><h3>Relatório geral CSV</h3><p>Turmas, períodos, conclusão, média e pendências.</p><button data-export="csv" type="button">Baixar CSV</button></article><article class="report-card"><h3>Calendário CSV</h3><p>Turmas e UCs futuras em ordem de início.</p><button data-export="calendar" type="button">Baixar calendário</button></article><article class="report-card"><h3>Fila de trabalho CSV</h3><p>UCs com pendências ou leitura incompleta.</p><button data-export="queue" type="button">Baixar fila</button></article><article class="report-card"><h3>Relatório PDF</h3><p>Abre a impressão para salvar a visão atual em PDF.</p><button data-export="pdf" type="button">Gerar PDF</button></article><article class="report-card"><h3>Backup JSON</h3><p>Snapshot técnico dos dados agregados.</p><button data-export="json" type="button">Baixar JSON</button></article><article class="report-card"><h3>Pacote de evidências</h3><p>Histórico, relatório, manifesto e hashes.</p><button data-open-view="history" type="button">Abrir Auditoria Local</button></article></div>`; }

const views = { overview, courses, risk, performance, tutors, calendar, queue, environments, history, reports };

function preserveAuditFilterValues() {
  return { period: $('audit-period')?.value, result: $('audit-result')?.value, type: $('audit-type')?.value, search: $('audit-search')?.value };
}

function renderView() {
  const auditValues = preserveAuditFilterValues();
  const root = $('view-root');
  root.innerHTML = (views[state.view] || overview)();
  root.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', () => exportReport(button.dataset.export)));
  root.querySelectorAll('[data-open-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.openView)));
  root.querySelectorAll('[data-audit-action]').forEach((button) => button.addEventListener('click', () => handleAuditAction(button.dataset.auditAction, button)));
  if (state.view === 'history') {
    if (auditValues.period) $('audit-period').value = auditValues.period;
    if (auditValues.result) $('audit-result').value = auditValues.result;
    if (auditValues.type) $('audit-type').value = auditValues.type;
    if (auditValues.search) $('audit-search').value = auditValues.search;
    ['audit-period', 'audit-result', 'audit-type'].forEach((id) => $(id).addEventListener('change', auditFilters));
    $('audit-search').addEventListener('input', auditFilters);
  }
}

function setView(name) {
  state.view = views[name] ? name : 'overview';
  document.querySelectorAll('.nav-item').forEach((item) => {
    const active = item.dataset.view === state.view;
    item.classList.toggle('is-active', active);
    active ? item.setAttribute('aria-current', 'page') : item.removeAttribute('aria-current');
  });
  renderView();
  $('workspace').focus({ preventScroll: true });
}

function csvCell(value) { const raw = text(value); const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; }
function download(content, type, name) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

async function appendAuditEvent(event) {
  const item = { schemaVersion: 1, eventId: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), extensionVersion: '3.7.0', environment: '', courseId: '', courseName: '', ucName: '', activityId: '', activityName: '', result: 'info', counts: {}, source: 'dashboard', message: '', ...event };
  state.auditEvents = [item, ...state.auditEvents].slice(0, 2000);
  state.filteredAudit = [...state.auditEvents];
  await chrome.storage.local.set({ [AUDIT_KEY]: state.auditEvents });
  return item;
}

async function exportReport(type) {
  if (type === 'pdf') { window.print(); await appendAuditEvent({ eventType: 'report.exported', result: 'success', message: 'Impressão do relatório iniciada.' }); return; }
  if (type === 'json') { download(JSON.stringify({ exportedAt: new Date().toISOString(), filters: currentGlobalFilters(), courses: state.filtered }, null, 2), 'application/json', 'central_gestao_moodle.json'); await appendAuditEvent({ eventType: 'report.exported', result: 'success', message: 'Backup JSON exportado.' }); return; }
  let courses = state.filtered;
  const headers = ['ambiente', 'turma', 'curso_id', 'uc_ou_curso', 'url', 'vigencia', 'inicio', 'fim', 'conclusao_percentual', 'alunos', 'media_turma', 'pendencias', 'atividades_com_pendencias', 'situacao_leitura'];
  if (type === 'calendar') courses = courses.filter((course) => course.vigency === 'future').sort((a, b) => (a.startsAt || 0) - (b.startsAt || 0));
  if (type === 'queue') courses = courses.filter((course) => number(course.totalPending) > 0 || readingStatus(course) !== 'Concluída');
  const rows = courses.map((course) => [course.environment, course.groupName, course.courseId, course.name, course.url, course.vigencyLabel, formatDate(course.startsAt), formatDate(course.endsAt), course.completionPercentage ?? '', course.studentCount ?? '', course.classAverage ?? '', course.totalPending ?? '', course.activitiesPending ?? '', readingStatus(course)]);
  const filename = type === 'calendar' ? 'calendario_futuras_turmas.csv' : type === 'queue' ? 'fila_de_trabalho.csv' : `dashboard_turmas_${new Date().toISOString().slice(0, 10)}.csv`;
  download('\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\n'), 'text/csv;charset=utf-8', filename);
  await appendAuditEvent({ eventType: 'report.exported', result: 'success', counts: { records: courses.length }, message: `${filename} exportado.` });
}

function currentGlobalFilters() { return { environment: $('filter-environment').value, vigency: $('filter-vigency').value, status: $('filter-status').value, search: $('filter-search').value }; }

async function exportEvidence(mode, button) {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    const includeAcademic = Boolean($('include-academic-data')?.checked);
    if (includeAcademic && !window.confirm('A exportação detalhada pode incluir nomes, notas e feedbacks. Confirma o salvamento destes dados na pasta escolhida?')) return;
    const auditFilter = { period: $('audit-period')?.selectedOptions?.[0]?.textContent || 'Todo o histórico', result: $('audit-result')?.value || '', type: $('audit-type')?.value || '', search: $('audit-search')?.value || '' };
    const events = state.filteredAudit;
    const exportPayload = includeAcademic ? { ...state.payload, academicRecords: state.academicData } : state.payload;
    const packageData = await globalThis.MAT_AUDIT_EXPORT.buildFiles({ events, payload: exportPayload, filters: auditFilter, includeAcademic });
    const stamp = packageData.generatedAt.replace(/[:.]/g, '-');
    const folderName = `${stamp}_auditoria_local`;
    if (mode === 'directory') {
      let handle = state.directoryHandle;
      if (!handle) handle = await globalThis.MAT_DIRECTORY.chooseDirectory();
      const result = await globalThis.MAT_DIRECTORY.writeFiles(handle, packageData.files, folderName);
      state.directoryHandle = handle;
      await appendAuditEvent({ eventType: 'evidence.exported', result: 'success', counts: { events: events.length, files: result.written.length }, message: `Evidências salvas na pasta ${result.directoryName}.` });
      toast(`Evidências salvas em ${result.directoryName}.`);
    } else {
      const filename = `evidencias_assistente_ead_${new Date().toISOString().slice(0, 10)}.zip`;
      await globalThis.MAT_AUDIT_EXPORT.downloadZip(packageData.files, filename);
      await appendAuditEvent({ eventType: 'evidence.exported', result: 'success', counts: { events: events.length, files: packageData.files.length }, message: `${filename} baixado.` });
      toast('Pacote de evidências baixado com sucesso.');
    }
    renderView();
  } catch (error) {
    if (error?.name === 'AbortError') return toast('A escolha da pasta foi cancelada.');
    await appendAuditEvent({ eventType: 'error.operational', result: 'error', source: 'audit-export', message: error?.message || 'Falha ao exportar evidências.' }).catch(() => {});
    toast(error?.message || 'Não foi possível exportar as evidências.', 'error');
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

async function handleAuditAction(action, button) {
  if (action === 'choose-directory') {
    try { state.directoryHandle = await globalThis.MAT_DIRECTORY.chooseDirectory(); toast(`Pasta ${state.directoryHandle.name} selecionada.`); renderView(); }
    catch (error) { if (error?.name !== 'AbortError') toast(error?.message || 'Não foi possível selecionar a pasta.', 'error'); }
    return;
  }
  if (action === 'export-directory') return exportEvidence('directory', button);
  if (action === 'download-zip') return exportEvidence('download', button);
}

async function saveSnapshot() {
  const courses = state.payload.courses;
  const snapshot = { generatedAt: state.payload.generatedAt || new Date().toISOString(), courseCount: courses.length, currentCount: courses.filter((course) => course.vigency === 'current').length, pendingCount: sum(courses, 'totalPending'), partial: Boolean(state.payload.inventoryPartial) };
  if (!state.history.some((item) => item.generatedAt === snapshot.generatedAt)) {
    state.history = [snapshot, ...state.history].slice(0,24);
    await chrome.storage.local.set({ [HISTORY_KEY]: state.history });
    await appendAuditEvent({ eventType: snapshot.partial ? 'analysis.partial' : 'analysis.completed', createdAt: snapshot.generatedAt, result: snapshot.partial ? 'partial' : 'success', source: 'course-inventory', counts: { courses: snapshot.courseCount, current: snapshot.currentCount, pending: snapshot.pendingCount }, message: snapshot.partial ? 'Inventário agregado atualizado parcialmente.' : 'Inventário agregado atualizado.' });
  }
}

function legacyEvents(data) {
  return Object.entries(data).filter(([key, value]) => key.startsWith('mat_') && key.endsWith('_actions') && Array.isArray(value)).flatMap(([, actions]) => actions.map((action) => ({ schemaVersion: 1, eventId: `legacy_${action.id || Math.random().toString(36).slice(2)}`, eventType: action.type === 'conferencia_lote' ? 'grade.verify.completed' : action.type === 'comunicacao' ? 'message.opened' : 'action.recorded', createdAt: action.createdAt || new Date(0).toISOString(), extensionVersion: '3.6.8', environment: '', courseId: '', courseName: '', ucName: '', activityId: '', activityName: '', result: action.status === 'erro' ? 'error' : 'success', counts: {}, source: action.type || 'legacy-history', message: action.title || 'Ação migrada do histórico anterior.' })));
}

async function initialize() {
  const data = await chrome.storage.local.get(null);
  state.payload = data[DASHBOARD_KEY] || { courses: [], generatedAt: null, inventoryPartial: true };
  state.academicData = Object.fromEntries(Object.entries(data).filter(([key]) => /_(snapshot|gradebook|actions|checklist)$/.test(key)));
  state.history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
  const currentAudit = Array.isArray(data[AUDIT_KEY]) ? data[AUDIT_KEY] : [];
  const migrated = legacyEvents(data).filter((event) => !currentAudit.some((item) => item.eventId === event.eventId));
  state.auditEvents = [...currentAudit, ...migrated].sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)).slice(0, 2000);
  state.filteredAudit = [...state.auditEvents];
  state.filtered = state.payload.courses;
  document.documentElement.dataset.theme = data[THEME_KEY] || 'light';
  document.documentElement.dataset.nav = data[NAV_KEY] || 'compact';
  $('nav-toggle').setAttribute('aria-expanded', String(document.documentElement.dataset.nav === 'expanded'));
  $('nav-toggle').setAttribute('aria-label', document.documentElement.dataset.nav === 'expanded' ? 'Recolher menu' : 'Expandir menu');
  $('generated-at').textContent = state.payload.generatedAt ? `Dados atualizados em ${formatDateTime(state.payload.generatedAt)}` : 'Nenhum dado agregado foi recebido.';
  $('partial-warning').hidden = !state.payload.inventoryPartial;
  $('nav-pending-count').textContent = String(sum(state.payload.courses, 'totalPending'));
  [...new Set(state.payload.courses.map((course) => course.environment).filter(Boolean))].sort().forEach((value) => { const option = document.createElement('option'); option.value = value; option.textContent = value; $('filter-environment').appendChild(option); });
  ['filter-environment', 'filter-vigency', 'filter-status'].forEach((id) => $(id).addEventListener('change', applyFilters));
  $('filter-search').addEventListener('input', applyFilters);
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $('nav-toggle').addEventListener('click', async () => { const nav = document.documentElement.dataset.nav === 'expanded' ? 'compact' : 'expanded'; document.documentElement.dataset.nav = nav; $('nav-toggle').setAttribute('aria-expanded', String(nav === 'expanded')); $('nav-toggle').setAttribute('aria-label', nav === 'expanded' ? 'Recolher menu' : 'Expandir menu'); await chrome.storage.local.set({ [NAV_KEY]: nav }); });
  $('theme-toggle').addEventListener('click', async () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; await chrome.storage.local.set({ [THEME_KEY]: theme }); });
  $('refresh-source').addEventListener('click', () => { const host = state.payload.courses.find((course) => course.environment)?.environment; if (host) window.open(`https://${host}/my/`, '_blank', 'noopener'); else toast('Nenhum ambiente Moodle foi identificado.', 'error'); });
  try { state.directoryHandle = await globalThis.MAT_DIRECTORY.loadHandle(); } catch (error) { state.directoryHandle = null; }
  await chrome.storage.local.set({ [AUDIT_KEY]: state.auditEvents });
  await saveSnapshot();
  renderView();
}

initialize().catch((error) => { $('view-root').innerHTML = `<p class="notice warning" role="alert">Não foi possível abrir a Central de Gestão: ${escapeHtml(error?.message || error)}</p>`; });
