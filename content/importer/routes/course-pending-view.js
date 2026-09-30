(() => {
  'use strict';
  globalThis.MAT = globalThis.MAT || {};
  globalThis.MAT.importerViews = globalThis.MAT.importerViews || {};
  globalThis.MAT.importerViews.coursePendingSummary = `
    <span class="mqi-course-pending-summary__icon" aria-hidden="true">✓</span>
    <span class="mqi-course-pending-summary__text" role="status" aria-live="polite">Atualize as contagens quando precisar consultar atividades.</span>
    <span class="mqi-course-pending-summary__actions"><button type="button" class="mqi-course-pending-summary__import" title="Importar notas e feedbacks de um arquivo CSV" aria-label="Importar notas e feedbacks">Importar notas</button><button type="button" class="mqi-course-pending-summary__refresh" title="Atualizar contagens" aria-label="Atualizar contagens"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button></span>`;
  globalThis.MAT.importerViews.pendingBadgePresentation = ({ state, count, name, message }) => {
    if (state === 'pending') return { text: count > 99 ? '99+' : String(count), title: `${count} ${count === 1 ? 'envio precisa' : 'envios precisam'} de avaliação em ${name}`, pending: true };
    if (state === 'verify') return { text: '?', title: message || `O resumo de ${name} informa zero pendências, mas exige conferência individual` };
    if (state === 'error') return { text: '!', title: message || `Não foi possível consultar ${name}` };
    if (state === 'empty') return { text: '✓', title: `${name}: consulta concluída, nenhuma correção pendente confirmada.`, accessible: true };
    return { text: '…', title: `Consultando correções pendentes de ${name}` };
  };
})();
