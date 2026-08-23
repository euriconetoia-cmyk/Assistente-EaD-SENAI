'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;

  const fetchDocument = async (url, settings, label = 'Página') => {
    if (!U.isAllowedMoodleUrl(url)) throw new Error(`${label}: URL outside authorized Moodle hosts`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.requestTimeoutMs);
    const started = performance.now();
    try {
      const response = await fetch(url, {
        credentials: 'include',
        redirect: 'follow',
        signal: controller.signal
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
      if (!U.isAllowedMoodleUrl(response.url)) throw new Error(`${label}: redirected to an unauthorized URL`);
      if (/login\/index\.php/i.test(response.url) || /name="username"/i.test(text) && /name="password"/i.test(text)) {
        throw new Error(`${label}: a sessão do Moodle parece ter expirado`);
      }
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return {
        doc,
        finalUrl: response.url,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        size: text.length
      };
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`${label}: tempo limite excedido`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const sourceRecord = (name, url, result, error = null) => ({
    name,
    type: 'page',
    label: name,
    value: null,
    url,
    status: error ? 'erro' : 'ok',
    error: error ? (error.message || String(error)) : '',
    durationMs: result?.durationMs ?? null,
    size: result?.size ?? null,
    confidence: error ? 'insuficiente' : result?.status === 200 ? 'media' : 'baixa',
    collectedAt: new Date().toISOString(),
    observedAt: new Date().toISOString()
  });

  const unverifiedGrading = () => ({
    status: 'nao_confirmado',
    confidence: 'insuficiente',
    confirmedPending: false,
    confirmedZero: false,
    hasConflict: false,
    rowCoverageComplete: false,
    limitedByGroup: false,
    expectedRows: null,
    parsedRows: 0,
    unknownRows: 0,
    paginationComplete: false,
    reasons: ['A leitura individual de avaliação ainda não foi executada.'],
    signals: []
  });


  const nextMoodlePageUrl = (doc, currentUrl, visited = new Set(), pathPattern) => {
    const anchors = [...doc.querySelectorAll('.paging a[href], [data-region="paging"] a[href], nav[aria-label*="pag" i] a[href], .pagination a[href]')]
      .map((anchor) => ({
        href: U.absoluteUrl(anchor.href, currentUrl),
        text: U.normalizeText(`${anchor.getAttribute('aria-label') || ''} ${anchor.getAttribute('title') || ''} ${anchor.textContent || ''}`),
        rel: U.normalizeText(anchor.getAttribute('rel') || '')
      }))
      .filter((item) => item.href && U.isAllowedMoodleUrl(item.href) && !visited.has(item.href) && pathPattern.test(new URL(item.href).pathname));
    const explicit = anchors.find((item) => item.rel.includes('next') || /proxima|próxima|seguinte|next|avancar|avançar/.test(item.text));
    if (explicit) return explicit.href;
    let currentPage = 0;
    try {
      const params = new URL(currentUrl).searchParams;
      currentPage = Number(params.get('page') || params.get('pageindex') || params.get('offset') || params.get('start') || 0);
    } catch { currentPage = 0; }
    const candidates = anchors.map((item) => {
      try {
        const params = new URL(item.href).searchParams;
        const page = Number(params.get('page') || params.get('pageindex') || params.get('offset') || params.get('start'));
        return Number.isFinite(page) && page > currentPage ? { ...item, page } : null;
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => a.page - b.page);
    return candidates[0]?.href || '';
  };

  const nextGradePageUrl = (doc, currentUrl, visited = new Set()) => nextMoodlePageUrl(doc, currentUrl, visited, /\/grade\/report\/grader\//i);
  const nextGradingPageUrl = (doc, currentUrl, visited = new Set()) => nextMoodlePageUrl(doc, currentUrl, visited, /\/mod\/assign\/view\.php/i);
  const nextParticipantsPageUrl = (doc, currentUrl, visited = new Set()) => nextMoodlePageUrl(doc, currentUrl, visited, /\/user\/index\.php/i);

  const recalculateGradebookSummary = (gradebook) => {
    const items = gradebook?.items || [];
    const students = gradebook?.students || [];
    const totalCells = items.length * students.length;
    const gradedCells = students.reduce((sum, student) => sum + items.filter((item) => student.grades?.[item.key]?.value !== null && student.grades?.[item.key]?.value !== undefined).length, 0);
    const studentsWithCourseTotal = students.filter((student) => student.courseTotal !== null && student.courseTotal !== undefined).length;
    gradebook.summary = {
      itemCount: items.length,
      studentCount: students.length,
      gradedCells,
      missingCells: Math.max(0, totalCells - gradedCells),
      studentsWithCourseTotal,
      studentsWithoutCourseTotal: Math.max(0, students.length - studentsWithCourseTotal)
    };
    return gradebook;
  };

  const mergeGradebooks = (base, extra) => {
    if (!base?.items?.length) return extra;
    if (!extra?.items?.length) return base;
    const itemMap = new Map(base.items.map((item) => [item.key, item]));
    extra.items.forEach((item) => { if (!itemMap.has(item.key)) itemMap.set(item.key, item); });
    base.items = [...itemMap.values()].sort((a, b) => a.columnIndex - b.columnIndex);
    base.courseTotalItem = base.items.find((item) => item.isCourseTotal) || base.courseTotalItem || extra.courseTotalItem || null;
    const studentMap = new Map(base.students.map((student) => [student.studentKey, student]));
    extra.students.forEach((student) => {
      const existing = studentMap.get(student.studentKey);
      if (!existing) studentMap.set(student.studentKey, student);
      else {
        existing.email = existing.email || student.email;
        existing.profileUrl = existing.profileUrl || student.profileUrl;
        existing.grades = { ...existing.grades, ...student.grades };
        if (existing.courseTotal === null || existing.courseTotal === undefined) {
          existing.courseTotal = student.courseTotal;
          existing.courseTotalDisplay = student.courseTotalDisplay;
        }
      }
    });
    base.students = [...studentMap.values()];
    return recalculateGradebookSummary(base);
  };

  const collectCoursePage = async (adapter, course, settings, sources, warnings) => {
    if (location.href.includes('/course/view.php') && U.getQueryNumber(location.href, 'id') === course.id) {
      sources.push(sourceRecord('Página do curso atual', location.href, { durationMs: 0, size: document.documentElement.innerHTML.length }));
      return document;
    }
    try {
      const result = await fetchDocument(adapter.courseUrl(course.id), settings, 'Curso');
      sources.push(sourceRecord('Página do curso', result.finalUrl, result));
      return result.doc;
    } catch (error) {
      sources.push(sourceRecord('Página do curso', adapter.courseUrl(course.id), null, error));
      warnings.push(error.message);
      return document;
    }
  };

  const collectParticipants = async (adapter, course, settings, sources, warnings) => {
    const url = adapter.participantsUrl(course.id, settings.maxParticipants);
    try {
      const result = await fetchDocument(url, settings, 'Participantes');
      sources.push(sourceRecord('Participantes', result.finalUrl, result));
      let parsed = adapter.extractParticipantRows(result.doc);
      let rows = parsed.rows;
      let currentDoc = result.doc;
      let currentUrl = result.finalUrl;
      const visited = new Set([currentUrl]);
      let nextUrl = nextParticipantsPageUrl(currentDoc, currentUrl, visited);
      const paginationDetected = Boolean(nextUrl);
      let pagesFetched = 1;
      let paginationError = '';

      while (nextUrl && pagesFetched < 50 && rows.length < settings.maxParticipants) {
        const pageUrl = nextUrl;
        visited.add(pageUrl);
        try {
          const pageResult = await fetchDocument(pageUrl, settings, `Participantes, página ${pagesFetched + 1}`);
          sources.push(sourceRecord(`Participantes, página ${pagesFetched + 1}`, pageResult.finalUrl, pageResult));
          const pageParsed = adapter.extractParticipantRows(pageResult.doc);
          const previousLength = rows.length;
          rows = U.uniqueBy([...rows, ...pageParsed.rows], (row) => row.key);
          pagesFetched += 1;
          currentDoc = pageResult.doc;
          currentUrl = pageResult.finalUrl;
          nextUrl = nextParticipantsPageUrl(currentDoc, currentUrl, visited);
          if (rows.length <= previousLength && nextUrl) {
            paginationError = 'A paginação de participantes não acrescentou novos alunos; a leitura foi interrompida para evitar repetição.';
            break;
          }
          await U.sleep(settings.requestDelayMs);
        } catch (pageError) {
          paginationError = pageError.message || String(pageError);
          sources.push(sourceRecord(`Participantes, página ${pagesFetched + 1}`, pageUrl, null, pageError));
          break;
        }
      }

      const truncated = Boolean(nextUrl) || Boolean(paginationError);
      if (!rows.length) warnings.push('A lista de participantes não foi reconhecida. Use o diagnóstico para ajustar os seletores deste Moodle.');
      if (truncated) warnings.push(paginationError || `A lista de participantes foi limitada a ${settings.maxParticipants} registros.`);
      return {
        rows: rows.slice(0, settings.maxParticipants),
        diagnostics: { ...parsed.diagnostics, paginationDetected, paginationComplete: !nextUrl && !paginationError, pagesFetched, paginationError },
        truncated
      };
    } catch (error) {
      sources.push(sourceRecord('Participantes', url, null, error));
      warnings.push(error.message);
      return { rows: [], diagnostics: { error: error.message }, truncated: false };
    }
  };

  const collectAssignmentSummary = async (adapter, assignment, settings, sources) => {
    try {
      const currentCmid = /\/mod\/assign\/view\.php/i.test(location.pathname) ? U.getQueryNumber(location.href, 'id') : null;
      if (currentCmid && currentCmid === assignment.cmid) {
        const evidence = sourceRecord(`Atividade atual: ${assignment.name}`, location.href, { durationMs: 0, size: document.documentElement.innerHTML.length });
        sources.push(evidence);
        return { ...adapter.extractAssignmentSummary(document, assignment), collectionStatus: 'ok', usedLiveDocument: true, gradingRows: [], gradingCollectionStatus: 'nao_coletado', gradingVerification: unverifiedGrading(), sources: [...(assignment.sources || []), evidence], warnings: [...(assignment.warnings || [])] };
      }
      const result = await fetchDocument(assignment.url, settings, `Atividade ${assignment.name}`);
      const evidence = sourceRecord(`Atividade: ${assignment.name}`, result.finalUrl, result);
      sources.push(evidence);
      return { ...adapter.extractAssignmentSummary(result.doc, assignment), collectionStatus: 'ok', gradingRows: [], gradingCollectionStatus: 'nao_coletado', gradingVerification: unverifiedGrading(), sources: [...(assignment.sources || []), evidence], warnings: [...(assignment.warnings || [])] };
    } catch (error) {
      const evidence = sourceRecord(`Atividade: ${assignment.name}`, U.isAllowedMoodleUrl(assignment.url) ? assignment.url : '', null, error);
      sources.push(evidence);
      return { ...assignment, collectionStatus: 'erro', collectionError: error.message, gradingRows: [], gradingCollectionStatus: 'erro', gradingVerification: { ...unverifiedGrading(), reasons: [error.message || String(error)] }, sources: [...(assignment.sources || []), evidence], warnings: [...(assignment.warnings || []), error.message || String(error)] };
    }
  };

  const collectAssignmentGrading = async (adapter, assignment, settings, sources) => {
    const rawUrl = assignment.gradingUrl || adapter.assignmentGradingUrl(assignment.cmid, settings.maxParticipants);
    let url = rawUrl;
    const assignmentSources = [...(assignment.sources || [])];
    const recordAssignmentSource = (name, sourceUrl, result, error = null) => {
      const evidence = sourceRecord(name, sourceUrl, result, error);
      sources.push(evidence);
      assignmentSources.push(evidence);
      return evidence;
    };
    try {
      if (!U.isAllowedMoodleUrl(rawUrl)) throw new Error('URL de avaliacao fora dos hosts Moodle autorizados');
      const urlObj = new URL(rawUrl, location.href);
      urlObj.searchParams.set('perpage', String(Math.max(10, Math.min(settings.maxParticipants || 500, 1000))));
      url = urlObj.href;
      const currentCmid = /\/mod\/assign\/view\.php/i.test(location.pathname) ? U.getQueryNumber(location.href, 'id') : null;
      const currentAction = new URL(location.href).searchParams.get('action') || '';
      const canUseLiveDocument = currentCmid === assignment.cmid
        && (/grad/i.test(currentAction) || document.querySelector('.gradingtable, [data-region="grading-navigation"], table.generaltable'));
      const result = canUseLiveDocument
        ? { doc: document, finalUrl: location.href, status: 200, durationMs: 0, size: document.documentElement.innerHTML.length }
        : await fetchDocument(url, settings, `Avaliação ${assignment.name}`);
      recordAssignmentSource(`${canUseLiveDocument ? 'Avaliação atual' : 'Avaliação'}: ${assignment.name}`, result.finalUrl, result);

      let parsed = adapter.extractAssignmentGradingRows(result.doc, assignment);
      const pageSummary = adapter.extractGradingPageSummary(result.doc, assignment);
      let rows = parsed.rows;
      const maximumRows = Math.max(10, Math.min(Number(settings.maxParticipants) || 500, 5000));
      let currentDoc = result.doc;
      let currentUrl = result.finalUrl;
      const visited = new Set([currentUrl]);
      let pagesFetched = 1;
      let nextUrl = nextGradingPageUrl(currentDoc, currentUrl, visited);
      const paginationDetected = Boolean(nextUrl);
      let paginationError = '';

      while (nextUrl && pagesFetched < 50 && rows.length < maximumRows) {
        const pageUrl = nextUrl;
        visited.add(pageUrl);
        try {
          const pageResult = await fetchDocument(pageUrl, settings, `Avaliação ${assignment.name}, página ${pagesFetched + 1}`);
          recordAssignmentSource(`Avaliação, página ${pagesFetched + 1}: ${assignment.name}`, pageResult.finalUrl, pageResult);
          const pageParsed = adapter.extractAssignmentGradingRows(pageResult.doc, assignment);
          const before = rows.length;
          rows = U.uniqueBy([...rows, ...pageParsed.rows], (row) => row.studentKey);
          parsed = {
            ...parsed,
            headers: parsed.headers.length ? parsed.headers : pageParsed.headers,
            diagnostics: { ...parsed.diagnostics, pagesFetched: pagesFetched + 1 }
          };
          pagesFetched += 1;
          currentDoc = pageResult.doc;
          currentUrl = pageResult.finalUrl;
          nextUrl = nextGradingPageUrl(currentDoc, currentUrl, visited);
          if (rows.length <= before && nextUrl) {
            paginationError = 'A paginação da avaliação não acrescentou novos alunos; a leitura foi interrompida para evitar repetição.';
            break;
          }
        } catch (pageError) {
          paginationError = pageError.message || String(pageError);
          recordAssignmentSource(`Avaliação, página ${pagesFetched + 1}: ${assignment.name}`, pageUrl, null, pageError);
          break;
        }
      }
      const paginationComplete = !nextUrl && !paginationError;
      const rowPending = rows.filter((row) => row.requiresGrading || row.submitted && !row.graded).length;
      const rowSubmitted = rows.filter((row) => row.submitted && !row.missing).length;
      const rowMissing = rows.filter((row) => row.missing).length;
      const rowUnknown = rows.filter((row) => row.unknown).length;

      const pendingSignals = [
        { source: 'linhas da tabela', value: rows.length ? rowPending : null },
        { source: 'resumo da atividade', value: Number.isFinite(assignment.needsGrading) ? assignment.needsGrading : null },
        { source: 'resumo da página de avaliação', value: Number.isFinite(pageSummary.needsGrading) ? pageSummary.needsGrading : null }
      ].filter((item) => item.value !== null);
      const submittedSignals = [
        rows.length ? rowSubmitted : null,
        Number.isFinite(assignment.submitted) ? assignment.submitted : null,
        Number.isFinite(pageSummary.submitted) ? pageSummary.submitted : null
      ].filter((value) => value !== null);
      const participantSignals = [
        Number.isFinite(assignment.participants) ? assignment.participants : null,
        Number.isFinite(pageSummary.participants) ? pageSummary.participants : null
      ].filter((value) => value !== null);

      const needsGrading = pendingSignals.length ? Math.max(...pendingSignals.map((item) => item.value)) : null;
      const submitted = submittedSignals.length ? Math.max(...submittedSignals) : null;
      const expectedParticipants = participantSignals.length ? Math.max(...participantSignals) : null;
      const rowCoverageComplete = rows.length > 0
        && rowUnknown === 0
        && paginationComplete
        && (expectedParticipants === null || rows.length >= expectedParticipants);
      const zeroSignals = pendingSignals.filter((item) => item.value === 0).length;
      const positiveSignals = pendingSignals.filter((item) => item.value > 0).length;
      const hasConflict = positiveSignals > 0 && zeroSignals > 0;
      const groupText = U.normalizeText(pageSummary.selectedGroup || '');
      const limitedByGroup = pageSummary.hasGroupFilter
        && groupText
        && !/todos|all participants|nenhum grupo|no group/.test(groupText);
      const confirmedPending = Number.isFinite(needsGrading) && needsGrading > 0;
      const confirmedZero = needsGrading === 0
        && !limitedByGroup
        && paginationComplete
        && rowCoverageComplete;
      const verificationStatus = confirmedPending
        ? (hasConflict ? 'conflito' : 'pendencia_confirmada')
        : confirmedZero
          ? 'zero_confirmado'
          : 'nao_confirmado';
      const confidence = confirmedPending || confirmedZero
        ? (rowCoverageComplete ? 'alta' : pendingSignals.length >= 2 ? 'media' : 'baixa')
        : 'insuficiente';

      return {
        ...assignment,
        gradingRows: rows,
        needsGrading,
        submitted,
        participants: expectedParticipants ?? assignment.participants ?? null,
        missingCount: rows.length ? rowMissing : null,
        sources: assignmentSources,
        warnings: [
          ...(assignment.warnings || []),
          ...(paginationError ? [paginationError] : []),
          ...(limitedByGroup ? ['A leitura da avaliação está limitada por grupo.'] : [])
        ],
        gradingDiagnostics: {
          ...parsed.diagnostics,
          pageSummary,
          pendingSignals,
          rowPending,
          rowSubmitted,
          rowMissing,
          rowUnknown,
          rowCoverageComplete,
          limitedByGroup,
          hasConflict,
          paginationDetected,
          paginationComplete,
          pagesFetched,
          paginationError,
          usedLiveDocument: canUseLiveDocument
        },
        gradingVerification: {
          status: verificationStatus,
          confidence,
          confirmedPending,
          confirmedZero,
          hasConflict,
          rowCoverageComplete,
          limitedByGroup,
          expectedRows: expectedParticipants,
          parsedRows: rows.length,
          unknownRows: rowUnknown,
          paginationComplete,
          reasons: [
            ...(hasConflict ? ['Há divergência entre fontes de pendência.'] : []),
            ...(limitedByGroup ? ['A leitura está limitada por grupo.'] : []),
            ...(!paginationComplete ? ['A paginação da avaliação não foi concluída.'] : []),
            ...(rowUnknown ? [`${rowUnknown} linha(s) não reconhecida(s).`] : [])
          ],
          signals: pendingSignals
        },
        gradingCollectionStatus: rows.length
          ? (rowCoverageComplete ? 'ok' : 'parcial')
          : pendingSignals.length
            ? 'resumo'
            : 'nao_verificado'
      };
    } catch (error) {
      recordAssignmentSource(`Avaliação: ${assignment.name}`, U.isAllowedMoodleUrl(url) ? url : '', null, error);
      return {
        ...assignment,
        gradingRows: [],
        sources: assignmentSources,
        warnings: [...(assignment.warnings || []), error.message || String(error)],
        gradingCollectionStatus: 'erro',
        gradingCollectionError: error.message,
        gradingVerification: {
          status: 'nao_confirmado',
          confidence: 'insuficiente',
          confirmedPending: false,
          confirmedZero: false,
          hasConflict: false,
          rowCoverageComplete: false,
          limitedByGroup: false,
          expectedRows: null,
          parsedRows: 0,
          unknownRows: 0,
          paginationComplete: false,
          reasons: [error.message || String(error)],
          signals: []
        }
      };
    }
  };

  const collectGrades = async (adapter, course, settings, sources, warnings) => {
    const url = adapter.gradesUrl(course.id, settings.maxParticipants);
    try {
      const currentCourseId = U.parseCourseId(document);
      const canUseLiveDocument = currentCourseId === course.id
        && /\/grade\/report\/(?:grader|user|overview)\//i.test(location.pathname)
        && document.querySelector('table');
      const result = canUseLiveDocument
        ? { doc: document, finalUrl: location.href, status: 200, durationMs: 0, size: document.documentElement.innerHTML.length }
        : await fetchDocument(url, settings, 'Livro de notas');
      sources.push(sourceRecord(canUseLiveDocument ? 'Livro de notas atual' : 'Livro de notas', result.finalUrl, result));
      const parsed = adapter.extractGradeRows(result.doc, course);
      let gradebook = parsed.gradebook;
      let currentDoc = result.doc;
      let currentUrl = result.finalUrl;
      const gradebookSourceUrls = [result.finalUrl];
      let pagesFetched = gradebook?.items?.length ? 1 : 0;
      const visited = new Set([currentUrl]);
      let nextUrl = gradebook?.meta?.paginationDetected ? nextGradePageUrl(currentDoc, currentUrl, visited) : '';
      const maximumStudents = Math.max(10, Math.min(Number(settings.maxParticipants) || 500, 5000));

      let paginationError = '';
      while (nextUrl && pagesFetched < 50 && (gradebook?.students?.length || 0) < maximumStudents) {
        const pageUrl = nextUrl;
        visited.add(pageUrl);
        try {
          const pageResult = await fetchDocument(pageUrl, settings, `Livro de notas, página ${pagesFetched + 1}`);
          sources.push(sourceRecord(`Livro de notas, página ${pagesFetched + 1}`, pageResult.finalUrl, pageResult));
          gradebookSourceUrls.push(pageResult.finalUrl);
          const pageParsed = adapter.extractGradeRows(pageResult.doc, course);
          const before = gradebook?.students?.length || 0;
          gradebook = mergeGradebooks(gradebook, pageParsed.gradebook);
          pagesFetched += 1;
          currentDoc = pageResult.doc;
          currentUrl = pageResult.finalUrl;
          const after = gradebook?.students?.length || 0;
          nextUrl = nextGradePageUrl(currentDoc, currentUrl, visited);
          if (after <= before && nextUrl) {
            paginationError = 'A paginação do livro de notas não acrescentou novos alunos. A leitura foi interrompida para evitar repetição.';
            warnings.push(paginationError);
            break;
          }
          await U.sleep(settings.requestDelayMs);
        } catch (pageError) {
          paginationError = pageError.message || String(pageError);
          sources.push(sourceRecord(`Livro de notas, página ${pagesFetched + 1}`, pageUrl, null, pageError));
          warnings.push(`A paginação do livro de notas não foi concluída: ${paginationError}`);
          break;
        }
      }

      if (gradebook?.students?.length > maximumStudents) gradebook.students = gradebook.students.slice(0, maximumStudents);
      if (gradebook) {
        recalculateGradebookSummary(gradebook);
        const limitedByConfiguredMaximum = Boolean(nextUrl) && gradebook.students.length >= maximumStudents;
        gradebook.meta = {
          ...gradebook.meta,
          sourceUrl: result.finalUrl,
          usedLiveDocument: canUseLiveDocument,
          pagesFetched,
          paginationFullyRead: !nextUrl && !paginationError,
          limitedByConfiguredMaximum,
          paginationError,
          partial: Boolean(gradebook.meta?.limitedByGroup || gradebook.meta?.collapsedCategoriesDetected || nextUrl || paginationError)
        };
        parsed.gradebook = gradebook;
        parsed.rows = gradebook.students.map((student) => ({
          studentId: student.studentId,
          studentKey: student.studentKey,
          studentName: student.studentName,
          email: student.email,
          total: student.courseTotal,
          totalDisplay: student.courseTotalDisplay,
          confidence: gradebook.courseTotalItem ? gradebook.meta.confidence : 'não disponível',
          source: gradebook.courseTotalItem ? 'Total do curso no livro de notas' : 'Total do curso não identificado'
        }));
      }
      if (!gradebook?.items?.length) warnings.push('O livro de notas não foi reconhecido. Abra o livro de notas do curso e execute a leitura novamente.');
      if (gradebook?.meta?.limitedByConfiguredMaximum) warnings.push(`O relatório foi limitado a ${maximumStudents} alunos pela configuração atual. Aumente “Máximo de participantes” para incluir os demais.`);
      if (gradebook?.meta?.paginationDetected && !gradebook.meta.paginationFullyRead) warnings.push('O livro de notas possui páginas adicionais que não puderam ser totalmente lidas. O relatório foi marcado como parcial.');
      if (gradebook?.meta?.limitedByGroup) warnings.push(`O livro de notas está filtrado pelo grupo “${gradebook.meta.selectedGroup}”. O relatório contém apenas os alunos visíveis nesse filtro.`);
      if (gradebook?.meta?.collapsedCategoriesDetected) warnings.push('Uma ou mais categorias do livro de notas parecem recolhidas. Expanda todas as categorias no Moodle e atualize o relatório para incluir os itens ocultos.');
      if (gradebook) {
        const partial = Boolean(gradebook.meta?.partial);
        const recognized = Boolean(gradebook.items?.length);
        gradebook.collectedAt = gradebook.meta?.collectedAt || new Date().toISOString();
        gradebook.sourceUrls = [...new Set(gradebookSourceUrls)];
        gradebook.status = !recognized ? 'nao_reconhecido' : partial ? 'parcial' : 'completo';
        gradebook.confidence = !recognized ? 'insuficiente' : partial ? 'media' : gradebook.meta?.confidence === 'alta' ? 'alta' : 'baixa';
        gradebook.warnings = [...new Set(warnings)];
        gradebook.summary = {
          ...gradebook.summary,
          gradedCellCount: gradebook.summary?.gradedCells || 0,
          emptyCellCount: gradebook.summary?.missingCells || 0,
          totalItemId: gradebook.courseTotalItem?.itemId || null
        };
      }
      return parsed;
    } catch (error) {
      sources.push(sourceRecord('Livro de notas', url, null, error));
      warnings.push(error.message);
      return {
        rows: [],
        gradebook: {
          course,
          items: [],
          students: [],
          courseTotalItem: null,
          summary: { itemCount: 0, studentCount: 0, gradedCells: 0, missingCells: 0, gradedCellCount: 0, emptyCellCount: 0, totalItemId: null, studentsWithCourseTotal: 0, studentsWithoutCourseTotal: 0 },
          collectedAt: new Date().toISOString(),
          sourceUrls: [url],
          status: 'nao_reconhecido',
          confidence: 'insuficiente',
          warnings: [error.message],
          meta: { status: 'erro', partial: true, collectedAt: new Date().toISOString(), sourceUrl: url, error: error.message },
          diagnostics: { error: error.message }
        },
        diagnostics: { error: error.message }
      };
    }
  };

  const mergeGradebookParticipants = (gradebook, participants = []) => {
    if (!gradebook?.students?.length) return gradebook;
    const byKey = new Map(participants.map((participant) => [participant.key, participant]));
    const byName = new Map(participants.map((participant) => [U.normalizeText(participant.name), participant]));
    gradebook.students = gradebook.students.map((student) => {
      const participant = byKey.get(student.studentKey) || byName.get(U.normalizeText(student.studentName));
      return {
        ...student,
        email: student.email || participant?.email || '',
        profileUrl: student.profileUrl || participant?.profileUrl || ''
      };
    });
    return gradebook;
  };

  const collectGradebookReport = async ({ adapter, course, settings, onProgress }) => {
    const sources = [];
    const warnings = [];
    onProgress?.({ step: 'grades', message: 'Abrindo o livro de notas', percent: 15 });
    const result = await collectGrades(adapter, course, settings, sources, warnings);
    onProgress?.({ step: 'grades', message: 'Organizando alunos e itens de nota', percent: 80 });
    let participants = [];
    if (result.gradebook?.students?.some((student) => !student.email)) {
      const participantResult = await collectParticipants(adapter, course, settings, sources, warnings);
      participants = participantResult.rows;
      mergeGradebookParticipants(result.gradebook, participants);
    }
    onProgress?.({ step: 'done', message: 'Relatório de notas pronto', percent: 100 });
    return {
      gradebook: result.gradebook,
      grades: result.rows,
      participants,
      sources,
      warnings,
      diagnostics: result.diagnostics
    };
  };

  const buildStudents = (participants, assignments, grades) => {
    const teacherPattern = /tutor|professor|teacher|instrutor|monitor|coordenador|manager|gestor|administrador/i;
    const studentPattern = /aluno|estudante|student|discente|aprendiz/i;
    const studentParticipants = participants.filter((participant) => !participant.role || !teacherPattern.test(participant.role));
    const map = new Map();
    const ensure = (key, fallback = {}) => {
      if (!map.has(key)) map.set(key, {
        key,
        id: fallback.id || fallback.studentId || null,
        name: fallback.name || fallback.studentName || 'Aluno não identificado',
        email: fallback.email || '',
        role: fallback.role || '',
        roles: fallback.roles || fallback.role || '',
        status: fallback.status || '',
        lastAccessText: fallback.lastAccessText || '',
        lastAccessDays: fallback.lastAccessDays ?? null,
        profileUrl: fallback.profileUrl || '',
        assignments: [],
        missingAssignments: 0,
        deliveredAssignments: 0,
        submittedAssignments: 0,
        pendingGrading: 0,
        gradedAssignments: 0,
        gradeTotal: null,
        gradeTotalDisplay: '',
        gradeConfidence: 'não disponível',
        studentEvidence: studentPattern.test(fallback.role || ''),
        roleConfidence: fallback.role ? (studentPattern.test(fallback.role) ? 'alta' : 'baixa') : 'não confirmada'
      });
      return map.get(key);
    };

    studentParticipants.forEach((participant) => {
      const student = ensure(participant.key, participant);
      Object.assign(student, participant);
      if (studentPattern.test(participant.role || '')) student.studentEvidence = true;
    });

    assignments.forEach((assignment) => {
      assignment.gradingRows?.forEach((row) => {
        const student = ensure(row.studentKey, row);
        student.studentEvidence = true;
        student.roleConfidence = student.roleConfidence === 'alta' ? 'alta' : 'confirmada por atividade';
        student.assignments.push({
          id: assignment.cmid,
          name: assignment.name,
          dueDate: assignment.dueDate,
          dueText: assignment.dueText,
          assignmentUrl: assignment.url,
          gradingUrl: assignment.gradingUrl,
          submitted: row.submitted,
          missing: row.missing,
          graded: row.graded,
          requiresGrading: row.requiresGrading,
          unknown: row.unknown,
          grade: row.grade,
          gradeDisplay: row.gradeDisplay || row.gradeText || '',
          gradeText: row.gradeText,
          statusText: row.statusText,
          files: row.files,
          modifiedText: row.modifiedText,
          feedbackPresent: row.feedbackPresent
        });
        if (row.missing) student.missingAssignments += 1;
        if (row.submitted) {
          student.submittedAssignments += 1;
          student.deliveredAssignments += 1;
        }
        if (row.requiresGrading || row.submitted && !row.graded) student.pendingGrading += 1;
        if (row.submitted && !row.missing && row.graded) student.gradedAssignments += 1;
      });
    });

    grades.forEach((grade) => {
      const student = ensure(grade.studentKey, grade);
      student.studentEvidence = true;
      student.roleConfidence = student.roleConfidence === 'alta' ? 'alta' : 'confirmada pelo livro de notas';
      student.gradeTotal = grade.total;
      student.gradeTotalDisplay = grade.totalDisplay || grade.gradeTotalDisplay || (grade.total === null || grade.total === undefined ? '' : String(grade.total));
      student.gradeConfidence = grade.confidence || 'baixa';
    });

    return [...map.values()]
      .filter((student) => student.studentEvidence && !teacherPattern.test(student.roles || student.role || ''))
      .map((student) => ({ ...student, roles: student.roles || student.role || '' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  };

  const collectSnapshot = async ({ adapter, course, settings, onProgress }) => {
    const startedAt = Date.now();
    const sources = [];
    const warnings = [];
    const diagnostics = {
      url: location.href,
      title: document.title,
      bodyClasses: [...document.body.classList],
      environment: adapter.environment,
      extensionVersion: MAT.VERSION,
      selectors: {}
    };

    onProgress?.({ step: 'course', message: 'Lendo a estrutura do curso', percent: 5 });
    const courseDoc = await collectCoursePage(adapter, course, settings, sources, warnings);
    const sections = adapter.extractSections(courseDoc);
    diagnostics.selectors.sectionsFound = sections.length;

    onProgress?.({ step: 'participants', message: 'Lendo participantes e último acesso', percent: 15 });
    const participantResult = await collectParticipants(adapter, course, settings, sources, warnings);
    diagnostics.participants = participantResult.diagnostics;

    onProgress?.({ step: 'activities', message: 'Identificando atividades avaliativas', percent: 30 });
    const allDiscovered = adapter.discoverAssignments(courseDoc);
    const activeUcName = U.normalizeText(settings.activeUcName || '');
    const activeUcSectionId = String(settings.activeUcSectionId || '');
    const isActiveUcAssignment = (assignment) => {
      if (activeUcSectionId) return String(assignment.sectionId || '') === activeUcSectionId;
      if (!activeUcName) return false;
      const sectionName = U.normalizeText(assignment.sectionName || '');
      return sectionName === activeUcName || sectionName.includes(activeUcName) || activeUcName.includes(sectionName);
    };
    const discovered = [...allDiscovered]
      .sort((a, b) => Number(isActiveUcAssignment(b)) - Number(isActiveUcAssignment(a)))
      .slice(0, settings.maxAssignments);
    diagnostics.assignmentsDiscovered = allDiscovered.length;
    diagnostics.assignmentsCollected = discovered.length;
    diagnostics.activeUcAssignmentsPrioritized = discovered.filter(isActiveUcAssignment).length;
    if (!allDiscovered.length) warnings.push('Nenhuma atividade do tipo Tarefa foi identificada na página do curso.');
    if (allDiscovered.length > settings.maxAssignments) warnings.push(`Foram identificadas ${allDiscovered.length} tarefas, mas a configuração atual permite analisar ${settings.maxAssignments}. As tarefas da UC selecionada foram priorizadas.`);

    const summaries = await U.mapWithConcurrency(
      discovered,
      settings.requestConcurrency,
      async (assignment) => {
        const value = await collectAssignmentSummary(adapter, assignment, settings, sources);
        await U.sleep(settings.requestDelayMs);
        return value;
      },
      (completed, total, item) => onProgress?.({
        step: 'activities',
        message: `Lendo atividade ${completed} de ${total}: ${item.name}`,
        percent: 30 + Math.round((completed / Math.max(total, 1)) * 25)
      })
    );

    let assignments = summaries.filter(Boolean);
    if (settings.analysisMode === 'complete' && assignments.length) {
      assignments = await U.mapWithConcurrency(
        assignments,
        settings.requestConcurrency,
        async (assignment) => {
          const value = await collectAssignmentGrading(adapter, assignment, settings, sources);
          await U.sleep(settings.requestDelayMs);
          return value;
        },
        (completed, total, item) => onProgress?.({
          step: 'grading',
          message: `Lendo entregas ${completed} de ${total}: ${item.name}`,
          percent: 55 + Math.round((completed / Math.max(total, 1)) * 25)
        })
      );
      assignments.forEach((assignment) => {
        const grading = assignment.gradingDiagnostics;
        if (grading?.paginationDetected && !grading.paginationComplete) {
          warnings.push(`A avaliação “${assignment.name}” possui páginas não lidas integralmente. As correções foram marcadas para verificação.`);
        }
        if (grading?.paginationError) warnings.push(`Avaliação “${assignment.name}”: ${grading.paginationError}`);
      });
    }

    onProgress?.({ step: 'grades', message: 'Conferindo o livro de notas', percent: 83 });
    const gradeResult = settings.analysisMode === 'complete'
      ? await collectGrades(adapter, course, settings, sources, warnings)
      : { rows: [], diagnostics: { skipped: true } };

    onProgress?.({ step: 'rules', message: 'Calculando riscos e prioridades', percent: 92 });
    if (gradeResult.gradebook) mergeGradebookParticipants(gradeResult.gradebook, participantResult.rows);
    const students = buildStudents(participantResult.rows, assignments, gradeResult.rows);

    const snapshot = {
      schemaVersion: 5,
      meta: {
        extensionVersion: MAT.VERSION,
        collectedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        mode: settings.analysisMode,
        environment: adapter.environment,
        host: location.hostname,
        sourcePage: location.href,
        warnings,
        participantDataTruncated: participantResult.truncated,
        assignmentDataTruncated: allDiscovered.length > settings.maxAssignments,
        assignmentsDiscovered: allDiscovered.length
      },
      course: {
        ...course,
        sections,
        activeUcName: settings.activeUcName || '',
        activeUcSectionId: settings.activeUcSectionId || '',
        activeUcEndDate: settings.activeUcEndDate || ''
      },
      participants: participantResult.rows,
      assignments,
      grades: gradeResult.rows,
      gradebook: gradeResult.gradebook,
      students,
      sources,
      diagnostics: {
        ...diagnostics,
        grades: gradeResult.diagnostics
      }
    };

    const enriched = MAT.rules.enrichSnapshot(snapshot, settings);
    onProgress?.({ step: 'done', message: 'Análise concluída', percent: 100 });
    return enriched;
  };

  MAT.collectors = { fetchDocument, collectSnapshot, collectGradebookReport, buildStudents };
})();
