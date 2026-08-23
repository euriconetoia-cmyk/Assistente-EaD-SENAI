'use strict';

(() => {
  const MAT = globalThis.MAT;

  const DEFAULT_SETTINGS = {
    analysisMode: 'complete',
    maxAssignments: 50,
    maxParticipants: 500,
    requestConcurrency: 2,
    requestDelayMs: 180,
    requestTimeoutMs: 18000,
    noAccessAttentionDays: 7,
    noAccessHighDays: 10,
    noAccessImmediateDays: 15,
    minimumGrade: 60,
    recoveryMin: 40,
    recoveryMax: 59.99,
    closingWarningDays: 7,
    activeUcName: '',
    activeUcSectionId: '',
    activeUcEndDate: '',
    autoOpenPanel: false,
    showFloatingButton: true,
    theme: 'system',
    panelBehavior: 'overlay',
    retentionDays: 90,
    storeMessageContent: false,
    enableAutomaticCourseScan: false,
    enableAutomaticCategoryScan: false,
    forcePortuguese: false
  };

  // Chrome can briefly omit storage APIs while an extension is reloaded or a page is navigating.
  // Keep the current tab usable and use the browser storage again as soon as it becomes available.
  const memoryStorage = {};
  const storageArea = () => globalThis.chrome?.storage?.local || null;
  const memoryGet = (keys) => {
    if (keys === null) return { ...memoryStorage };
    const list = Array.isArray(keys) ? keys : [keys];
    return list.reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(memoryStorage, key)) result[key] = memoryStorage[key];
      return result;
    }, {});
  };
  const get = (keys) => new Promise((resolve, reject) => {
    const area = storageArea();
    if (!area) return resolve(memoryGet(keys));
    try {
      area.get(keys, (data) => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) return reject(new Error(`Falha ao ler dados locais: ${error.message}`));
        resolve(data || {});
      });
    } catch (error) { reject(new Error(`Falha ao ler dados locais: ${error.message}`)); }
  });
  const set = (items) => new Promise((resolve, reject) => {
    const area = storageArea();
    if (!area) { Object.assign(memoryStorage, items); return resolve(); }
    try {
      area.set(items, () => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) return reject(new Error(`Falha ao salvar dados locais: ${error.message}`));
        Object.assign(memoryStorage, items);
        resolve();
      });
    } catch (error) { reject(new Error(`Falha ao salvar dados locais: ${error.message}`)); }
  });
  const remove = (keys) => new Promise((resolve, reject) => {
    const area = storageArea();
    const list = Array.isArray(keys) ? keys : [keys];
    if (!area) { list.forEach((key) => delete memoryStorage[key]); return resolve(); }
    try {
      area.remove(keys, () => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) return reject(new Error(`Falha ao remover dados locais: ${error.message}`));
        list.forEach((key) => delete memoryStorage[key]);
        resolve();
      });
    } catch (error) { reject(new Error(`Falha ao remover dados locais: ${error.message}`)); }
  });

  const boundedNumber = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  };

  const normalizeSettings = (settings = {}) => {
    const attention = boundedNumber(settings.noAccessAttentionDays, DEFAULT_SETTINGS.noAccessAttentionDays, 1, 3650);
    const high = Math.max(attention, boundedNumber(settings.noAccessHighDays, DEFAULT_SETTINGS.noAccessHighDays, 1, 3650));
    const immediate = Math.max(high, boundedNumber(settings.noAccessImmediateDays, DEFAULT_SETTINGS.noAccessImmediateDays, 1, 3650));
    const recoveryMin = boundedNumber(settings.recoveryMin, DEFAULT_SETTINGS.recoveryMin, 0, 100);
    const recoveryMax = Math.max(recoveryMin, boundedNumber(settings.recoveryMax, DEFAULT_SETTINGS.recoveryMax, 0, 100));
    return {
      ...DEFAULT_SETTINGS,
      analysisMode: settings.analysisMode === 'quick' ? 'quick' : 'complete',
      maxAssignments: Math.round(boundedNumber(settings.maxAssignments, DEFAULT_SETTINGS.maxAssignments, 1, 200)),
      maxParticipants: Math.round(boundedNumber(settings.maxParticipants, DEFAULT_SETTINGS.maxParticipants, 10, 5000)),
      requestConcurrency: Math.round(boundedNumber(settings.requestConcurrency, DEFAULT_SETTINGS.requestConcurrency, 1, 6)),
      requestDelayMs: Math.round(boundedNumber(settings.requestDelayMs, DEFAULT_SETTINGS.requestDelayMs, 0, 5000)),
      requestTimeoutMs: Math.round(boundedNumber(settings.requestTimeoutMs, DEFAULT_SETTINGS.requestTimeoutMs, 1000, 60000)),
      noAccessAttentionDays: attention,
      noAccessHighDays: high,
      noAccessImmediateDays: immediate,
      minimumGrade: boundedNumber(settings.minimumGrade, DEFAULT_SETTINGS.minimumGrade, 0, 100),
      recoveryMin,
      recoveryMax,
      closingWarningDays: Math.round(boundedNumber(settings.closingWarningDays, DEFAULT_SETTINGS.closingWarningDays, 0, 365)),
      autoOpenPanel: Boolean(settings.autoOpenPanel),
      showFloatingButton: settings.showFloatingButton !== false,
      theme: ['system', 'light', 'dark'].includes(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme,
      panelBehavior: ['overlay', 'push'].includes(settings.panelBehavior) ? settings.panelBehavior : DEFAULT_SETTINGS.panelBehavior,
      retentionDays: Math.round(boundedNumber(settings.retentionDays, DEFAULT_SETTINGS.retentionDays, 7, 365)),
      storeMessageContent: Boolean(settings.storeMessageContent),
      enableAutomaticCourseScan: Boolean(settings.enableAutomaticCourseScan),
      enableAutomaticCategoryScan: Boolean(settings.enableAutomaticCategoryScan),
      forcePortuguese: Boolean(settings.forcePortuguese),
      activeUcName: '',
      activeUcSectionId: '',
      activeUcEndDate: ''
    };
  };

  const contextKey = (suffix, courseId = MAT.state.course?.id) => {
    const host = location.hostname.replace(/\W+/g, '_');
    return `mat_${host}_${courseId || 'sem_curso'}_${suffix}`;
  };

  const loadSettings = async () => {
    const data = await get(['mat_global_settings']);
    const saved = data.mat_global_settings || {};
    return normalizeSettings(saved);
  };

  const saveSettings = async (settings) => {
    const currentCourseConfig = {
      activeUcName: settings.activeUcName || MAT.state.settings?.activeUcName || '',
      activeUcSectionId: settings.activeUcSectionId || MAT.state.settings?.activeUcSectionId || '',
      activeUcEndDate: settings.activeUcEndDate || MAT.state.settings?.activeUcEndDate || ''
    };
    const globalSafe = normalizeSettings(settings);
    await set({ mat_global_settings: globalSafe });
    MAT.state.settings = { ...globalSafe, ...currentCourseConfig };
    return MAT.state.settings;
  };

  const loadCourseConfig = async (courseId) => {
    const key = contextKey('course_config', courseId);
    const data = await get([key]);
    return data[key] || { activeUcName: '', activeUcSectionId: '', activeUcEndDate: '' };
  };

  const saveCourseConfig = async (config, courseId) => {
    const key = contextKey('course_config', courseId);
    const safe = {
      activeUcName: config.activeUcName || '',
      activeUcSectionId: config.activeUcSectionId || '',
      activeUcEndDate: config.activeUcEndDate || '',
      updatedAt: new Date().toISOString()
    };
    await set({ [key]: safe });
    return safe;
  };

  const loadSnapshot = async (courseId) => {
    const key = contextKey('snapshot', courseId);
    const data = await get([key]);
    return data[key] || null;
  };

  const saveSnapshot = async (snapshot, courseId) => {
    const key = contextKey('snapshot', courseId || snapshot?.course?.id);
    const normalized = { ...snapshot };
    delete normalized.gradebook;
    await set({ [key]: normalized });
    return snapshot;
  };

  const loadGradebook = async (courseId) => {
    const key = contextKey('gradebook', courseId);
    const data = await get([key]);
    return data[key] || null;
  };

  const saveGradebook = async (gradebook, courseId) => {
    const key = contextKey('gradebook', courseId || gradebook?.course?.id);
    await set({ [key]: gradebook });
    return gradebook;
  };

  const loadActions = async (courseId) => {
    const key = contextKey('actions', courseId);
    const data = await get([key]);
    return Array.isArray(data[key]) ? data[key] : [];
  };

  const saveActions = async (actions, courseId) => {
    const key = contextKey('actions', courseId);
    const cutoff = Date.now() - (MAT.state.settings?.retentionDays || DEFAULT_SETTINGS.retentionDays) * 86400000;
    const retained = actions
      .filter((item) => !item.createdAt || Date.parse(item.createdAt) >= cutoff)
      .slice(0, 200);
    await set({ [key]: retained });
    return actions;
  };

  const addAction = async (action, courseId) => {
    const actions = await loadActions(courseId);
    const safeAction = action?.type === 'comunicacao' && !MAT.state.settings?.storeMessageContent
      ? { ...action, note: 'Mensagem preparada. Conteúdo não armazenado.' }
      : action;
    const item = {
      id: `acao_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'realizada',
      ...safeAction
    };
    actions.unshift(item);
    await saveActions(actions, courseId);
    return item;
  };

  const updateAction = async (actionId, patch, courseId) => {
    const actions = await loadActions(courseId);
    const updated = actions.map((item) => item.id === actionId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    await saveActions(updated, courseId);
    return updated;
  };

  const loadChecklist = async (courseId) => {
    const key = contextKey('checklist', courseId);
    const data = await get([key]);
    return data[key] || {};
  };

  const saveChecklist = async (checklist, courseId) => {
    const key = contextKey('checklist', courseId);
    await set({ [key]: { ...checklist, updatedAt: new Date().toISOString() } });
    return checklist;
  };

  const clearCourseData = async (courseId) => {
    const all = await get(null);
    const prefix = contextKey('', courseId);
    const dynamicKeys = Object.keys(all).filter((key) => key.startsWith(prefix) && (
      key.includes('_student_communication_') || key.includes('_communication_') || key.includes('_moodle_message_draft')
    ));
    const draftIndexKeys = dynamicKeys
      .filter((key) => key.endsWith('_moodle_message_draft'))
      .map((key) => all[key]?.studentId ? draftIndexKey(all[key].studentId) : null)
      .filter(Boolean);
    await remove([
      contextKey('snapshot', courseId),
      contextKey('gradebook', courseId),
      contextKey('actions', courseId),
      contextKey('checklist', courseId),
      contextKey('course_config', courseId),
      ...dynamicKeys,
      ...draftIndexKeys
    ]);
  };


  const studentKeySuffix = (studentKey) => String(studentKey || '').replace(/\W+/g, '_');
  const communicationKey = (studentKey, courseId) => contextKey(`student_communication_${studentKeySuffix(studentKey)}`, courseId);
  const legacyCommunicationKey = (studentKey, courseId) => contextKey(`communication_${studentKeySuffix(studentKey)}`, courseId);

  const loadStudentCommunication = async (studentKey, courseId) => {
    const key = communicationKey(studentKey, courseId);
    const data = await get([key]);
    if (data[key]) return data[key];
    const legacyKey = legacyCommunicationKey(studentKey, courseId);
    const legacyData = await get([legacyKey]);
    return legacyData[legacyKey] || { phone: '' };
  };

  const saveStudentCommunication = async (studentKey, patch, courseId) => {
    const key = communicationKey(studentKey, courseId);
    const current = await loadStudentCommunication(studentKey, courseId);
    const value = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await set({ [key]: value });
    return value;
  };

  const draftKey = (courseId) => contextKey('moodle_message_draft', courseId);
  const draftIndexKey = (studentId) => contextKey(`moodle_message_draft_index_${studentKeySuffix(studentId)}`, 'sem_curso');
  const pendingDraftKey = () => contextKey('moodle_message_draft_pending', 'sem_curso');

  const saveMoodleMessageDraft = async (draft, courseId = MAT.state.course?.id) => {
    const safeCourseId = courseId || 'sem_curso';
    const key = draftKey(safeCourseId);
    const value = { ...draft, courseId: safeCourseId, createdAt: new Date().toISOString(), storageKey: key };
    const indexKey = draftIndexKey(draft.studentId);
    await set({
      [key]: value,
      [indexKey]: { storageKey: key, createdAt: value.createdAt },
      [pendingDraftKey()]: value
    });
    return value;
  };

  const loadMoodleMessageDraft = async (studentId = null) => {
    const courseId = MAT.state.course?.id;
    if (courseId) {
      const key = draftKey(courseId);
      const data = await get([key]);
      if (data[key]) return data[key];
    }
    if (studentId) {
      const indexKey = draftIndexKey(studentId);
      const indexData = await get([indexKey]);
      const key = indexData[indexKey]?.storageKey;
      if (key) {
        const data = await get([key]);
        if (data[key]) return data[key];
      }
    }
    const pendingKey = pendingDraftKey();
    const pendingData = await get([pendingKey]);
    return pendingData[pendingKey] || null;
  };

  const clearMoodleMessageDraft = async (draft = null) => {
    if (!draft?.storageKey || !draft.studentId) return;
    await remove([draft.storageKey, draftIndexKey(draft.studentId), pendingDraftKey()]);
  };

  const getStorageUsage = async () => {
    const area = storageArea();
    if (!area?.getBytesInUse) return { bytes: JSON.stringify(memoryStorage).length, quota: null };
    const bytes = await new Promise((resolve, reject) => {
      area.getBytesInUse(null, (value) => {
        const error = globalThis.chrome?.runtime?.lastError;
        if (error) return reject(new Error(`Falha ao medir armazenamento: ${error.message}`));
        resolve(value || 0);
      });
    });
    return { bytes, quota: area.QUOTA_BYTES || 10 * 1024 * 1024 };
  };

  const purgeExpiredData = async (retentionDays = MAT.state.settings?.retentionDays || DEFAULT_SETTINGS.retentionDays) => {
    const all = await get(null);
    const cutoff = Date.now() - boundedNumber(retentionDays, DEFAULT_SETTINGS.retentionDays, 7, 365) * 86400000;
    const expired = Object.entries(all).filter(([key, value]) => {
      if (!key.startsWith('mat_') || key === 'mat_global_settings') return false;
      const date = Array.isArray(value)
        ? value[0]?.updatedAt || value[0]?.createdAt
        : value?.updatedAt || value?.createdAt || value?.meta?.collectedAt || value?.collectedAt;
      return date && Number.isFinite(Date.parse(date)) && Date.parse(date) < cutoff;
    }).map(([key]) => key);
    if (expired.length) await remove(expired);
    return expired.length;
  };

  MAT.storage = {
    DEFAULT_SETTINGS,
    normalizeSettings,
    loadSettings,
    saveSettings,
    loadCourseConfig,
    saveCourseConfig,
    loadSnapshot,
    saveSnapshot,
    loadGradebook,
    saveGradebook,
    loadActions,
    saveActions,
    addAction,
    updateAction,
    loadChecklist,
    saveChecklist,
    clearCourseData,
    loadStudentCommunication,
    saveStudentCommunication,
    saveMoodleMessageDraft,
    loadMoodleMessageDraft,
    clearMoodleMessageDraft,
    getStorageUsage,
    purgeExpiredData
  };
})();
