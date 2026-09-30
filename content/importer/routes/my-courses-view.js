(() => {
  'use strict';
  globalThis.MAT = globalThis.MAT || {};
  globalThis.MAT.importerViews = globalThis.MAT.importerViews || {};
  globalThis.MAT.importerViews.myCoursesPanel = `
    <div class="mqi-my-courses-head">
      <div><h2 id="mqi-my-courses-title">Visão geral das turmas</h2><p id="mqi-my-courses-status" role="status" aria-live="polite">Identificando os cursos vinculados ao seu usuário…</p></div>
      <div class="mqi-my-courses-actions"><button type="button" id="mqi-my-courses-refresh">Atualizar análise</button><button type="button" id="mqi-my-courses-dashboard-open" disabled>Abrir dashboard</button><button type="button" id="mqi-my-courses-calendar">Mostrar calendário</button><button type="button" id="mqi-my-courses-export" disabled>Exportar CSV</button></div>
    </div>
    <div class="mqi-my-courses-metrics" id="mqi-my-courses-metrics"></div>
    <section class="mqi-my-courses-calendar" id="mqi-my-courses-calendar-panel" hidden><h3>Calendário de futuras turmas e UCs</h3><div id="mqi-my-courses-calendar-body"></div></section>
    <div class="mqi-my-courses-table-wrap"><table class="mqi-my-courses-table"><thead><tr><th>Turma</th><th>UC ou curso</th><th>Vigência</th><th>Período</th><th>Pendências</th><th>Leitura</th></tr></thead><tbody id="mqi-my-courses-body"><tr><td colspan="6">Carregando…</td></tr></tbody></table></div>`;
  globalThis.MAT.importerViews.renderMyCoursesRows = ({ courses, results, escapeHtml, vigencyLabel, formatDate }) => courses.map(course => {
    const result = results.get(course.courseId);
    const pending = result ? result.totalPending : null;
    const reading = !result ? 'Aguardando' : result.errors > 0 ? 'Parcial' : result.unverified > 0 ? 'Conferir' : 'Concluída';
    const rowClass = pending > 0 ? 'has-pending' : reading !== 'Concluída' ? 'needs-review' : '';
    return `<tr class="${rowClass}"><td data-label="Turma">${escapeHtml(course.groupName || 'Turma não identificada')}</td><td data-label="UC ou curso"><a href="${escapeHtml(course.link.href)}">${escapeHtml(course.name)}</a><div>Curso ${escapeHtml(course.courseId)}</div></td><td data-label="Vigência">${escapeHtml(vigencyLabel(course.vigency))}</td><td data-label="Período">${escapeHtml(formatDate(course.availability?.startsAt))} a ${escapeHtml(formatDate(course.availability?.endsAt))}</td><td data-label="Pendências"><strong>${pending === null ? 'Consultando' : pending}</strong></td><td data-label="Leitura">${escapeHtml(reading)}</td></tr>`;
  }).join('') || '<tr><td colspan="6">Nenhum curso foi identificado nesta página.</td></tr>';
  globalThis.MAT.importerViews.renderFutureCourses = ({ courses, escapeHtml, formatDate }) => courses.length ? courses.map(course => `<article class="mqi-calendar-item"><time datetime="${new Date(course.availability.startsAt).toISOString()}"><strong>${escapeHtml(formatDate(course.availability.startsAt))}</strong>${Number.isFinite(course.availability?.endsAt) ? ` a ${escapeHtml(formatDate(course.availability.endsAt))}` : ''}</time><div><strong>${escapeHtml(course.name)}</strong><span>${escapeHtml(course.groupName || 'Turma não identificada')}</span></div><a href="${escapeHtml(course.link.href)}">Abrir</a></article>`).join('') : '<p>Nenhuma turma ou UC futura com data de início reconhecida.</p>';
  globalThis.MAT.importerViews.renderMyCoursesMetrics = ({ total, current, pending, coursesWithPending, incomplete }) => `<span><strong>${total}</strong> cursos</span><span><strong>${current}</strong> UCs atuais</span><span class="${pending > 0 ? 'is-danger' : ''}"><strong>${pending}</strong> pendências</span><span><strong>${coursesWithPending}</strong> cursos com ação</span><span><strong>${incomplete}</strong> leituras incompletas</span>`;
  globalThis.MAT.importerViews.myCoursesStatus = ({ running, completed, total, partial, completedAt }) => running
    ? `Analisando ${completed} de ${total} curso(s)…`
    : `${total} curso(s) identificado(s)${partial ? ', com inventário possivelmente parcial' : ''}. Última atualização: ${completedAt ? new Date(completedAt).toLocaleString('pt-BR') : 'em andamento'}.`;
})();
