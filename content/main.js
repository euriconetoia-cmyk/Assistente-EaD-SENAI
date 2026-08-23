'use strict';

(() => {
  const MAT = globalThis.MAT;

  // O launcher fica disponível em todos os hosts suportados.
  // A análise acadêmica continua disponível somente quando um curso puder ser identificado.
  const isSupportedMoodlePage = () => ['ead.fieg.com.br', 'ead.senai.br'].includes(location.hostname.toLowerCase());
  const canShowAssistant = () => isSupportedMoodlePage();
  const COURSE_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
  const SNAPSHOT_SCHEMA_VERSION = 5;

  const isSnapshotFresh = (snapshot, now = Date.now()) => {
    const collectedAt = Date.parse(snapshot?.meta?.collectedAt || '');
    return snapshot?.schemaVersion >= SNAPSHOT_SCHEMA_VERSION
      && Number.isFinite(collectedAt)
      && now >= collectedAt
      && now - collectedAt < COURSE_CACHE_MAX_AGE_MS;
  };

  const normalizeCachedStudentNames = (snapshot) => {
    const normalizeRecord = (record) => {
      if (!record || typeof record !== 'object') return;
      if (typeof record.name === 'string') record.name = MAT.utils.cleanStudentName(record.name);
      if (typeof record.studentName === 'string') record.studentName = MAT.utils.cleanStudentName(record.studentName);
    };
    (snapshot?.participants || []).forEach(normalizeRecord);
    (snapshot?.students || []).forEach(normalizeRecord);
    (snapshot?.grades || []).forEach(normalizeRecord);
    (snapshot?.assignments || []).forEach((assignment) => (assignment.gradingRows || []).forEach(normalizeRecord));
    (snapshot?.gradebook?.students || []).forEach(normalizeRecord);
    return snapshot;
  };

  const removeAssistantUi = () => {
    MAT.state.isOpen = false;
    document.getElementById('mat-assistant-host')?.remove();
    document.documentElement.classList.remove('mat-assistant-page-open');
    document.body?.classList.remove('mat-assistant-page-open');
  };

  const initializeContext = async () => {
    if (!canShowAssistant()) {
      removeAssistantUi();
      return;
    }

    MAT.state.adapter = MAT.adapters.createAdapter();
    MAT.state.course = MAT.state.adapter.detectCourse(document);
    MAT.state.isMoodleAuthoring = MAT.utils.isMoodleAuthoringPage(document);

    let globalSettings;
    try {
      globalSettings = await MAT.storage.loadSettings();
    } catch (error) {
      globalSettings = MAT.storage.normalizeSettings({});
      MAT.state.storageError = error.message || 'Falha ao acessar o armazenamento local.';
    }
    MAT.state.settings = globalSettings;
    try { await MAT.storage.purgeExpiredData(globalSettings.retentionDays); }
    catch (error) { MAT.state.storageError = error.message || 'Falha ao aplicar a retenção local.'; }
    MAT.ui.makeLauncher();
    MAT.dom.getElementById('mat-launcher').style.display = MAT.state.settings.showFloatingButton ? 'flex' : 'none';
    if (MAT.state.isMoodleAuthoring) {
      MAT.ui.removePanel?.();
      return;
    }

    try { MAT.state.snapshot = MAT.state.course.id ? await MAT.storage.loadSnapshot(MAT.state.course.id) : null; }
    catch (error) { MAT.state.snapshot = null; MAT.state.storageError = error.message; }
    try { MAT.state.gradebook = MAT.state.course.id ? await MAT.storage.loadGradebook(MAT.state.course.id) : null; }
    catch (error) { MAT.state.gradebook = null; MAT.state.storageError = error.message; }
    normalizeCachedStudentNames(MAT.state.snapshot);
    normalizeCachedStudentNames({ gradebook: MAT.state.gradebook });
    if (!MAT.state.gradebook && MAT.state.snapshot?.gradebook) MAT.state.gradebook = MAT.state.snapshot.gradebook;

    let courseConfig = {};
    try { courseConfig = MAT.state.course.id ? await MAT.storage.loadCourseConfig(MAT.state.course.id) : {}; }
    catch (error) { MAT.state.storageError = error.message; }
    if (MAT.state.snapshot && !courseConfig.activeUcName && !courseConfig.activeUcSectionId && !courseConfig.activeUcEndDate) {
      courseConfig = {
        activeUcName: MAT.state.snapshot.course?.activeUcName || '',
        activeUcSectionId: MAT.state.snapshot.course?.activeUcSectionId || '',
        activeUcEndDate: MAT.state.snapshot.course?.activeUcEndDate || ''
      };
      if (courseConfig.activeUcName || courseConfig.activeUcSectionId || courseConfig.activeUcEndDate) {
        try { await MAT.storage.saveCourseConfig(courseConfig, MAT.state.course.id); }
        catch (error) { MAT.state.storageError = error.message; }
      }
    }

    MAT.state.settings = { ...globalSettings, ...courseConfig };
    if (MAT.state.snapshot) {
      MAT.state.snapshot.course = {
        ...MAT.state.snapshot.course,
        activeUcName: MAT.state.settings.activeUcName || MAT.state.snapshot.course?.activeUcName || '',
        activeUcSectionId: MAT.state.settings.activeUcSectionId || MAT.state.snapshot.course?.activeUcSectionId || '',
        activeUcEndDate: MAT.state.settings.activeUcEndDate || MAT.state.snapshot.course?.activeUcEndDate || ''
      };
      if (MAT.state.gradebook) MAT.state.snapshot.gradebook = MAT.state.gradebook;
      MAT.state.snapshot = MAT.rules.enrichSnapshot(MAT.state.snapshot, MAT.state.settings);
      try { await MAT.storage.saveSnapshot(MAT.state.snapshot, MAT.state.course.id); }
      catch (error) { MAT.state.storageError = error.message; }
    }
    try { MAT.state.actions = MAT.state.course.id ? await MAT.storage.loadActions(MAT.state.course.id) : []; }
    catch (error) { MAT.state.actions = []; MAT.state.storageError = error.message; }

    MAT.ui.makePanel();
    MAT.ui.setLauncherPassive?.(false);
    MAT.dom.getElementById('mat-launcher').style.display = MAT.state.settings.showFloatingButton ? 'flex' : 'none';
    MAT.ui.renderAll();
    if (MAT.state.storageError) MAT.ui.toast(MAT.state.storageError, 'error');

    if (MAT.state.settings.autoOpenPanel) MAT.ui.openPanel({ refresh: true });
  };

  const refreshAnalysis = async () => {
    if (MAT.state.isMoodleAuthoring || MAT.state.isCollecting || MAT.state.isCollectingGrades) return;
    if (!MAT.state.course?.id) {
      MAT.ui.toast('Abra a página de um curso para iniciar a análise.');
      return;
    }

    const collectedCourse = { ...MAT.state.course };
    const collectedHost = location.hostname;
    MAT.ui.setBusy(true);
    MAT.ui.showProgress({ message: 'Preparando a leitura do curso', percent: 1 });
    try {
      const snapshot = await MAT.collectors.collectSnapshot({
        adapter: MAT.state.adapter,
        course: collectedCourse,
        settings: MAT.state.settings,
        onProgress: MAT.ui.showProgress
      });
      if (location.hostname !== collectedHost || MAT.state.course?.id !== collectedCourse.id) {
        MAT.ui.toast('O contexto do curso mudou durante a análise. O resultado foi descartado para evitar misturar dados.');
        return;
      }
      MAT.state.snapshot = snapshot;
      MAT.state.gradebook = snapshot.gradebook || MAT.state.gradebook;
      await MAT.storage.saveSnapshot(snapshot, collectedCourse.id);
      if (MAT.state.gradebook) await MAT.storage.saveGradebook(MAT.state.gradebook, collectedCourse.id);
      MAT.state.actions = await MAT.storage.loadActions(collectedCourse.id);
      MAT.ui.renderAll();
      const gradingMessage = snapshot.summary.pendingGrading > 0
        ? `${snapshot.summary.pendingGrading} correção(ões) pendente(s)`
        : snapshot.summary.activitiesUnverified > 0
          ? `${snapshot.summary.activitiesUnverified} atividade(s) ainda precisam de conferência`
          : 'ausência de correções pendentes confirmada';
      MAT.ui.toast(`Análise concluída: ${snapshot.summary.assignments} atividade(s), ${snapshot.summary.delivered} entrega(s), ${snapshot.summary.corrected} corrigida(s) e ${gradingMessage}.`);
    } catch (error) {
      console.error('[Assistente EaD] Falha na análise', error);
      MAT.ui.toast(`Não foi possível concluir a análise: ${error.message || error}`);
    } finally {
      MAT.ui.setBusy(false);
      setTimeout(() => MAT.ui.hideProgress(), 1200);
    }
  };

  const refreshGrades = async (downloadFormat = '') => {
    if (MAT.state.isMoodleAuthoring || MAT.state.isCollecting || MAT.state.isCollectingGrades) return;
    if (!MAT.state.course?.id) {
      MAT.ui.toast('Abra um curso para emitir o relatório de notas.');
      return;
    }

    const collectedCourse = { ...MAT.state.course };
    const collectedHost = location.hostname;
    MAT.state.isCollectingGrades = true;
    MAT.ui.renderView('notas');
    MAT.ui.showProgress({ message: 'Preparando o relatório de notas', percent: 1 });
    try {
      const result = await MAT.collectors.collectGradebookReport({
        adapter: MAT.state.adapter,
        course: collectedCourse,
        settings: MAT.state.settings,
        onProgress: MAT.ui.showProgress
      });
      if (location.hostname !== collectedHost || MAT.state.course?.id !== collectedCourse.id) {
        MAT.ui.toast('O contexto do curso mudou durante a leitura das notas. O resultado foi descartado para evitar misturar dados.');
        return;
      }
      MAT.state.gradebook = result.gradebook;
      await MAT.storage.saveGradebook(result.gradebook, collectedCourse.id);

      if (MAT.state.snapshot) {
        MAT.state.snapshot.gradebook = result.gradebook;
        MAT.state.snapshot.grades = result.grades;
        const participants = MAT.state.snapshot.participants?.length ? MAT.state.snapshot.participants : result.participants;
        MAT.state.snapshot.students = MAT.collectors.buildStudents(participants || [], MAT.state.snapshot.assignments || [], result.grades || []);
        MAT.state.snapshot.meta = {
          ...MAT.state.snapshot.meta,
          warnings: [...new Set([...(MAT.state.snapshot.meta?.warnings || []), ...(result.warnings || [])])]
        };
        MAT.state.snapshot = MAT.rules.enrichSnapshot(MAT.state.snapshot, MAT.state.settings);
        await MAT.storage.saveSnapshot(MAT.state.snapshot, collectedCourse.id);
      }

      MAT.ui.renderAll();
      MAT.ui.setTab('notas');
      const report = result.gradebook;
      if (!report?.items?.length) {
        MAT.ui.toast('O livro de notas não foi reconhecido. Abra o livro de notas do Moodle e tente novamente.');
      } else {
        if (downloadFormat === 'excel') MAT.exporters.exportGradebookExcel(report, MAT.state.settings);
        if (downloadFormat === 'csv') MAT.exporters.exportGradebookCsv(report, MAT.state.settings);
        MAT.ui.toast(`Relatório pronto: ${report.summary.studentCount} aluno(s) e ${report.summary.itemCount} item(ns) de nota${downloadFormat ? ', com download iniciado' : ''}.`);
      }
    } catch (error) {
      console.error('[Assistente EaD] Falha no relatório de notas', error);
      MAT.ui.toast(`Não foi possível emitir o relatório de notas: ${error.message || error}`);
    } finally {
      MAT.state.isCollectingGrades = false;
      MAT.ui.renderView('notas');
      setTimeout(() => MAT.ui.hideProgress(), 1200);
    }
  };


  const tryFillMoodleMessageDraft = async () => {
    if (!/\/message\//i.test(location.pathname)) return;
    const explicitUserId = MAT.utils.getQueryNumber(location.href, 'user2')
      || MAT.utils.getQueryNumber(location.href, 'userid')
      || MAT.utils.getQueryNumber(location.href, 'user');
    const routeId = MAT.utils.getQueryNumber(location.href, 'id');
    const currentUserId = explicitUserId || routeId;
    const draft = await MAT.storage.loadMoodleMessageDraft(currentUserId);
    if (!draft || draft.host !== location.hostname) return;
    if (Date.now() - new Date(draft.createdAt || 0).getTime() > 10 * 60 * 1000) {
      await MAT.storage.clearMoodleMessageDraft(draft);
      return;
    }
    // Em algumas versões do Moodle, "id" identifica a conversa, não o usuário.
    // Só bloqueamos o rascunho quando a própria rota informa explicitamente o usuário.
    if (draft.studentId && explicitUserId && Number(draft.studentId) !== Number(explicitUserId)) return;

    const selectors = [
      'textarea[data-region="send-message-txt"]',
      '[data-region="send-message-area"] textarea',
      'textarea[data-region*="message"]',
      'textarea[placeholder*="mensagem" i]',
      'textarea[aria-label*="mensagem" i]',
      '[data-region="message-drawer"] textarea',
      '.message-app textarea',
      '[contenteditable="true"][data-region*="message"]',
      '[contenteditable="true"][aria-label*="mensagem" i]',
      '[contenteditable="true"][role="textbox"]'
    ];
    const findMessageField = () => {
      const direct = selectors
        .flatMap((selector) => [...document.querySelectorAll(selector)])
        .find((field) => !field.disabled && field.getAttribute('aria-hidden') !== 'true');
      if (direct) return direct;
      for (const frame of document.querySelectorAll('iframe[title*="mensagem" i], iframe[data-region*="message"]')) {
        try {
          const body = frame.contentDocument?.body;
          if (body?.isContentEditable || body?.getAttribute('contenteditable') === 'true') return body;
        } catch (_) {
          // Iframes de outra origem não são acessíveis e são ignorados.
        }
      }
      return null;
    };
    const fillMessageField = (field, message) => {
      field.focus();
      if ('value' in field) {
        const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(field, message);
        else field.value = message;
      } else {
        field.textContent = message;
      }
      const inputEvent = typeof InputEvent === 'function'
        ? new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message })
        : new Event('input', { bubbles: true });
      field.dispatchEvent(inputEvent);
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return ('value' in field ? field.value : field.textContent || '').trim() === message.trim();
    };
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const field = findMessageField();
      if (field) {
        const confirmed = fillMessageField(field, draft.message);
        if (!confirmed) {
          if (attempts >= 60) {
            clearInterval(timer);
            MAT.ui?.toast('O Moodle não aceitou o preenchimento automático. O texto foi preservado para uma nova tentativa.');
          }
          return;
        }
        clearInterval(timer);
        await MAT.storage.clearMoodleMessageDraft(draft);
        MAT.ui?.toast('Mensagem preparada no Moodle. Revise antes de enviar.');
      } else if (attempts >= 60) {
        clearInterval(timer);
        MAT.ui?.toast('Não foi possível localizar o campo de mensagem. O texto foi preservado para uma nova tentativa.');
      }
    }, 500);
  };

  // O painel do Assistente fica fixo com z-index muito alto para sempre ficar visivel.
  // Isso faz com que ele fique por cima de janelas nativas do Moodle (ex.: a caixa de
  // "Enviar mensagem" aberta a partir da lista de participantes, que tambem aparece do
  // lado direito da tela), bloqueando cliques e digitacao nelas. Para evitar isso,
  // observamos o DOM e recolhemos o painel automaticamente assim que um dialogo/drawer
  // nativo do Moodle for detectado.
  const NATIVE_MODAL_SELECTOR = [
    '.modal.show',                        // Diálogos Bootstrap (Boost e temas derivados)
    '.moodle-dialogue-base:not(.hidden)',  // Diálogos antigos baseados em YUI
    '[data-region="drawer"].show'         // Drawers do tema Boost (ex.: mensagens)
  ].join(', ');

  const isNativeMoodleOverlayOpen = () => {
    try {
      const body = document.body;
      if (!body) return false;
      if (typeof body.classList?.contains === 'function' && body.classList.contains('modal-open')) return true;
      const classNameString = typeof body.className === 'string'
        ? body.className
        : (typeof body.classList?.value === 'string' ? body.classList.value : '');
      if (classNameString && /drawer-open/i.test(classNameString)) return true;
      if (typeof document.querySelector === 'function' && document.querySelector(NATIVE_MODAL_SELECTOR)) return true;
      return false;
    } catch (_) {
      return false;
    }
  };

  let lastNativeOverlayToastAt = 0;
  const closePanelIfNativeOverlayOpen = () => {
    if (!MAT.state.isOpen) return;
    if (!isNativeMoodleOverlayOpen()) return;
    MAT.ui.closePanel?.();
    if (Date.now() - lastNativeOverlayToastAt > 4000) {
      lastNativeOverlayToastAt = Date.now();
      MAT.ui.toast?.('O painel do Assistente foi recolhido para nao bloquear uma janela do Moodle. Abra novamente quando terminar.');
    }
  };

  const startNativeOverlayWatcher = () => {
    if (typeof MutationObserver !== 'undefined' && document?.body) {
      try {
        const observer = new MutationObserver(closePanelIfNativeOverlayOpen);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: false });
      } catch (_) { /* ambiente sem suporte completo a MutationObserver */ }
    }
    closePanelIfNativeOverlayOpen();
  };

  let lastContextKey = `${location.pathname}${location.search}`;
  let lastMoodleAuthoring = MAT.utils.isMoodleAuthoringPage(document);
  const reinitializeIfContextChanged = async () => {
    const contextKey = `${location.pathname}${location.search}`;
    const currentCourseId = MAT.utils.parseCourseId(document) || null;
    const knownCourseId = MAT.state.course?.id || null;
    const isMoodleAuthoring = MAT.utils.isMoodleAuthoringPage(document);
    MAT.ui?.syncPageLayout?.();
    closePanelIfNativeOverlayOpen();
    if (contextKey !== lastContextKey || currentCourseId !== knownCourseId || isMoodleAuthoring !== lastMoodleAuthoring) {
      lastContextKey = contextKey;
      lastMoodleAuthoring = isMoodleAuthoring;
      await initializeContext();
      await tryFillMoodleMessageDraft();
    }
  };

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender?.id !== chrome.runtime.id) return;
    if (message?.type === 'MAT_TOGGLE_PANEL' && canShowAssistant() && !MAT.state.isMoodleAuthoring) MAT.ui.togglePanel({ refresh: true });
  });

  MAT.main = { initializeContext, refreshAnalysis, refreshGrades, isSnapshotFresh, COURSE_CACHE_MAX_AGE_MS, SNAPSHOT_SCHEMA_VERSION, normalizeCachedStudentNames };

  initializeContext().then(() => tryFillMoodleMessageDraft()).catch((error) => console.error('[Assistente EaD] Falha na inicialização', error));
  setInterval(reinitializeIfContextChanged, 1800);
  startNativeOverlayWatcher();
})();
