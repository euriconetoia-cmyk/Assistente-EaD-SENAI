'use strict';

const BATCH_STORAGE_KEY = 'mat_active_batch_v3';
const BATCH_ALARM = 'mat_batch_resume_v3';
const TAB_LOAD_TIMEOUT_MS = 25000;
const MAX_BATCH_ACTIVITIES = 30;
const MAX_RECORDS_PER_JOB = 5000;
const MESSAGE_RETRIES = 5;
const MAX_ROUTE_RESTORES = 2;
const RUNNING_BATCH_IDS = new Set();
const ALLOWED_HOSTS = new Set(['ead.senai.br', 'ead.fieg.com.br']);

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#0b5cad' });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'MAT_TOGGLE_PANEL' });
  } catch (error) {
    console.warn('[Assistente EaD] Não foi possível abrir o painel nesta página.', error);
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const validateAutomationUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('Destino de automação não autorizado.');
  }
  if (url.pathname !== '/mod/assign/view.php') {
    throw new Error('A automação aceita somente páginas de atividade do Moodle.');
  }
  return url;
};

const buildAutomationUrl = (gradingUrl, cmid) => {
  const url = validateAutomationUrl(gradingUrl);
  url.searchParams.set('id', String(cmid));
  url.searchParams.set('action', 'grading');
  url.searchParams.set('quickgrading', '1');
  // O CSV pode conter alunos que já saíram do filtro "Requer avaliação".
  // A visão completa evita falsos "aluno não encontrado" e as opções de
  // sobrescrita continuam protegendo notas e feedbacks existentes.
  url.searchParams.set('status', 'all');
  url.searchParams.set('page', '0');
  url.searchParams.set('perpage', '500');
  return url.href;
};

const buildVerificationUrl = (gradingUrl, cmid) => {
  const url = validateAutomationUrl(gradingUrl);
  url.searchParams.set('id', String(cmid));
  url.searchParams.set('action', 'grading');
  url.searchParams.set('quickgrading', '1');
  url.searchParams.set('status', 'all');
  url.searchParams.set('perpage', '500');
  url.searchParams.set('page', '0');
  return url.href;
};

const validateJobs = (jobs) => {
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('O lote não contém atividades.');
  if (jobs.length > MAX_BATCH_ACTIVITIES) throw new Error(`O lote excede ${MAX_BATCH_ACTIVITIES} atividades.`);
  const activityIds = new Set();
  return jobs.map((job) => {
    if (!job?.cmid || !job?.activityName || !Array.isArray(job.records)) throw new Error('Uma atividade do lote está incompleta.');
    if (!job.records.length || job.records.length > MAX_RECORDS_PER_JOB) throw new Error(`Uma atividade excede ${MAX_RECORDS_PER_JOB} registros.`);
    const cmid = String(job.cmid);
    if (activityIds.has(cmid)) throw new Error(`A atividade ${cmid} aparece mais de uma vez no lote.`);
    activityIds.add(cmid);
    const students = new Set();
    const records = job.records.map((record, index) => {
      const studentId = String(record?.studentId || '').trim();
      const nome = String(record?.nome || '').trim().slice(0, 300);
      const nota = String(record?.nota ?? '').trim();
      const feedback = String(record?.feedback || '').slice(0, 20000);
      const situacaoRaw = String(record?.situacaoRaw || '').slice(0, 200);
      if (!studentId && !nome) throw new Error(`Registro ${index + 1} da atividade ${cmid} não identifica o estudante.`);
      if (!nota && !feedback && !situacaoRaw) throw new Error(`Registro ${index + 1} da atividade ${cmid} não contém alteração.`);
      if (nota) {
        const normalized = nota.replace(/\s/g, '').replace(',', '.');
        if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized) || Number(normalized) < 0) throw new Error(`Registro ${index + 1} da atividade ${cmid} contém nota inválida.`);
      }
      const key = studentId ? `id:${studentId}` : `nome:${nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`;
      if (students.has(key)) throw new Error(`A atividade ${cmid} contém estudante duplicado.`);
      students.add(key);
      return { studentId, nome, nota, feedback, situacaoRaw, sourceRow: record?.sourceRow || index + 1 };
    });
    return {
      cmid,
      gradingUrl: buildAutomationUrl(job.gradingUrl, job.cmid),
      activityName: String(job.activityName).slice(0, 300),
      records,
    };
  });
};

