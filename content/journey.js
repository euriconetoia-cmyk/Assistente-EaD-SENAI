'use strict';

(() => {
  const MAT = globalThis.MAT;
  const steps = [
    { id: 'analisar', title: 'Analisar', detail: 'Confira curso, UC, horário e qualidade da leitura.', tab: 'hoje' },
    { id: 'corrigir', title: 'Corrigir', detail: 'Baixe os envios e confira o enunciado antes de avaliar.', tab: 'correcoes' },
    { id: 'acompanhar', title: 'Acompanhar', detail: 'Veja motivos de atenção e registre o contato com o aluno.', tab: 'alunos' },
    { id: 'lancar', title: 'Revisar e lançar', detail: 'Confira associação, nota máxima, nota e feedback antes de salvar.', tab: 'correcoes' },
    { id: 'confirmar', title: 'Confirmar', detail: 'A nota e o feedback precisam ser verificados no Moodle.', tab: 'correcoes' },
    { id: 'arquivar', title: 'Arquivar', detail: 'Exporte as evidências disponíveis na Auditoria.', tab: 'historico' }
  ];

  const taskOrder = { conferencia_lote: 0, fechamento: 1, correcao: 2, aluno: 3, verificacao: 4 };
  const riskOrder = { imediato: 0, alto: 1, atencao: 2, regular: 3 };
  const verifiedOutcome = (action) => action.outcome === 'sucesso' || action.status === 'conferida_manualmente';

  const buildQueue = (snapshot, actions = []) => {
    if (!snapshot) return [];
    const latestByActivity = new Map();
    for (const action of actions) {
      if (action?.type !== 'conferencia_atividade' || !action.assignmentId) continue;
      const key = String(action.assignmentId);
      const previous = latestByActivity.get(key);
      if (!previous || Date.parse(action.updatedAt || action.createdAt || '') > Date.parse(previous.updatedAt || previous.createdAt || '')) latestByActivity.set(key, action);
    }
    const assignments = snapshot.activityPanorama?.assignments || snapshot.assignments || [];
    const verifications = [...latestByActivity.values()].filter((action) => !verifiedOutcome(action)).map((action) => {
      const assignment = assignments.find((item) => String(item.cmid) === String(action.assignmentId));
      return {
        id: `batch_verify_${action.assignmentId}`,
        type: 'conferencia_lote',
        priority: 'imediato',
        title: `Conferir lançamento em ${action.activityName || assignment?.name || `atividade ${action.assignmentId}`}`,
        description: action.outcome === 'divergente' ? 'Divergência na releitura de nota ou feedback. Confira no Moodle.' : 'Nota, feedback ou salvamento ainda não confirmado. Confira no Moodle.',
        action: 'Conferir nota e feedback no Moodle',
        assignmentId: String(action.assignmentId),
        actionId: action.id,
        url: assignment?.gradingUrl || assignment?.url || '',
        source: 'Conferência após o lote',
        collectedAt: action.createdAt || '',
        step: 'confirmar'
      };
    });
    const closingHasPending = assignments.some((assignment) => assignment.metrics?.pendingKnown && assignment.metrics.pending > 0)
      || snapshot.meta?.mode === 'complete' && (snapshot.students || []).some((student) => student.missingAssignments > 0);
    const tasks = (snapshot.tasks || []).map((task) => ({
      ...task,
      priority: task.type === 'fechamento' && !closingHasPending ? 'regular' : task.priority,
      source: task.type === 'aluno' ? 'Análise individual' : task.type === 'fechamento' ? 'Data da UC' : 'Leitura da atividade',
      collectedAt: snapshot.meta?.collectedAt || '',
      step: task.type === 'aluno' ? 'acompanhar' : task.type === 'fechamento' ? 'confirmar' : task.type === 'correcao' ? 'corrigir' : 'analisar',
      dueDays: task.type === 'correcao' ? assignments.find((item) => String(item.cmid) === String(task.assignmentId))?.daysUntilDue : null
    }));
    const unique = new Map();
    for (const task of [...verifications, ...tasks]) if (!unique.has(task.id)) unique.set(task.id, task);
    return [...unique.values()].sort((left, right) => {
      const order = (task) => task.type === 'fechamento' && !closingHasPending ? 5 : taskOrder[task.type] ?? 6;
      const group = order(left) - order(right);
      if (group) return group;
      const due = (Number.isFinite(left.dueDays) ? left.dueDays : Infinity) - (Number.isFinite(right.dueDays) ? right.dueDays : Infinity);
      if (!Number.isNaN(due) && due !== 0) return due;
      return (riskOrder[left.priority] ?? 4) - (riskOrder[right.priority] ?? 4) || left.title.localeCompare(right.title, 'pt-BR');
    });
  };

  MAT.journey = { steps, buildQueue };
})();
