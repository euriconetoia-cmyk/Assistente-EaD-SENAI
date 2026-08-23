'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;

  const riskRank = { imediato: 4, alto: 3, atencao: 2, regular: 1 };

  const classifyStudent = (student, settings, course) => {
    const reasons = [];
    let score = 0;

    if (student.lastAccessDays !== null) {
      if (student.lastAccessDays >= settings.noAccessImmediateDays) {
        score += 5;
        reasons.push({ code: 'no_access_immediate', severity: 4, text: `${U.formatRelativeDays(student.lastAccessDays)} no Moodle` });
      } else if (student.lastAccessDays >= settings.noAccessHighDays) {
        score += 4;
        reasons.push({ code: 'no_access_high', severity: 3, text: `${U.formatRelativeDays(student.lastAccessDays)} no Moodle` });
      } else if (student.lastAccessDays >= settings.noAccessAttentionDays) {
        score += 2;
        reasons.push({ code: 'no_access_attention', severity: 2, text: `${U.formatRelativeDays(student.lastAccessDays)} no Moodle` });
      }
    }

    if (student.missingAssignments >= 3) {
      score += 5;
      reasons.push({ code: 'missing_many', severity: 4, text: `${student.missingAssignments} atividades sem entrega` });
    } else if (student.missingAssignments === 2) {
      score += 3;
      reasons.push({ code: 'missing_two', severity: 3, text: '2 atividades sem entrega' });
    } else if (student.missingAssignments === 1) {
      score += 2;
      reasons.push({ code: 'missing_one', severity: 2, text: '1 atividade sem entrega' });
    }

    if (student.gradeTotal !== null) {
      if (student.gradeTotal < settings.recoveryMin) {
        score += 4;
        reasons.push({ code: 'grade_below_recovery', severity: 4, text: `Nota ${student.gradeTotal} abaixo de ${settings.recoveryMin}` });
      } else if (student.gradeTotal >= settings.recoveryMin && student.gradeTotal <= settings.recoveryMax) {
        score += 4;
        reasons.push({ code: 'recovery_range', severity: 3, text: `Nota ${student.gradeTotal} na faixa de recuperação` });
      } else if (student.gradeTotal < settings.minimumGrade) {
        score += 2;
        reasons.push({ code: 'below_minimum', severity: 2, text: `Nota ${student.gradeTotal} abaixo da média ${settings.minimumGrade}` });
      }
    }

    if (student.pendingGrading > 0) {
      reasons.push({ code: 'pending_grading', severity: 1, text: `${student.pendingGrading} entrega(s) aguardando correção` });
    }

    const ucEnd = course.activeUcEndDate ? new Date(`${course.activeUcEndDate}T23:59:59`) : null;
    const closingDays = ucEnd && !Number.isNaN(ucEnd.getTime()) ? U.daysUntil(ucEnd) : null;
    if (closingDays !== null && closingDays <= settings.closingWarningDays && closingDays >= 0 && (student.missingAssignments > 0 || student.gradeTotal !== null && student.gradeTotal < settings.minimumGrade)) {
      score += 2;
      reasons.push({ code: 'closing_with_pending', severity: 3, text: `UC encerra em ${closingDays} dia(s) com pendências` });
    }

    let level = 'regular';
    if (score >= 8) level = 'imediato';
    else if (score >= 4) level = 'alto';
    else if (score >= 2) level = 'atencao';

    const action = recommendAction({ ...student, reasons, riskLevel: level }, settings, closingDays);
    return { ...student, riskScore: score, riskLevel: level, riskReasons: reasons.sort((a, b) => b.severity - a.severity), recommendedAction: action };
  };

  const recommendAction = (student, settings, closingDays) => {
    const codes = new Set(student.reasons?.map((reason) => reason.code) || student.riskReasons?.map((reason) => reason.code) || []);
    if (codes.has('closing_with_pending')) return 'Contato imediato, orientar a regularização e registrar encaminhamento antes do fechamento da UC.';
    if (codes.has('no_access_immediate') || codes.has('missing_many')) return 'Realizar busca ativa, verificar dificuldade de acesso e registrar retorno ou escalonamento.';
    if (codes.has('grade_below_recovery')) return 'Conferir evidências, orientar o aluno e avaliar encaminhamento conforme as regras acadêmicas.';
    if (codes.has('recovery_range') || codes.has('below_minimum')) return 'Conferir notas e entregas, orientar sobre recuperação e registrar a comunicação.';
    if (codes.has('missing_two') || codes.has('missing_one')) return 'Enviar lembrete da atividade, confirmar prazo e registrar a tentativa de contato.';
    if (codes.has('no_access_high') || codes.has('no_access_attention')) return 'Enviar mensagem de acompanhamento e confirmar se o aluno consegue acessar o curso.';
    if (student.pendingGrading > 0) return 'Concluir a correção e publicar nota e feedback.';
    if (closingDays !== null && closingDays <= settings.closingWarningDays) return 'Conferir o checklist de fechamento da UC.';
    return 'Manter acompanhamento regular.';
  };

  const matchesSectionName = (candidate, activeName) => {
    const left = U.normalizeText(candidate || '');
    const right = U.normalizeText(activeName || '');
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  };

  const selectUcScope = (snapshot) => {
    const sections = snapshot.course?.sections || [];
    const activeId = String(snapshot.course?.activeUcSectionId || '');
    const activeName = snapshot.course?.activeUcName || '';
    let section = null;

    if (activeId) section = sections.find((item) => String(item.id) === activeId) || null;
    if (!section && activeName) section = sections.find((item) => matchesSectionName(item.name, activeName)) || null;

    let assignments = snapshot.assignments || [];
    let mode = 'course';
    let warning = '';

    if (section) {
      const scoped = assignments.filter((assignment) => String(assignment.sectionId || '') === String(section.id) || matchesSectionName(assignment.sectionName, section.name));
      if (scoped.length || assignments.length === 0) {
        assignments = scoped;
        mode = 'section';
      } else {
        mode = 'fallback';
        warning = 'As tarefas do retrato salvo ainda não possuem vínculo com a seção. Atualize a análise para calcular o panorama apenas desta UC. Até lá, são exibidas todas as tarefas coletadas no curso.';
      }
    } else if (activeId || activeName) {
      const scoped = assignments.filter((assignment) => String(assignment.sectionId || '') === activeId || matchesSectionName(assignment.sectionName, activeName));
      if (scoped.length) {
        assignments = scoped;
        mode = 'name';
      } else {
        mode = 'fallback';
        warning = 'A UC configurada não foi associada a uma seção reconhecida. O panorama está mostrando todas as tarefas coletadas no curso.';
      }
    }

    const inventory = section?.activities?.length
      ? section.activities
      : mode === 'course' || mode === 'fallback'
        ? sections.flatMap((item) => item.activities || [])
        : assignments.map((assignment) => ({
          id: `cmid:${assignment.cmid}`,
          cmid: assignment.cmid,
          name: assignment.name,
          moduleType: 'assign',
          typeLabel: 'Tarefa',
          url: assignment.url,
          isAssignment: true
        }));

    return {
      mode,
      warning,
      section,
      label: section?.name || activeName || 'Curso completo',
      assignments,
      inventory
    };
  };

  const calculateAssignmentMetrics = (assignment, defaultStudents = 0) => {
    const rows = assignment.gradingRows || [];
    const hasRows = rows.length > 0;
    const verification = assignment.gradingVerification || {};
    const rowPending = rows.filter((row) => row.requiresGrading || row.submitted && !row.graded).length;
    // A nota só é uma correção de entrega quando há envio confirmado. Alguns temas
    // exibem 0 no campo de nota mesmo para a linha marcada como "sem entrega".
    const rowDelivered = rows.filter((row) => row.submitted && !row.missing).length;
    const rowCorrected = rows.filter((row) => row.submitted && !row.missing && row.graded).length;
    const rowMissing = rows.filter((row) => row.missing).length;
    const rowUnknown = rows.filter((row) => row.unknown).length;

    const activityParticipants = Number.isFinite(assignment.participants) ? assignment.participants : null;
    const expectedCandidates = [
      activityParticipants,
      hasRows ? rows.length : null,
      activityParticipants === null && defaultStudents > 0 ? defaultStudents : null
    ].filter((value) => value !== null);
    const deliveredCandidates = [
      hasRows ? rowDelivered : null,
      Number.isFinite(assignment.submitted) ? assignment.submitted : null
    ].filter((value) => value !== null);
    const pendingCandidates = [
      hasRows ? rowPending : null,
      Number.isFinite(assignment.needsGrading) ? assignment.needsGrading : null
    ].filter((value) => value !== null);

    let expected = expectedCandidates.length ? Math.max(...expectedCandidates) : null;
    let delivered = deliveredCandidates.length ? Math.max(...deliveredCandidates) : null;
    let pending = pendingCandidates.length ? Math.max(...pendingCandidates) : null;
    let missing = hasRows ? rowMissing : Number.isFinite(expected) && Number.isFinite(delivered) ? Math.max(0, expected - delivered) : null;

    if (Number.isFinite(expected)) expected = Math.max(0, expected);
    if (Number.isFinite(delivered)) delivered = Math.max(0, Number.isFinite(expected) ? Math.min(expected, delivered) : delivered);
    if (Number.isFinite(pending)) pending = Math.max(0, Number.isFinite(delivered) ? Math.min(delivered, pending) : pending);
    if (Number.isFinite(missing)) missing = Math.max(0, missing, Number.isFinite(expected) && Number.isFinite(delivered) ? expected - delivered : 0);

    const inferredCoverageComplete = hasRows && rowUnknown === 0 && (expected === 0 || rows.length >= expected);
    const pendingKnown = Boolean(
      verification.confirmedPending
      || verification.confirmedZero
      || (!assignment.gradingVerification && inferredCoverageComplete)
    );
    const confirmedZero = Boolean(verification.confirmedZero || (!assignment.gradingVerification && inferredCoverageComplete && pending === 0));
    const coverageComplete = Boolean(verification.rowCoverageComplete || inferredCoverageComplete);
    if (hasRows && coverageComplete) {
      // Linhas individuais completas prevalecem sobre totais do resumo Moodle.
      // Isso evita que um total estrutural de participantes vire entrega realizada.
      delivered = rowDelivered;
      missing = Math.max(rowMissing, Number.isFinite(expected) ? expected - delivered : 0);
    }
    if (pending === 0 && !pendingKnown) pending = null;
    const summaryPairKnown = Number.isFinite(assignment.submitted) && Number.isFinite(assignment.needsGrading) && pendingKnown;
    let corrected = hasRows ? rowCorrected : null;
    if (summaryPairKnown && (!hasRows || !coverageComplete)) corrected = Math.max(corrected, assignment.submitted - assignment.needsGrading);
    else if (!hasRows && confirmedZero && Number.isFinite(assignment.submitted)) corrected = assignment.submitted;
    if (Number.isFinite(corrected)) corrected = Math.max(0, Number.isFinite(delivered) ? Math.min(delivered, corrected) : corrected);
    const correctedKnown = Boolean(coverageComplete || summaryPairKnown || (!hasRows && confirmedZero && Number.isFinite(assignment.submitted)));
    const deliveryRate = Number.isFinite(expected) && expected > 0 && Number.isFinite(delivered) ? Math.round((delivered / expected) * 100) : null;
    const correctionRate = Number.isFinite(delivered) && delivered > 0 && Number.isFinite(corrected) ? Math.round((corrected / delivered) * 100) : null;
    const allDelivered = Number.isFinite(expected) && expected > 0 && Number.isFinite(delivered) && delivered >= expected;
    const noPendingGrading = confirmedZero;
    const complete = allDelivered && noPendingGrading && coverageComplete;
    const sourceParts = [];
    if (hasRows) sourceParts.push('tabela de avaliação');
    if (Number.isFinite(assignment.needsGrading) || Number.isFinite(assignment.submitted)) sourceParts.push('resumo da atividade');
    const source = sourceParts.length ? sourceParts.join(' + ') : 'dados insuficientes';

    let status = 'Sem dados';
    let statusLevel = 'atencao';
    if (assignment.gradingCollectionStatus === 'erro' || assignment.collectionStatus === 'erro') {
      status = 'Falha de leitura';
      statusLevel = 'imediato';
    } else if (pending > 0) {
      status = verification.hasConflict ? 'Pendência confirmada com divergência' : 'Correção pendente';
      statusLevel = 'alto';
    } else if (!pendingKnown) {
      status = 'Correção não confirmada';
      statusLevel = 'imediato';
    } else if (delivered === 0 && expected > 0) {
      status = 'Sem entregas';
      statusLevel = 'imediato';
    } else if (missing > 0) {
      status = 'Entregas incompletas';
      statusLevel = 'atencao';
    } else if (complete) {
      status = 'Concluída';
      statusLevel = 'regular';
    } else if (delivered > 0 && confirmedZero) {
      status = 'Correções confirmadas';
      statusLevel = 'regular';
    }

    return {
      expected,
      delivered,
      corrected,
      pending,
      missing,
      deliveryRate,
      correctionRate,
      allDelivered,
      noPendingGrading,
      pendingKnown,
      confirmedZero,
      coverageComplete,
      complete,
      status,
      statusLevel,
      source,
      exact: pendingKnown && coverageComplete && correctedKnown,
      correctedKnown,
      confidence: verification.confidence || (coverageComplete ? 'alta' : 'insuficiente'),
      verificationStatus: verification.status || (pendingKnown ? 'confirmado_por_tabela' : 'nao_confirmado'),
      pendingDisplay: pending > 0 || pendingKnown ? String(pending ?? 0) : 'Verificar',
      correctedDisplay: correctedKnown ? String(corrected ?? 0) : corrected > 0 ? `≥${corrected}` : 'Verificar'
    };
  };

  const buildActivityPanorama = (snapshot) => {
    const scope = selectUcScope(snapshot);
    const defaultStudents = (snapshot.participants || []).filter((participant) => !/tutor|professor|teacher|instrutor|monitor|coordenador|manager|gestor|administrador/i.test(participant.role || '')).length;
    const assignments = scope.assignments.map((assignment) => ({
      ...assignment,
      metrics: calculateAssignmentMetrics(assignment, defaultStudents)
    }));

    const sum = (key) => {
      const values = assignments.map((assignment) => assignment.metrics[key]);
      return values.length && values.every(Number.isFinite) ? values.reduce((total, value) => total + value, 0) : null;
    };
    const minimumSum = (key) => assignments.reduce((total, assignment) => total + (Number.isFinite(assignment.metrics[key]) ? assignment.metrics[key] : 0), 0);
    const inventoryByTypeMap = new Map();
    scope.inventory.forEach((activity) => {
      const key = activity.typeLabel || activity.moduleType || 'Outro';
      inventoryByTypeMap.set(key, (inventoryByTypeMap.get(key) || 0) + 1);
    });
    const inventoryByType = [...inventoryByTypeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, 'pt-BR'));

    const expectedDeliveries = sum('expected');
    const delivered = sum('delivered');
    const corrected = sum('corrected');
    const pendingGrading = sum('pending');
    const missingDeliveries = sum('missing');
    const unverifiedActivities = assignments.filter((assignment) => !assignment.metrics.pendingKnown).length;
    const partialActivities = assignments.filter((assignment) => !assignment.metrics.coverageComplete).length;
    const allCorrectionsVerified = assignments.length > 0 && unverifiedActivities === 0;
    const correctedCountsVerified = assignments.length > 0 && assignments.every((assignment) => assignment.metrics.correctedKnown);

    return {
      scope,
      assignments,
      inventory: scope.inventory,
      inventoryByType,
      metrics: {
        totalActivities: scope.inventory.length || assignments.length,
        evaluativeActivities: assignments.length,
        expectedDeliveries,
        delivered,
        corrected,
        correctedDisplay: correctedCountsVerified ? String(corrected) : corrected > 0 ? `≥${corrected}` : 'Verificar',
        correctedCountsVerified,
        pendingGrading,
        pendingGradingMinimum: minimumSum('pending'),
        missingDeliveries,
        deliveryRate: Number.isFinite(expectedDeliveries) && expectedDeliveries > 0 && Number.isFinite(delivered) ? Math.round((delivered / expectedDeliveries) * 100) : null,
        correctionRate: Number.isFinite(delivered) && delivered > 0 && Number.isFinite(corrected) ? Math.round((corrected / delivered) * 100) : null,
        activitiesWithPending: assignments.filter((assignment) => assignment.metrics.pending > 0).length,
        activitiesUnverified: unverifiedActivities,
        activitiesPartial: partialActivities,
        allCorrectionsVerified,
        activitiesWithoutDelivery: assignments.filter((assignment) => assignment.metrics.delivered === 0 && assignment.metrics.expected > 0).length,
        activitiesFullyCorrected: assignments.filter((assignment) => assignment.metrics.delivered > 0 && assignment.metrics.confirmedZero).length,
        activitiesComplete: assignments.filter((assignment) => assignment.metrics.complete).length
      },
      dataMode: snapshot.meta?.mode === 'complete' ? 'detalhado' : 'estimado'
    };
  };

  const buildTaskQueue = (snapshot, settings) => {
    const tasks = [];
    const course = snapshot.course;
    const now = Date.now();
    const assignments = snapshot.activityPanorama?.assignments || snapshot.assignments || [];

    assignments.forEach((assignment) => {
      const metrics = assignment.metrics || calculateAssignmentMetrics(assignment, snapshot.summary?.students || 0);
      const pending = metrics.pending;
      if (pending > 0) {
        tasks.push({
          id: `grading_${assignment.cmid}`,
          type: 'correcao',
          priority: assignment.daysUntilDue !== null && assignment.daysUntilDue <= 5 ? 'imediato' : 'alto',
          title: `Corrigir ${pending} entrega(s) em ${assignment.name}`,
          description: assignment.daysUntilDue === null ? 'Pendência confirmada em pelo menos uma fonte.' : `Pendência confirmada. Prazo em ${assignment.daysUntilDue} dia(s).`,
          action: 'Abrir correções',
          url: assignment.gradingUrl || assignment.url,
          assignmentId: assignment.cmid,
          studentKey: null,
          createdAt: new Date(now).toISOString()
        });
      } else if (!metrics.pendingKnown) {
        tasks.push({
          id: `verify_grading_${assignment.cmid}`,
          type: 'verificacao',
          priority: 'alto',
          title: `Conferir correções de ${assignment.name}`,
          description: 'A extensão não obteve evidência suficiente para afirmar que não existem correções pendentes.',
          action: 'Abrir a tela de avaliação e atualizar a análise',
          url: assignment.gradingUrl || assignment.url,
          assignmentId: assignment.cmid,
          studentKey: null,
          createdAt: new Date(now).toISOString()
        });
      }
    });

    snapshot.students.forEach((student) => {
      if (student.riskLevel === 'regular') return;
      tasks.push({
        id: `student_${U.hash(student.key)}`,
        type: 'aluno',
        priority: student.riskLevel,
        title: `Acompanhar ${student.name}`,
        description: student.riskReasons.map((reason) => reason.text).slice(0, 3).join('; '),
        action: student.recommendedAction,
        url: student.profileUrl || '',
        studentKey: student.key,
        createdAt: new Date(now).toISOString()
      });
    });

    const ucEnd = course.activeUcEndDate ? new Date(`${course.activeUcEndDate}T23:59:59`) : null;
    const closingDays = ucEnd && !Number.isNaN(ucEnd.getTime()) ? U.daysUntil(ucEnd) : null;
    if (closingDays !== null && closingDays <= settings.closingWarningDays) {
      tasks.push({
        id: 'closing_uc',
        type: 'fechamento',
        priority: closingDays <= 2 ? 'imediato' : 'alto',
        title: `Preparar fechamento de ${course.activeUcName || 'UC ativa'}`,
        description: closingDays < 0 ? `Prazo encerrado há ${Math.abs(closingDays)} dia(s).` : `Prazo em ${closingDays} dia(s).`,
        action: 'Abrir checklist de fechamento',
        url: course.url,
        createdAt: new Date(now).toISOString()
      });
    }

    return tasks.sort((a, b) => (riskRank[b.priority] || 0) - (riskRank[a.priority] || 0) || a.title.localeCompare(b.title, 'pt-BR'));
  };

  const buildClosing = (snapshot, settings) => {
    const activityMetrics = snapshot.activityPanorama?.metrics || {};
    const pendingGrading = activityMetrics.pendingGrading ?? null;
    const missingStudents = snapshot.students.filter((student) => student.missingAssignments > 0).length;
    const recoveryStudents = snapshot.students.filter((student) => student.gradeTotal !== null && student.gradeTotal >= settings.recoveryMin && student.gradeTotal <= settings.recoveryMax).length;
    const withoutGrade = snapshot.students.filter((student) => student.gradeTotal === null).length;
    const sourcesOk = snapshot.sources.filter((source) => source.status === 'ok').length;
    const assignmentsCount = snapshot.activityPanorama?.assignments?.length || 0;
    const gradebook = snapshot.gradebook || null;
    const gradebookComplete = Boolean(gradebook?.items?.length) && !gradebook?.meta?.partial && gradebook?.status !== 'parcial';

    const autoItems = [
      { id: 'activities_read', label: 'Atividades avaliativas da UC identificadas', done: assignmentsCount > 0, detail: `${assignmentsCount} atividade(s) avaliativa(s)` },
      { id: 'deliveries_read', label: 'Panorama de entregas foi conferido', done: snapshot.meta.mode === 'complete' && assignmentsCount > 0, detail: `${Number.isFinite(activityMetrics.delivered) ? activityMetrics.delivered : 'Verificar'} entregue(s) de ${Number.isFinite(activityMetrics.expectedDeliveries) ? activityMetrics.expectedDeliveries : 'Verificar'} prevista(s)` },
      { id: 'grading_done', label: 'Todas as entregas foram corrigidas', done: activityMetrics.allCorrectionsVerified && pendingGrading === 0 && assignmentsCount > 0, detail: pendingGrading > 0 ? `${pendingGrading} correção(ões) pendente(s)` : activityMetrics.allCorrectionsVerified ? 'Ausência de pendências confirmada' : `${activityMetrics.activitiesUnverified || 0} atividade(s) ainda sem confirmação` },
      { id: 'missing_identified', label: 'Alunos sem entrega foram identificados', done: snapshot.meta.mode === 'complete', detail: `${missingStudents} aluno(s) com pendência` },
      { id: 'recovery_identified', label: 'Alunos na faixa de recuperação foram identificados', done: snapshot.meta.mode === 'complete' && snapshot.grades.length > 0, detail: `${recoveryStudents} aluno(s)` },
      { id: 'grades_checked', label: 'Livro de notas foi consultado integralmente', done: gradebookComplete, detail: gradebookComplete ? 'Consulta concluída' : gradebook?.meta?.partial || gradebook?.status === 'parcial' ? 'Leitura parcial; requer conferência' : 'Livro de notas não reconhecido integralmente' },
      { id: 'final_grades', label: 'Notas finais dos alunos foram reconhecidas', done: gradebookComplete && snapshot.students.length > 0 && withoutGrade === 0, detail: withoutGrade ? `${withoutGrade} aluno(s) sem nota final reconhecida` : gradebookComplete ? 'Notas finais reconhecidas' : 'Depende de leitura completa do livro de notas' },
      { id: 'sources_recorded', label: 'Origem dos dados foi registrada', done: sourcesOk >= 2, detail: `${sourcesOk} fonte(s) consultada(s)` }
    ];

    return {
      autoItems,
      metrics: {
        pendingGrading,
        missingStudents,
        recoveryStudents,
        withoutGrade,
        gradebookComplete,
        delivered: activityMetrics.delivered ?? null,
        corrected: activityMetrics.corrected ?? null,
        expectedDeliveries: activityMetrics.expectedDeliveries ?? null,
        missingDeliveries: activityMetrics.missingDeliveries ?? null,
        activitiesUnverified: activityMetrics.activitiesUnverified || 0,
        allCorrectionsVerified: Boolean(activityMetrics.allCorrectionsVerified)
      },
      autoDone: autoItems.filter((item) => item.done).length,
      autoTotal: autoItems.length
    };
  };

  const enrichSnapshot = (snapshot, settings) => {
    const activityPanorama = buildActivityPanorama(snapshot);
    const studentCount = (snapshot.participants || []).filter((participant) => !/tutor|professor|teacher|instrutor|monitor|coordenador|manager|gestor|administrador/i.test(participant.role || '')).length;
    const scopedMetrics = new Map(activityPanorama.assignments.map((assignment) => [String(assignment.cmid), assignment.metrics]));
    const assignments = (snapshot.assignments || []).map((assignment) => ({
      ...assignment,
      metrics: scopedMetrics.get(String(assignment.cmid)) || calculateAssignmentMetrics(assignment, studentCount)
    }));
    const baseStudents = MAT.collectors?.buildStudents
      ? MAT.collectors.buildStudents(snapshot.participants || [], activityPanorama.assignments, snapshot.grades || [])
      : snapshot.students || [];
    const students = baseStudents.map((student) => classifyStudent(student, settings, snapshot.course));
    const enriched = { ...snapshot, assignments, students, activityPanorama };
    enriched.tasks = buildTaskQueue(enriched, settings);
    enriched.closing = buildClosing(enriched, settings);
    enriched.summary = {
      participants: snapshot.participants.length,
      students: students.length,
      riskImmediate: students.filter((item) => item.riskLevel === 'imediato').length,
      riskHigh: students.filter((item) => item.riskLevel === 'alto').length,
      riskAttention: students.filter((item) => item.riskLevel === 'atencao').length,
      pendingGrading: activityPanorama.metrics.pendingGrading,
      missingStudents: enriched.closing.metrics.missingStudents,
      assignments: activityPanorama.metrics.evaluativeActivities,
      totalActivities: activityPanorama.metrics.totalActivities,
      expectedDeliveries: activityPanorama.metrics.expectedDeliveries,
      delivered: activityPanorama.metrics.delivered,
      corrected: activityPanorama.metrics.corrected,
      missingDeliveries: activityPanorama.metrics.missingDeliveries,
      deliveryRate: activityPanorama.metrics.deliveryRate,
      correctionRate: activityPanorama.metrics.correctionRate,
      activitiesWithPending: activityPanorama.metrics.activitiesWithPending,
      activitiesUnverified: activityPanorama.metrics.activitiesUnverified,
      allCorrectionsVerified: activityPanorama.metrics.allCorrectionsVerified,
      activitiesComplete: activityPanorama.metrics.activitiesComplete,
      sourcesOk: snapshot.sources.filter((item) => item.status === 'ok').length,
      sourcesError: snapshot.sources.filter((item) => item.status === 'erro').length
    };
    return enriched;
  };

  MAT.rules = {
    classifyStudent,
    recommendAction,
    selectUcScope,
    calculateAssignmentMetrics,
    buildActivityPanorama,
    buildTaskQueue,
    buildClosing,
    enrichSnapshot,
    riskRank
  };
})();