if (globalThis.__MAT_TEST__) {
  globalThis.__MAT_SW_TEST__ = { validateAutomationUrl, buildAutomationUrl, buildVerificationUrl, validateJobs };
}

const loadBatchState = async () => {
  const data = await chrome.storage.session.get(BATCH_STORAGE_KEY);
  return data[BATCH_STORAGE_KEY] || null;
};

const saveBatchState = async (state) => {
  const existingData = await chrome.storage.session.get(BATCH_STORAGE_KEY);
  const existing = existingData[BATCH_STORAGE_KEY];
  if (existing?.batchId === state.batchId && existing.cancelled) state.cancelled = true;
  await chrome.storage.session.set({ [BATCH_STORAGE_KEY]: state });
  return state;
};

const clearBatchState = async () => {
  await chrome.storage.session.remove(BATCH_STORAGE_KEY);
  await chrome.alarms.clear(BATCH_ALARM);
};

async function waitForTabComplete(tabId, timeoutMs = TAB_LOAD_TIMEOUT_MS) {
  const current = await chrome.tabs.get(tabId).catch(() => null);
  if (!current) throw new Error('A aba da atividade não está mais disponível.');
  if (current.status === 'complete') return current;

  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      clearTimeout(timer);
    };
    const onUpdated = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      cleanup();
      resolve(tab);
    };
    const onRemoved = (removedTabId) => {
      if (removedTabId !== tabId) return;
      cleanup();
      reject(new Error('A aba foi fechada antes da conclusão do carregamento.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Tempo esgotado aguardando o carregamento da página.'));
    }, timeoutMs);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

async function sendTickWithRetry(tabId, payload) {
  let lastError = null;
  for (let attempt = 0; attempt < MESSAGE_RETRIES; attempt += 1) {
    try {
      const ready = await chrome.tabs.sendMessage(tabId, { type: 'MAT_IMPORTER_READY' });
      if (!ready?.ready) throw new Error('Importador ainda não está pronto.');
      return await chrome.tabs.sendMessage(tabId, { type: 'MAT_BATCH_TICK', ...payload });
    } catch (error) {
      lastError = error;
      await delay(250 * (attempt + 1));
    }
  }
  throw new Error(`Falha de comunicação com o importador: ${lastError?.message || 'sem resposta'}`);
}

const notifyOrigin = async (state, message) => {
  if (!state.originTabId) return;
  await chrome.tabs.sendMessage(state.originTabId, message).catch(() => {});
};

async function closeJobTab(state) {
  const tabId = state.current?.tabId;
  if (tabId) await chrome.tabs.remove(tabId).catch(() => {});
  state.current = null;
  await saveBatchState(state);
}

async function finishCurrentJob(state, result) {
  const job = state.jobs[state.index];
  state.results.push({
    activityName: job.activityName,
    cmid: job.cmid,
    diagnosticUrl: job.gradingUrl,
    ...result,
  });
  await notifyOrigin(state, {
    type: 'MAT_BATCH_PROGRESS',
    batchId: state.batchId,
    index: state.index,
    total: state.jobs.length,
    activityName: job.activityName,
    phase: 'concluido',
    result: state.results[state.results.length - 1],
  });
  state.index += 1;
  await closeJobTab(state);
}

