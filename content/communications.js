'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;

  const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
  const normalizeBrazilPhone = (value) => {
    let digits = digitsOnly(value);
    if (digits.startsWith('00')) digits = digits.slice(2);
    if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) digits = `55${digits}`;
    return digits.length >= 12 && digits.length <= 13 ? digits : '';
  };

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

  const extractPhoneFromProfile = async (student, timeoutMs = MAT.state.settings?.requestTimeoutMs || 18000) => {
    if (!student.profileUrl || !U.isAllowedMoodleUrl(student.profileUrl)) return '';
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(student.profileUrl, { credentials: 'include', signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok || !U.isAllowedMoodleUrl(response.url)) return '';
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const tel = doc.querySelector('a[href^="tel:"]')?.getAttribute('href')?.replace(/^tel:/i, '');
      if (normalizeBrazilPhone(tel)) return normalizeBrazilPhone(tel);
      const labels = [...doc.querySelectorAll('dt, th, .profilefield, .field-label, .label')];
      for (const label of labels) {
        if (!/telefone|celular|phone|mobile|whatsapp/i.test(U.cleanText(label.textContent))) continue;
        const value = label.nextElementSibling?.textContent || label.parentElement?.textContent || '';
        const match = value.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/);
        if (match && normalizeBrazilPhone(match[0])) return normalizeBrazilPhone(match[0]);
      }
      const bodyMatch = U.cleanText(doc.body?.textContent || '').match(/(?:telefone|celular|whatsapp|mobile)[^0-9+]{0,30}((?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4})/i);
      return bodyMatch ? normalizeBrazilPhone(bodyMatch[1]) : '';
    } catch (_) {
      clearTimeout(timeout);
      return '';
    }
  };

  const openWhatsAppForStudent = async (studentKey, { toast, openUrl, renderHistory, askPhone = prompt } = {}) => {
    const state = MAT.state;
    const student = state.snapshot?.students.find((item) => item.key === studentKey);
    if (!student) return toast?.('Aluno não encontrado.');
    const saved = await MAT.storage.loadStudentCommunication(student.key, state.course.id);
    let phone = normalizeBrazilPhone(saved.phone) || await extractPhoneFromProfile(student);
    if (!phone) {
      const informed = askPhone(`O telefone de ${student.name} nao foi localizado no Moodle. Informe DDD e numero para abrir o WhatsApp:`, saved.phone || '');
      if (informed === null) return;
      phone = normalizeBrazilPhone(informed);
      if (!phone) return toast?.('Telefone inválido. Informe DDD e número.');
    }
    await MAT.storage.saveStudentCommunication(student.key, { phone }, state.course.id);
    const message = buildStudentPendingMessage(student, state);
    openUrl?.(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    await MAT.storage.addAction({ title: 'Mensagem preparada no WhatsApp', type: 'comunicacao', status: 'preparada', note: message, studentKey: student.key, studentName: student.name, channel: 'WhatsApp' }, state.course.id);
    state.actions = await MAT.storage.loadActions(state.course.id);
    renderHistory?.();
  };

  const openMoodleMessageForStudent = async (studentKey, { toast, openUrl, renderHistory } = {}) => {
    const state = MAT.state;
    const student = state.snapshot?.students.find((item) => item.key === studentKey);
    if (!student) return toast?.('Aluno não encontrado.');
    if (!student.id) return toast?.('O identificador do aluno não foi reconhecido. Abra o perfil e tente novamente.');
    const message = buildStudentPendingMessage(student, state);
    await MAT.storage.saveMoodleMessageDraft({ host: location.hostname, studentId: student.id, studentName: student.name, message }, state.course.id);
    openUrl?.(`${location.origin}/message/index.php?id=${encodeURIComponent(student.id)}`);
    await MAT.storage.addAction({ title: 'Mensagem preparada no Moodle', type: 'comunicacao', status: 'preparada', note: message, studentKey: student.key, studentName: student.name, channel: 'Moodle' }, state.course.id);
    state.actions = await MAT.storage.loadActions(state.course.id);
    renderHistory?.();
    toast?.('A conversa será aberta e a mensagem será preenchida. Revise antes de enviar.');
  };

  MAT.communications = { normalizeBrazilPhone, buildStudentPendingMessage, extractPhoneFromProfile, openWhatsAppForStudent, openMoodleMessageForStudent };
})();
