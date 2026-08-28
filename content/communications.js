'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;

  const buildStudentPendingMessage = (student, state = MAT.state) => {
    const firstName = U.cleanText(student.name || '').split(/\s+/)[0] || 'aluno(a)';
    const courseName = state.snapshot?.course?.name || state.course?.name || 'curso';
    const ucName = state.snapshot?.course?.activeUcName || state.settings?.activeUcName || 'unidade curricular atual';
    const pending = [];
    const missingNames = (student.assignments || []).filter((item) => item.missing).map((item) => item.name).slice(0, 5);
    if (missingNames.length) pending.push(`${missingNames.length} ${missingNames.length === 1 ? 'atividade sem entrega' : 'atividades sem entrega'}: ${missingNames.join(', ')}`);
    else if (Number(student.missingAssignments) > 0) pending.push(`${student.missingAssignments} ${Number(student.missingAssignments) === 1 ? 'atividade ainda está sem entrega' : 'atividades ainda estão sem entrega'}`);
    if (student.lastAccessDays !== null && student.lastAccessDays !== undefined && student.lastAccessDays >= (state.settings?.noAccessAttentionDays || 7)) pending.push(`${student.lastAccessDays} dias sem acesso recente ao AVA`);
    if (student.gradeTotal !== null && Number(student.gradeTotal) < (state.settings?.minimumGrade || 60)) pending.push('a nota atual está abaixo da média mínima');
    const summary = pending.length ? pending.join('; ') : (student.recommendedAction || 'há uma situação acadêmica que precisa de conferência');
    return `Olá, ${firstName}, tudo bem? Ao acompanhar sua participação no curso ${courseName}, identifiquei a seguinte pendência na ${ucName}: ${summary}. Acesse o AVA para verificar e regularizar a situação. Caso tenha alguma dificuldade, responda esta mensagem para que possamos orientar você.`;
  };

  const openMoodleMessageForStudent = async (studentKey, { toast, openUrl, renderHistory, message: editedMessage } = {}) => {
    const state = MAT.state;
    const student = state.snapshot?.students.find((item) => item.key === studentKey);
    if (!student) return toast?.('Aluno não encontrado.');
    if (!student.id) return toast?.('O identificador do aluno não foi reconhecido. Abra o perfil e tente novamente.');
    const message = String(editedMessage ?? buildStudentPendingMessage(student, state)).trim();
    if (!message) return toast?.('Escreva a mensagem antes de enviar.');
    await MAT.storage.saveMoodleMessageDraft({ host: location.hostname, studentId: student.id, studentName: student.name, message }, state.course.id);
    openUrl?.(`${location.origin}/message/index.php?id=${encodeURIComponent(student.id)}`);
    await MAT.storage.addAction({ title: 'Mensagem preparada no Moodle', type: 'comunicacao', status: 'preparada', note: message, studentKey: student.key, studentName: student.name, channel: 'Moodle' }, state.course.id);
    state.actions = await MAT.storage.loadActions(state.course.id);
    renderHistory?.();
    toast?.('A conversa será aberta no AVA com a mensagem revisada. Confirme o envio no Moodle.');
  };

  MAT.communications = { buildStudentPendingMessage, openMoodleMessageForStudent };
})();