async function processCurrentJob(state) {
  const job = state.jobs[state.index];
  if (!job) return;

  if (!state.current) {
    const tab = await chrome.tabs.create({ url: job.gradingUrl, active: false });
    state.current = { tabId: tab.id, phase: 'preparar' };
    await saveBatchState(state);
  }

  const tabId = state.current.tabId;
  await waitForTabComplete(tabId);

  const response = await sendTickWithRetry(tabId, {
    batchId: state.batchId,
    cmid: job.cmid,
    records: job.records,
    options: state.options,
    transactionState: state.current.phase,
    verificationPlan: state.current.verificationPlan || [],
  });
  if (!response) throw new Error('A página não respondeu ao processamento.');

  if (response.status === 'reloading') {
    await saveBatchState(state);
    await delay(650);
    await waitForTabComplete(tabId);
    return;
  }
  if (response.status === 'redirecting') {
    state.current.routeRestores = (state.current.routeRestores || 0) + 1;
    if (state.current.routeRestores > MAX_ROUTE_RESTORES) {
      const verificationFailed = state.current.phase === 'verificar';
      await finishCurrentJob(state, {
        outcome: verificationFailed ? 'nao_verificado' : 'erro',
        message: verificationFailed
          ? 'O Moodle confirmou o salvamento, mas redirecionou repetidamente durante a conferência final.'
          : 'O Moodle redirecionou repetidamente para fora da tela de avaliação rápida.',
        saveMessage: verificationFailed ? state.current.saveMessage || '' : '',
        report: state.current.preview,
      });
      return;
    }
    await saveBatchState(state);
    await chrome.tabs.update(tabId, { url: state.current.verificationUrl || job.gradingUrl });
    await waitForTabComplete(tabId);
    return;
  }
  if (response.status === 'submitting') {
    state.current.phase = 'enviado';
    state.current.submittedAt = new Date().toISOString();
    state.current.preview = response.report;
    state.current.verificationPlan = response.report?.verificationPlan || [];
    await saveBatchState(state);
    await delay(500);
    await waitForTabComplete(tabId);
    return;
  }
  if (response.status === 'saved') {
    state.current.phase = 'verificar';
    state.current.saveMessage = response.message || 'O Moodle confirmou o salvamento.';
    state.current.routeRestores = 0;
    state.current.verificationUrl = buildVerificationUrl(job.gradingUrl, job.cmid);
    await saveBatchState(state);
    await chrome.tabs.update(tabId, { url: state.current.verificationUrl });
    await waitForTabComplete(tabId);
    return;
  }
  if (response.status === 'verified') {
    const verification = response.verification;
    const summary = verification?.summary || {};
    const hasIssues = Number(summary.divergent || 0) + Number(summary.notFound || 0) + Number(summary.notVerifiable || 0) > 0;
    const message = hasIssues
      ? `Salvamento confirmado, mas a conferência encontrou ${summary.divergent || 0} divergência(s), ${summary.notFound || 0} aluno(s) não localizado(s) e ${summary.notVerifiable || 0} registro(s) não verificável(is).`
      : `Salvamento e conferência concluídos: ${summary.confirmed || 0} de ${summary.total || 0} registro(s) confirmado(s) no Moodle.`;
    await finishCurrentJob(state, {
      outcome: hasIssues ? 'divergente' : 'sucesso',
      message,
      saveMessage: state.current.saveMessage || '',
      verification,
      report: state.current.preview,
    });
    return;
  }
  if (response.status === 'error') {
    const verificationFailed = state.current.phase === 'verificar';
    await finishCurrentJob(state, {
      outcome: verificationFailed ? 'nao_verificado' : 'erro',
      message: verificationFailed
        ? `O Moodle confirmou o salvamento, mas a conferência final falhou: ${response.reason}`
        : response.reason,
      saveMessage: verificationFailed ? state.current.saveMessage || '' : '',
      report: response.report || state.current.preview,
    });
    return;
  }
  if (response.status === 'filled_preview') {
    await finishCurrentJob(state, { outcome: 'pre_visualizado', message: 'Prévia concluída. Nenhum dado foi salvo.', report: response.report });
    return;
  }
  if (response.status === 'done') {
    const outcome = response.outcome === 'success' ? 'sucesso'
      : response.outcome === 'skipped' ? 'sem_alteracoes'
        : 'erro';
    await finishCurrentJob(state, { outcome, message: response.message || '', report: response.report || state.current?.preview });
    return;
  }
  throw new Error(`Estado inesperado do importador: ${response.status || 'desconhecido'}.`);
}

