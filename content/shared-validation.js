'use strict';

(() => {
  if (globalThis.MAT_SHARED) return;

  const LIMITS = Object.freeze({
    maxFileBytes: 5 * 1024 * 1024,
    maxRecords: 5000,
    maxCells: 50000,
    maxCellLength: 20000,
  });

  const normalizeText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const detectDelimiter = (text) => {
    const firstLine = String(text).split(/\r?\n/).find((line) => line.trim()) || '';
    const candidates = [';', '\t', ','].map((delimiter) => ({
      delimiter,
      count: firstLine.split(delimiter).length - 1,
    }));
    candidates.sort((a, b) => b.count - a.count);
    return candidates[0].count > 0 ? candidates[0].delimiter : ';';
  };

  const parseDelimitedText = (text) => {
    const cleanText = String(text ?? '').replace(/^\uFEFF/, '');
    if (new Blob([cleanText]).size > LIMITS.maxFileBytes) {
      throw new Error('O arquivo excede o limite de 5 MB.');
    }
    const delimiter = detectDelimiter(cleanText);
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < cleanText.length; i += 1) {
      const char = cleanText[i];
      const next = cleanText[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && char === delimiter) {
        row.push(value);
        value = '';
        continue;
      }
      if (!inQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(value);
        if (row.some((cell) => String(cell).trim())) rows.push(row);
        row = [];
        value = '';
        continue;
      }
      value += char;
      if (value.length > LIMITS.maxCellLength) {
        throw new Error(`Uma célula excede o limite de ${LIMITS.maxCellLength} caracteres.`);
      }
    }
    if (inQuotes) throw new Error('O arquivo contém aspas não fechadas.');
    row.push(value);
    if (row.some((cell) => String(cell).trim())) rows.push(row);

    const cellCount = rows.reduce((total, current) => total + current.length, 0);
    if (rows.length - 1 > LIMITS.maxRecords) throw new Error(`O arquivo excede ${LIMITS.maxRecords} registros.`);
    if (cellCount > LIMITS.maxCells) throw new Error(`O arquivo excede ${LIMITS.maxCells} células.`);
    return rows;
  };

  const HEADER_ALIASES = Object.freeze({
    ambiente: ['ambiente', 'host', 'moodle', 'dominio', 'domínio'],
    cursoId: ['curso_id', 'course_id', 'id curso', 'id do curso'],
    curso: ['curso', 'nome do curso', 'course', 'uc', 'uc ou curso'],
    atividadeId: ['cmid', 'atividade_id', 'id atividade', 'id da atividade'],
    atividade: ['atividade', 'tarefa', 'activity', 'nome da atividade'],
    studentId: ['student_id', 'student id', 'id do aluno', 'id aluno', 'id do estudante'],
    nome: ['nome', 'aluno', 'estudante', 'discente', 'nome do aluno', 'nome completo'],
    nota: ['nota', 'grade', 'pontuacao', 'pontuação', 'score'],
    feedback: ['feedback', 'comentario', 'comentário', 'comentarios', 'comentários', 'observacao', 'observação', 'retorno', 'devolutiva'],
    situacao: ['situacao', 'situação', 'status', 'tag', 'classificacao', 'classificação'],
    notaMaxima: ['nota_maxima', 'nota máxima', 'valor da atividade', 'valor_atividade', 'max_grade', 'maximum grade'],
    tipoAtividade: ['tipo_atividade', 'tipo da atividade', 'activity_type'],
  });

  const findHeaderIndex = (headers, aliases) => {
    const exact = aliases.map(normalizeText);
    return headers.findIndex((header) => exact.includes(header));
  };

  const parseGrade = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return { raw: '', number: null, valid: true };
    const normalized = raw.replace(/\s/g, '').replace(',', '.');
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return { raw, number: null, valid: false };
    const number = Number(normalized);
    return { raw, number, valid: Number.isFinite(number) && number >= 0 };
  };

  const normalizeComparableFeedback = (value) => String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const gradesEquivalent = (expected, actual) => {
    const expectedGrade = parseGrade(expected);
    const actualGrade = parseGrade(actual);
    if (!expectedGrade.valid || expectedGrade.number === null || !actualGrade.valid || actualGrade.number === null) return false;
    return Math.abs(expectedGrade.number - actualGrade.number) < 0.000001;
  };

  const compareSavedFields = (expected = {}, actual = {}) => {
    const gradeRequested = expected.expectedGrade !== null && expected.expectedGrade !== undefined && String(expected.expectedGrade).trim() !== '';
    const feedbackRequested = expected.expectedFeedback !== null && expected.expectedFeedback !== undefined && String(expected.expectedFeedback).trim() !== '';
    const gradeStatus = !gradeRequested
      ? 'not_requested'
      : !actual.hasGradeField
        ? 'not_verifiable'
        : gradesEquivalent(expected.expectedGrade, actual.actualGrade)
          ? 'confirmed'
          : 'divergent';
    const feedbackStatus = !feedbackRequested
      ? 'not_requested'
      : !actual.hasFeedbackField
        ? 'not_verifiable'
        : normalizeComparableFeedback(expected.expectedFeedback) === normalizeComparableFeedback(actual.actualFeedback)
          ? 'confirmed'
          : 'divergent';
    const statuses = [gradeStatus, feedbackStatus].filter((status) => status !== 'not_requested');
    const status = statuses.includes('divergent')
      ? 'divergent'
      : statuses.includes('not_verifiable')
        ? 'not_verifiable'
        : statuses.length
          ? 'confirmed'
          : 'not_verifiable';
    return {
      status,
      grade: {
        expected: gradeRequested ? String(expected.expectedGrade) : '',
        actual: actual.hasGradeField ? String(actual.actualGrade ?? '') : '',
        status: gradeStatus,
      },
      feedback: {
        expected: feedbackRequested ? String(expected.expectedFeedback) : '',
        actual: actual.hasFeedbackField ? String(actual.actualFeedback ?? '') : '',
        status: feedbackStatus,
      },
    };
  };

  const parseBatchCsv = (text, options = {}) => {
    const rows = parseDelimitedText(text);
    if (rows.length < 2) throw new Error('Arquivo vazio ou sem linhas de dados.');
    const headers = rows[0].map(normalizeText);
    const indexes = Object.fromEntries(Object.entries(HEADER_ALIASES)
      .map(([key, aliases]) => [key, findHeaderIndex(headers, aliases)]));

    const defaultActivityId = String(options.defaultActivityId ?? '').trim();
    const defaultActivityName = String(options.defaultActivityName ?? '').trim();
    const allowMissingActivity = Boolean(options.allowMissingActivity);
    if (indexes.atividadeId === -1 && indexes.atividade === -1 && !defaultActivityId && !defaultActivityName && !allowMissingActivity) {
      throw new Error('Inclua a coluna cmid ou atividade.');
    }
    if (indexes.nome === -1 && indexes.studentId === -1) throw new Error('Inclua a coluna nome ou student_id.');
    if (indexes.nota === -1 && indexes.feedback === -1 && indexes.situacao === -1) {
      throw new Error('Inclua ao menos uma coluna de ação: nota, feedback ou situacao.');
    }

    const records = [];
    const errors = [];
    const warnings = [];
    const identifiers = new Map();

    rows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2;
      const read = (key) => indexes[key] === -1 ? '' : String(row[indexes[key]] ?? '').trim();
      const record = {
        rowNumber,
        ambiente: read('ambiente'),
        cursoId: read('cursoId'),
        curso: read('curso'),
        atividadeId: read('atividadeId') || defaultActivityId,
        atividade: read('atividade') || defaultActivityName,
        studentId: read('studentId'),
        nome: read('nome'),
        nota: read('nota'),
        feedback: read('feedback'),
        situacaoRaw: read('situacao'),
        notaMaxima: read('notaMaxima'),
        tipoAtividade: read('tipoAtividade'),
      };
      if (!record.atividadeId && !record.atividade && !allowMissingActivity) {
        errors.push(`Linha ${rowNumber}: informe cmid ou atividade.`);
        return;
      }
      if (!record.studentId && !record.nome) {
        errors.push(`Linha ${rowNumber}: informe student_id ou nome.`);
        return;
      }
      if (!record.nota && !record.feedback && !record.situacaoRaw) {
        errors.push(`Linha ${rowNumber}: informe nota, feedback ou situacao.`);
        return;
      }
      const grade = parseGrade(record.nota);
      if (!grade.valid) {
        errors.push(`Linha ${rowNumber}: nota inválida "${record.nota}".`);
        return;
      }
      const activityKey = record.atividadeId ? `id:${record.atividadeId}` : `nome:${normalizeText(record.atividade)}`;
      const studentKey = record.studentId ? `id:${record.studentId}` : `nome:${normalizeText(record.nome)}`;
      const identifier = `${activityKey}|${studentKey}`;
      if (identifiers.has(identifier)) {
        errors.push(`Linhas ${identifiers.get(identifier)} e ${rowNumber}: registro duplicado para a mesma atividade e estudante.`);
        return;
      }
      identifiers.set(identifier, rowNumber);
      if (grade.number === 0) {
        if (!record.feedback) {
          errors.push(`Linha ${rowNumber}: nota zero exige feedback e deve permanecer em branco.`);
          return;
        }
        record.nota = '';
        warnings.push(`Linha ${rowNumber}: nota zero removida; somente o feedback será enviado.`);
      }
      records.push({ ...record, notaNumero: record.nota ? grade.number : null });
    });

    if (!records.length) throw new Error('Nenhum registro válido encontrado no arquivo.');
    return { records, errors, warnings, indexes };
  };

  const scoreActivity = (rawName, assignmentName) => {
    const wanted = normalizeText(rawName);
    const candidate = normalizeText(assignmentName);
    if (!wanted || !candidate) return 0;
    if (wanted === candidate) return 1;
    const wantedTokens = new Set(wanted.split(' ').filter((token) => token.length > 2));
    const candidateTokens = new Set(candidate.split(' ').filter((token) => token.length > 2));
    const hits = [...wantedTokens].filter((token) => candidateTokens.has(token)).length;
    return hits / Math.max(wantedTokens.size, candidateTokens.size, 1);
  };

  const matchActivity = (record, assignments) => {
    if (record.atividadeId) {
      const byId = assignments.filter((assignment) => String(assignment.cmid) === String(record.atividadeId));
      return byId.length === 1
        ? { status: 'exact', assignment: byId[0], method: 'cmid', confidence: 1 }
        : { status: 'unmatched', assignment: null, method: 'cmid', confidence: 0 };
    }
    const exact = assignments.filter((assignment) => normalizeText(assignment.name) === normalizeText(record.atividade));
    if (exact.length === 1) return { status: 'exact', assignment: exact[0], method: 'nome exato', confidence: 1 };
    const scored = assignments.map((assignment) => ({ assignment, confidence: scoreActivity(record.atividade, assignment.name) }))
      .filter((candidate) => candidate.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence);
    const suggestion = scored[0] && (!scored[1] || scored[0].confidence - scored[1].confidence >= 0.15)
      ? scored[0]
      : null;
    return {
      status: suggestion ? 'suggestion' : 'unmatched',
      assignment: null,
      suggestedAssignment: suggestion?.assignment || null,
      method: suggestion ? 'sugestão aproximada' : 'sem correspondência',
      confidence: suggestion?.confidence || 0,
    };
  };

  const matchActivityFromFileName = (fileName, assignments) => {
    const normalizedFile = normalizeText(String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    if (!normalizedFile) return { status: 'unmatched', assignment: null, method: 'arquivo', confidence: 0 };

    const byId = assignments.filter((assignment) => {
      const cmid = String(assignment.cmid || '').trim();
      return cmid && new RegExp(`(?:^|\\D)${cmid}(?:\\D|$)`).test(normalizedFile);
    });
    if (byId.length === 1) return { status: 'exact', assignment: byId[0], method: 'cmid no nome do arquivo', confidence: 1 };

    const byExactName = assignments.filter((assignment) => {
      const activityName = normalizeText(assignment.name);
      return activityName && (normalizedFile === activityName || normalizedFile.includes(activityName));
    });
    return byExactName.length === 1
      ? { status: 'exact', assignment: byExactName[0], method: 'nome exato no arquivo', confidence: 1 }
      : { status: 'unmatched', assignment: null, method: 'arquivo', confidence: 0 };
  };

  const FEEDBACK_ONLY_SITUATIONS = new Set([
    'atividade_incorreta', 'erro_arquivo', 'sem_conteudo_relevante',
    'sem_envio_valido', 'sem_participacao_forum', 'senai_play_nao_comprovado',
  ]);

  const normalizeSituationCode = (value = '') => normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const applyAcademicGradePolicy = (record, assignment = {}) => {
    const next = { ...record };
    const warnings = [];
    const errors = [];
    const situation = normalizeSituationCode(next.situacaoRaw || next.situacao || '');
    const activityText = normalizeText(`${assignment.name || next.atividade || ''} ${next.tipoAtividade || ''}`);
    const isSenaiPlay = /senai\s*play/.test(activityText);
    const parsedMax = parseGrade(next.notaMaxima || assignment.maxGrade || assignment.gradeMax || '');
    const maxGrade = parsedMax.valid && parsedMax.number > 0 ? parsedMax.number : null;

    if (FEEDBACK_ONLY_SITUATIONS.has(situation) || situation.includes('atividade_incorreta')) {
      if (String(next.nota || '').trim()) warnings.push('A situação exige somente feedback; a nota foi deixada em branco.');
      next.nota = '';
      next.notaNumero = null;
      if (!String(next.feedback || '').trim()) errors.push('A situação exige um feedback explicativo.');
    }

    if (isSenaiPlay) {
      const validated = situation === 'senai_play_validado' || situation === 'validado' || situation === 'corrigido';
      if (!validated) {
        next.nota = '';
        next.notaNumero = null;
        errors.push('SENAI Play exige a situação "SENAI Play validado" antes do lançamento.');
      } else if (maxGrade !== null) {
        next.nota = String(maxGrade);
        next.notaNumero = maxGrade;
        warnings.push(`SENAI Play validado: aplicada a nota máxima confirmada (${maxGrade}).`);
      } else {
        next.nota = '';
        next.notaNumero = null;
        warnings.push('SENAI Play sem pontuação confirmada: somente a validação e o feedback serão enviados.');
      }
    }
    return { record: next, warnings, errors, isSenaiPlay, maxGrade };
  };

  const neutralizeSpreadsheetFormula = (value) => {
    const text = String(value ?? '');
    return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  };

  const isPendingSubmission = ({ status = '', fileCount = 0, hasGrade = false, hasFeedback = false } = {}) => {
    const text = normalizeText(status);
    const noSubmission = /nenhum envio|nenhuma entrega|sem envio|sem entrega|nao enviado|nao submetido|no submission|not submitted|new submission/.test(text);
    const graded = /avaliado|corrigido|graded|feedback publicado|nota publicada/.test(text);
    const explicitPending = /precisa de avaliacao|necessita de avaliacao|aguardando avaliacao|aguardando correcao|pendente de avaliacao|pendente de correcao|a avaliar|nao avaliado|needs grading|requires grading|not graded|submitted for grading|enviado para avaliacao/.test(text);
    const submissionEvidence = Number(fileCount) > 0 || /enviado|entregue|submetido|submitted|submission received|draft submitted/.test(text);
    if (noSubmission || graded || hasGrade || hasFeedback) return false;
    return explicitPending || submissionEvidence;
  };

  globalThis.MAT_SHARED = Object.freeze({
    LIMITS,
    normalizeText,
    detectDelimiter,
    parseDelimitedText,
    parseGrade,
    normalizeComparableFeedback,
    gradesEquivalent,
    compareSavedFields,
    parseBatchCsv,
    matchActivity,
    matchActivityFromFileName,
    applyAcademicGradePolicy,
    normalizeSituationCode,
    scoreActivity,
    neutralizeSpreadsheetFormula,
    isPendingSubmission,
  });
})();