async function processBatch(batchId) {
  if (RUNNING_BATCH_IDS.has(batchId)) return;
  RUNNING_BATCH_IDS.add(batchId);
  try {
    let state = await loadBatchState();
    if (!state || state.batchId !== batchId) return;
    while (state.index < state.jobs.length && !state.cancelled) {
      const job = state.jobs[state.index];
      await notifyOrigin(state, {
        type: 'MAT_BATCH_PROGRESS',
        batchId,
        index: state.index,
        total: state.jobs.length,
        activityName: job.activityName,
        phase: state.current?.phase === 'verificar' ? 'verificando' : 'processando',
      });
      try {
        await processCurrentJob(state);
      } catch (error) {
        const verificationFailed = state.current?.phase === 'verificar';
        await finishCurrentJob(state, {
          outcome: verificationFailed ? 'nao_verificado' : 'erro',
          message: verificationFailed
            ? `O salvamento foi confirmado, mas a conferência final não pôde ser concluída: ${error.message || 'falha inesperada.'}`
            : error.message || 'Falha inesperada na atividade.',
          saveMessage: verificationFailed ? state.current?.saveMessage || '' : '',
          report: state.current?.preview,
        });
      }
      state = await loadBatchState();
      if (!state || state.batchId !== batchId) return;
    }
    if (state.cancelled) {
      if (state.current) await closeJobTab(state);
      const completedIds = new Set(state.results.map((result) => String(result.cmid)));
      state.jobs.slice(state.index).forEach((job) => {
        if (!completedIds.has(String(job.cmid))) state.results.push({ cmid: job.cmid, activityName: job.activityName, outcome: 'cancelado', message: 'Cancelado pelo tutor.' });
      });
      await saveBatchState(state);
    }
    const results = [...state.results];
    await notifyOrigin(state, { type: 'MAT_BATCH_DONE', batchId, results });
    await clearBatchState();
  } finally {
    RUNNING_BATCH_IDS.delete(batchId);
  }
}

async function startBatch(message, sender) {
  const originTabId = sender.tab?.id;
  if (!originTabId) throw new Error('A aba de origem do lote não foi identificada.');
  const jobs = validateJobs(message.jobs);
  const batchId = String(message.batchId || `batch_${Date.now()}`);
  const state = {
    schemaVersion: 3,
    batchId,
    originTabId,
    jobs,
    options: {
      overwriteGrade: Boolean(message.options?.overwriteGrade),
      overwriteFeedback: Boolean(message.options?.overwriteFeedback),
      flexMatch: false,
      dryRun: Boolean(message.options?.dryRun),
    },
    index: 0,
    results: [],
    current: null,
    cancelled: false,
    createdAt: new Date().toISOString(),
  };
  await saveBatchState(state);
  await chrome.alarms.create(BATCH_ALARM, { periodInMinutes: 0.5 });
  processBatch(batchId).catch((error) => console.error('[Assistente EaD] Falha no lote.', error));
}

async function cancelBatch(batchId) {
  const state = await loadBatchState();
  if (!state || state.batchId !== batchId) return;
  state.cancelled = true;
  await saveBatchState(state);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== BATCH_ALARM) return;
  const state = await loadBatchState();
  if (state?.batchId) processBatch(state.batchId).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender?.id !== chrome.runtime.id) return undefined;
  if (message?.type === 'MAT_BATCH_LAUNCH_START') {
    startBatch(message, sender)
      .then(() => sendResponse({ accepted: true }))
      .catch((error) => sendResponse({ accepted: false, error: error.message }));
    return true;
  }
  if (message?.type === 'MAT_BATCH_CANCEL') {
    cancelBatch(String(message.batchId || ''))
      .then(() => sendResponse({ cancelled: true }))
      .catch((error) => sendResponse({ cancelled: false, error: error.message }));
    return true;
  }
  return undefined;
});
