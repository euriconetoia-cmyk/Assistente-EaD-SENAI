'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;
  const pageDocument = globalThis.document;
  const document = {
    createElement: (...args) => pageDocument.createElement(...args),
    getElementById: (id) => MAT.dom.getElementById(id),
    querySelector: (selector) => MAT.dom.querySelector(selector),
    querySelectorAll: (selector) => MAT.dom.querySelectorAll(selector),
    addEventListener: (...args) => pageDocument.addEventListener(...args),
    execCommand: (...args) => pageDocument.execCommand(...args),
    get activeElement() { return MAT.dom.ensureHost().activeElement || pageDocument.activeElement; },
    body: pageDocument.body,
    documentElement: {
      appendChild: (node) => MAT.dom.append(node),
      classList: pageDocument.documentElement.classList
    }
  };

  const riskLabel = (level) => ({
    imediato: 'Ação imediata',
    alto: 'Risco alto',
    atencao: 'Atenção',
    regular: 'Regular'
  }[level] || level || 'Não classificado');

  const riskBadge = (level) => `<span class="mat-badge mat-risk-${U.escapeHtml(level || 'regular')}">${U.escapeHtml(riskLabel(level))}</span>`;

  const statusBadge = (metrics = {}) => `<span class="mat-badge mat-risk-${U.escapeHtml(metrics.statusLevel || 'atencao')}">${U.escapeHtml(metrics.status || 'Sem dados')}</span>`;

  const metricCard = (label, value, hint, tone = '') => `
    <div class="mat-card mat-kpi ${tone ? `mat-kpi-${tone}` : ''}">
      <div class="mat-kpi-label">${U.escapeHtml(label)}</div>
      <div class="mat-kpi-value">${U.escapeHtml(value === null || value === undefined ? 'Dados indisponíveis' : value)}</div>
      <div class="mat-kpi-hint">${U.escapeHtml(hint)}</div>
    </div>`;

  const metricValue = (value) => Number.isFinite(value) ? String(value) : 'Dados indisponíveis';
  const rateValue = (value) => Number.isFinite(value) ? `${value}%` : 'Dados indisponíveis';

  const navIcon = (name) => ({
    hoje: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.2 12 4l8 7.2V20h-5v-5H9v5H4z"/></svg>',
    alunos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0c-1 0-2 .2-2.8.6 1.7 1.2 2.8 3.2 2.8 5.4v1h6v-1c0-3.3-2.7-6-6-6ZM8 15c-3.3 0-6 2.7-6 6h12c0-3.3-2.7-6-6-6Z"/></svg>',
    correcoes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h10V6H7v2Zm0 5h4v-2H7v2Zm0 4h7v-2H7v2Zm9.7-5.7-3.2 3.2-1.2-1.2-1.4 1.4 2.6 2.6 4.6-4.6-1.4-1.4Z"/></svg>',
    notas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16v18H4V3Zm3 4v2h10V7H7Zm0 4v2h6v-2H7Zm0 4v2h4v-2H7Zm9.6-.9-2.1 2.1-1-1-1.4 1.4 2.4 2.4 3.5-3.5-1.4-1.4Z"/></svg>',
    historico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1-8.5 6H1l3.5-4L8 9H5.6A7 7 0 1 0 12 5v4l4 2.4-1 1.7-5-3V3h2Z"/></svg>',
    mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    curso: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h8l2 2h8v12H3V5Zm2 4v8h14V9H5Z"/></svg>',
    fechamento: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v2h3v16H4V5h3V3Zm2 2h6V4H9v1Zm-2 4v2h10V9H7Zm0 4v2h7v-2H7Z"/></svg>',
    diagnostico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v3.1a7 7 0 0 1 3 1.3l2.2-2.2 1.4 1.4-2.2 2.2a7 7 0 0 1 1.4 3H22v2h-3.2a7 7 0 0 1-1.4 3l2.2 2.2-1.4 1.4-2.2-2.2a7 7 0 0 1-3 1.4V22h-2v-3.2a7 7 0 0 1-3-1.4l-2.2 2.2-1.4-1.4 2.2-2.2a7 7 0 0 1-1.4-3H2v-2h3.2a7 7 0 0 1 1.4-3L4.4 5.6l1.4-1.4L8 6.4a7 7 0 0 1 3-1.3V2Zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>'
  }[name] || '');

  const rateBar = (value, label) => `
    <div class="mat-rate">
      <div class="mat-rate-head"><span>${U.escapeHtml(label)}</span><strong>${rateValue(value)}</strong></div>
      <div class="mat-rate-track"><span style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></span></div>
    </div>`;

  const openApprovedUrl = (url) => {
    if (!U.isAllowedNavigationUrl(url)) return toast('A URL solicitada não pertence a um destino autorizado.');
    window.open(url, '_blank', 'noopener');
  };

  const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastDetailFocus = null;

  const trapDetailFocus = (event) => {
    if (event.key !== 'Tab') return;
    const detail = document.getElementById('mat-detail');
    const overlay = document.getElementById('mat-detail-overlay');
    if (!detail || !overlay?.classList.contains('mat-visible')) return;
    const focusable = [...detail.querySelectorAll(focusableSelector)].filter((node) => !node.hidden);
    if (!focusable.length) {
      event.preventDefault();
      detail.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const navigateTabsWithKeyboard = (event) => {
    const tab = event.target?.closest?.('#mat-primary-nav [data-tab]');
    if (!tab || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return false;
    const tabs = [...document.querySelectorAll('#mat-primary-nav [data-tab]')].filter((item) => !item.hidden);
    const currentIndex = tabs.indexOf(tab);
    if (currentIndex < 0) return false;
    let targetIndex = currentIndex;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = tabs.length - 1;
    event.preventDefault();
    tabs[targetIndex].focus();
    setTab(tabs[targetIndex].dataset.tab);
    return true;
  };

  const handleKeyboard = (event) => {
    if (navigateTabsWithKeyboard(event)) return;
    if (event.key === 'Escape') {
      if (document.getElementById('mat-detail-overlay')?.classList.contains('mat-visible')) return closeDetail();
      if (MAT.state.isOpen) return closePanel();
    }
    trapDetailFocus(event);
  };

  const setLauncherPassive = (passive = MAT.state.isMoodleAuthoring) => {
    const launcher = document.getElementById('mat-launcher');
    if (!launcher) return;
    launcher.classList.toggle('mat-launcher-passive', Boolean(passive));
    launcher.setAttribute('aria-disabled', String(Boolean(passive)));
    launcher.title = passive ? 'Assistente indisponível durante a edição do Moodle' : 'Abrir Assistente EaD SENAI';
  };

  const makeLauncher = () => {
    if (document.getElementById('mat-launcher')) {
      setLauncherPassive();
      return;
    }
    const button = document.createElement('button');
    button.id = 'mat-launcher';
    button.type = 'button';
    button.title = 'Abrir Assistente EaD SENAI';
    button.setAttribute('aria-label', 'Abrir Assistente EaD SENAI');
    button.innerHTML = `<span class="mat-launcher-icon" aria-hidden="true"><img src="${chrome.runtime.getURL('assets/icon32.png')}" alt=""></span><span class="mat-launcher-label">Assistente</span><span class="mat-launcher-count" hidden>0</span>`;
    button.addEventListener('click', () => {
      if (!MAT.state.isMoodleAuthoring) togglePanel({ refresh: true });
    });
    document.documentElement.appendChild(button);
    setLauncherPassive();
  };

  const makePanel = () => {
    if (document.getElementById('mat-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'mat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'mat-panel-title');
    panel.setAttribute('aria-label', 'Assistente EaD SENAI');
    panel.innerHTML = `
      <header class="mat-header">
        <div class="mat-header-top">
          <div class="mat-brand">
            <div class="mat-brand-name">Assistente EaD SENAI</div>
            <h2 class="mat-course-name" id="mat-panel-title">Detectando curso atual</h2>
            <div class="mat-meta-line">
              <span class="mat-env-badge" id="mat-env-badge">Moodle</span>
              <span class="mat-operation-badge" id="mat-operation-badge">Pronto</span>
              <span id="mat-last-update">Sem análise salva</span>
            </div>
          </div>
          <button class="mat-close" id="mat-close" type="button" title="Fechar" aria-label="Fechar assistente">×</button>
        </div>
        <div class="mat-toolbar">
          <button class="mat-btn mat-btn-primary mat-refresh-button" id="mat-refresh" type="button">${navIcon('historico')}<span>Atualizar</span></button>
          <button class="mat-btn mat-btn-ghost mat-icon-action" id="mat-open-course" type="button" aria-label="Abrir curso" title="Abrir curso">${navIcon('curso')}<span class="mat-action-label">Abrir curso</span></button>
          <button class="mat-btn mat-btn-ghost mat-icon-action" id="mat-header-options" type="button" aria-expanded="false" aria-controls="mat-header-menu" title="Opções de análise">${navIcon('mais')}<span class="mat-sr-only">Opções de análise</span></button>
          <div class="mat-header-menu" id="mat-header-menu" hidden>
            <label for="mat-analysis-mode">Modo de análise</label>
            <select class="mat-mode-select" id="mat-analysis-mode" aria-label="Modo de análise"><option value="complete">Completa</option><option value="quick">Rápida</option></select>
            <button class="mat-menu-action" data-tab="diagnostico" type="button">Configurações e diagnóstico</button>
          </div>
        </div>
        <div class="mat-progress-wrap" id="mat-progress-wrap">
          <div class="mat-progress-label" role="status" aria-live="polite" aria-atomic="true"><span id="mat-progress-message">Preparando</span><strong id="mat-progress-percent">0%</strong></div>
          <div class="mat-progress"><span id="mat-progress-bar"></span></div>
        </div>
      </header>
      <div class="mat-workspace">
      <nav class="mat-side-nav" id="mat-primary-nav" aria-label="Seções do assistente">
        <button class="mat-nav-toggle" id="mat-nav-toggle" type="button" aria-label="Expandir menu" aria-expanded="false">${navIcon('mais')}<span class="mat-nav-label">Recolher</span></button>
        <div class="mat-nav-main">
          <button class="mat-nav-item mat-active" id="mat-tab-hoje" data-tab="hoje" type="button" aria-current="page" aria-controls="mat-view-hoje" title="Visão geral">${navIcon('hoje')}<span class="mat-nav-label">Visão geral</span></button>
          <button class="mat-nav-item" id="mat-tab-alunos" data-tab="alunos" type="button" aria-controls="mat-view-alunos" title="Alunos">${navIcon('alunos')}<span class="mat-nav-label">Alunos</span><span class="mat-nav-count" id="mat-nav-student-count" hidden>0</span></button>
          <button class="mat-nav-item" id="mat-tab-correcoes" data-tab="correcoes" type="button" aria-controls="mat-view-correcoes" title="Correções">${navIcon('correcoes')}<span class="mat-nav-label">Correções</span><span class="mat-nav-count" id="mat-nav-correction-count" hidden>0</span></button>
          <button class="mat-nav-item" id="mat-tab-notas" data-tab="notas" type="button" aria-controls="mat-view-notas" title="Notas">${navIcon('notas')}<span class="mat-nav-label">Notas</span></button>
          <button class="mat-nav-item" id="mat-tab-historico" data-tab="historico" type="button" aria-controls="mat-view-historico" title="Auditoria">${navIcon('historico')}<span class="mat-nav-label">Auditoria</span></button>
        </div>
        <div class="mat-nav-secondary">
          <button class="mat-nav-item" id="mat-tab-curso" data-tab="curso" type="button" aria-controls="mat-view-curso" title="Curso e UC">${navIcon('curso')}<span class="mat-nav-label">Curso e UC</span></button>
          <button class="mat-nav-item" id="mat-tab-fechamento" data-tab="fechamento" type="button" aria-controls="mat-view-fechamento" title="Fechamento">${navIcon('fechamento')}<span class="mat-nav-label">Fechamento</span></button>
          <button class="mat-nav-item" id="mat-tab-diagnostico" data-tab="diagnostico" type="button" aria-controls="mat-view-diagnostico" title="Diagnóstico">${navIcon('diagnostico')}<span class="mat-nav-label">Diagnóstico</span></button>
        </div>
      </nav>
      <main class="mat-content" id="mat-content" tabindex="-1">
        <section class="mat-view mat-active" id="mat-view-hoje" data-view="hoje" role="tabpanel" aria-labelledby="mat-tab-hoje" aria-hidden="false"></section>
        <section class="mat-view" id="mat-view-curso" data-view="curso" role="tabpanel" aria-labelledby="mat-tab-curso" aria-hidden="true"></section>
        <section class="mat-view" id="mat-view-alunos" data-view="alunos" role="tabpanel" aria-labelledby="mat-tab-alunos" aria-hidden="true"></section>
        <section class="mat-view" id="mat-view-correcoes" data-view="correcoes" role="tabpanel" aria-labelledby="mat-tab-correcoes" aria-hidden="true"></section>
        <section class="mat-view" id="mat-view-notas" data-view="notas" role="tabpanel" aria-labelledby="mat-tab-notas" aria-hidden="true"></section>
        <section class="mat-view" id="mat-view-fechamento" data-view="fechamento" role="tabpanel" aria-labelledby="mat-tab-fechamento" aria-hidden="true"></section>
        <section class="mat-view" id="mat-view-historico" data-view="historico" role="tabpanel" aria-labelledby="mat-tab-historico" aria-hidden="true"></section>
        <section class="mat-view" id="mat-view-diagnostico" data-view="diagnostico" role="tabpanel" aria-labelledby="mat-tab-diagnostico" aria-hidden="true"></section>
      </main></div>
      <footer class="mat-extension-credit"><span>Dados locais</span><span id="mat-sync-status" role="status">Pronto</span><a class="mat-credit-link" href="https://www.linkedin.com/in/euricocirilo/" target="_blank" rel="noopener noreferrer" aria-label="Créditos: By Eurico Cirilo">By Eurico Cirilo</a><span>V${MAT.VERSION}</span></footer>
      <div class="mat-notification" id="mat-toast" role="status" aria-live="polite" aria-atomic="true" hidden><span id="mat-toast-message"></span><button id="mat-toast-close" type="button" aria-label="Fechar notificação">×</button></div>
      <div class="mat-detail-overlay" id="mat-detail-overlay" aria-hidden="true">
        <article class="mat-detail" id="mat-detail" role="dialog" aria-modal="true" aria-label="Detalhes" tabindex="-1"></article>
      </div>
    `;
    document.documentElement.appendChild(panel);

    bindBaseEvents();
  };

  const bindBaseEvents = () => {
    const safely = (handler) => (event) => Promise.resolve(handler(event)).catch((error) => {
      MAT.state.storageError = error?.message || 'A operação não pôde ser concluída.';
      toast(MAT.state.storageError, 'error');
    });
    document.getElementById('mat-close')?.addEventListener('click', closePanel);
    document.getElementById('mat-refresh')?.addEventListener('click', () => MAT.main?.refreshAnalysis());
    document.getElementById('mat-open-course')?.addEventListener('click', () => {
      const url = MAT.state.course?.id ? MAT.state.course.url : `${location.origin}/my/`;
      openApprovedUrl(url);
    });
    document.getElementById('mat-analysis-mode')?.addEventListener('change', safely(async (event) => {
      MAT.state.settings.analysisMode = event.target.value;
      await MAT.storage.saveSettings(MAT.state.settings);
      toast(`Modo ${event.target.value === 'complete' ? 'completo' : 'rápido'} selecionado.`);
    }));
    document.getElementById('mat-primary-nav')?.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (tab) setTab(tab.dataset.tab);
    });
    document.getElementById('mat-nav-toggle')?.addEventListener('click', safely(async () => {
      const panel = document.getElementById('mat-panel');
      const expanded = !panel?.classList.contains('mat-nav-expanded');
      panel?.classList.toggle('mat-nav-expanded', expanded);
      const toggle = document.getElementById('mat-nav-toggle');
      toggle?.setAttribute('aria-expanded', String(expanded));
      toggle?.setAttribute('aria-label', expanded ? 'Recolher menu' : 'Expandir menu');
      MAT.state.settings.navigationExpanded = expanded;
      await MAT.storage.saveSettings(MAT.state.settings);
    }));
    document.getElementById('mat-header-options')?.addEventListener('click', () => {
      const menu = document.getElementById('mat-header-menu');
      const button = document.getElementById('mat-header-options');
      const open = Boolean(menu?.hidden);
      if (menu) menu.hidden = !open;
      button?.setAttribute('aria-expanded', String(open));
    });
    document.getElementById('mat-header-menu')?.addEventListener('click', (event) => {
      const target = event.target.closest('[data-tab]');
      if (!target) return;
      setTab(target.dataset.tab);
      document.getElementById('mat-header-menu').hidden = true;
      document.getElementById('mat-header-options')?.setAttribute('aria-expanded', 'false');
    });
    document.getElementById('mat-toast-close')?.addEventListener('click', () => hideToast());
    document.getElementById('mat-content')?.addEventListener('click', safely(handleContentClick));
    document.getElementById('mat-content')?.addEventListener('input', handleContentInput);
    document.getElementById('mat-content')?.addEventListener('change', safely(handleContentChange));
    document.getElementById('mat-detail-overlay')?.addEventListener('click', (event) => {
      if (event.target.id === 'mat-detail-overlay' || event.target.closest('[data-close-detail]')) closeDetail();
    });
    document.getElementById('mat-detail')?.addEventListener('click', handleDetailClick);
    document.addEventListener('keydown', handleKeyboard);
  };

  const setTab = (tabName) => {
    MAT.state.activeTab = tabName;
    document.querySelectorAll('#mat-primary-nav [data-tab]').forEach((tab) => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('mat-active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    document.querySelectorAll('#mat-content .mat-view').forEach((view) => {
      const active = view.dataset.view === tabName;
      view.classList.toggle('mat-active', active);
      view.setAttribute('aria-hidden', String(!active));
    });
    renderView(tabName);
    document.getElementById('mat-content')?.scrollTo?.({ top: 0, behavior: 'auto' });
  };

  const setPagePushState = (isOpen) => {
    const shouldPushPage = Boolean(isOpen) && MAT.state.settings?.panelBehavior === 'push' && window.innerWidth >= 1200 && !U.isMoodleEditing(pageDocument);
    document.documentElement.classList.toggle('mat-assistant-page-open', shouldPushPage);
    document.body?.classList.toggle('mat-assistant-page-open', shouldPushPage);
  };

  const syncPageLayout = () => setPagePushState(MAT.state.isOpen);

  const removePanel = () => {
    MAT.state.isOpen = false;
    document.getElementById('mat-panel')?.remove();
    setPagePushState(false);
  };

  const openPanel = ({ refresh = false } = {}) => {
    makeLauncher();
    makePanel();
    MAT.state.isOpen = true;
    document.getElementById('mat-panel')?.classList.add('mat-open');
    document.getElementById('mat-launcher')?.classList.add('mat-panel-open');
    setPagePushState(true);
    const launcherIcon = document.querySelector('#mat-launcher .mat-launcher-icon');
    if (launcherIcon) launcherIcon.textContent = '›';
    renderAll();
    document.getElementById('mat-refresh')?.focus();

    const snapshotIsFresh = MAT.main?.isSnapshotFresh?.(MAT.state.snapshot);
    if (refresh && MAT.state.course?.id && !MAT.state.isCollecting && !MAT.state.isCollectingGrades && !snapshotIsFresh) {
      window.setTimeout(() => MAT.main?.refreshAnalysis(), 120);
    } else if (refresh && snapshotIsFresh) {
      toast('Dados salvos deste curso carregados. Use Atualizar analise para consultar novamente.');
    }
  };

  const closePanel = () => {
    if (document.getElementById('mat-detail-overlay')?.classList.contains('mat-visible')) closeDetail();
    MAT.state.isOpen = false;
    document.getElementById('mat-panel')?.classList.remove('mat-open');
    document.getElementById('mat-launcher')?.classList.remove('mat-panel-open');
    setPagePushState(false);
    const launcherIcon = document.querySelector('#mat-launcher .mat-launcher-icon');
    if (launcherIcon) launcherIcon.textContent = '‹';
    document.getElementById('mat-launcher')?.focus();
  };

  const togglePanel = (options = {}) => MAT.state.isOpen ? closePanel() : openPanel(options);

  const updateLauncher = () => {
    const countNode = document.querySelector('#mat-launcher .mat-launcher-count');
    if (!countNode) return;
    const count = MAT.state.snapshot?.tasks?.filter((task) => task.priority === 'imediato' || task.priority === 'alto').length || 0;
    countNode.textContent = count > 99 ? '99+' : String(count);
    countNode.hidden = count === 0;
  };

  const updateHeader = () => {
    const course = MAT.state.course;
    const snapshot = MAT.state.snapshot;
    const settings = MAT.state.settings;
    const courseName = document.getElementById('mat-panel-title');
    const env = document.getElementById('mat-env-badge');
    const update = document.getElementById('mat-last-update');
    const mode = document.getElementById('mat-analysis-mode');
    const openCourse = document.getElementById('mat-open-course');
    const refresh = document.getElementById('mat-refresh');
    const operation = document.getElementById('mat-operation-badge');
    const panel = document.getElementById('mat-panel');
    if (courseName) courseName.textContent = course?.id ? course.name : 'Página inicial do Moodle';
    if (env) env.textContent = course?.environment || MAT.state.adapter?.environment || 'Moodle';
    if (update) update.textContent = snapshot?.meta?.collectedAt ? `Atualizado em ${U.formatDate(snapshot.meta.collectedAt, true)}` : 'Sem análise detalhada salva';
    if (mode && settings) mode.value = settings.analysisMode;
    if (openCourse) openCourse.textContent = course?.id ? 'Abrir curso' : 'Meus cursos';
    if (refresh && !MAT.state.isCollecting) {
      refresh.disabled = !course?.id;
      refresh.textContent = course?.id ? 'Atualizar análise' : 'Abra um curso';
    }
    if (operation) {
      const labels = { consulta: 'Pronto', preparacao: 'Preparando', salvamento: 'Salvando', concluido: 'Concluído' };
      operation.textContent = labels[MAT.state.operationMode] || 'Pronto';
      operation.dataset.mode = MAT.state.operationMode;
    }
    panel?.classList.toggle('mat-nav-expanded', Boolean(settings?.navigationExpanded));
    document.getElementById('mat-nav-toggle')?.setAttribute('aria-expanded', String(Boolean(settings?.navigationExpanded)));
    const correctionCount = Number(snapshot?.summary?.activitiesWithPending || 0);
    const attentionCount = Number(snapshot?.summary?.riskImmediate || 0) + Number(snapshot?.summary?.riskHigh || 0);
    const correctionBadge = document.getElementById('mat-nav-correction-count');
    const studentBadge = document.getElementById('mat-nav-student-count');
    if (correctionBadge) { correctionBadge.textContent = correctionCount > 99 ? '99+' : String(correctionCount); correctionBadge.hidden = correctionCount <= 0; }
    if (studentBadge) { studentBadge.textContent = attentionCount > 99 ? '99+' : String(attentionCount); studentBadge.hidden = attentionCount <= 0; }
    const host = MAT.dom.ensureHost().host;
    if (host && settings) host.dataset.theme = settings.theme || 'system';
  };

  const showProgress = ({ message = 'Analisando', percent = 0 } = {}) => {
    const wrap = document.getElementById('mat-progress-wrap');
    wrap?.classList.add('mat-visible');
    const label = document.getElementById('mat-progress-message');
    const value = document.getElementById('mat-progress-percent');
    const bar = document.getElementById('mat-progress-bar');
    if (label) label.textContent = message;
    if (value) value.textContent = `${percent}%`;
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  };

  const hideProgress = () => document.getElementById('mat-progress-wrap')?.classList.remove('mat-visible');

  const setBusy = (busy) => {
    MAT.state.isCollecting = busy;
    const button = document.getElementById('mat-refresh');
    if (button) {
      button.disabled = busy || !MAT.state.course?.id;
      button.textContent = busy ? 'Analisando curso' : MAT.state.course?.id ? 'Atualizar análise' : 'Abra um curso';
    }
  };

  const friendlyMessage = (message) => {
    const text = String(message || 'A operação não pôde ser concluída.');
    if (/failed to fetch|networkerror|load failed/i.test(text)) return 'Não foi possível consultar uma das páginas do Moodle. Os dados podem estar incompletos.';
    return text;
  };

  const hideToast = () => {
    const node = document.getElementById('mat-toast');
    if (!node) return;
    node.classList.remove('mat-visible');
    window.setTimeout(() => { if (!node.classList.contains('mat-visible')) node.hidden = true; }, 180);
  };

  const toast = (message, tone = '') => {
    const node = document.getElementById('mat-toast');
    if (!node) return;
    const safeMessage = friendlyMessage(message);
    const messageNode = document.getElementById('mat-toast-message');
    if (messageNode) messageNode.textContent = safeMessage;
    const inferredTone = tone || (/erro|falha|não foi|bloquead|incomplet/i.test(safeMessage) ? 'error' : 'info');
    node.dataset.tone = inferredTone;
    node.hidden = false;
    node.classList.add('mat-visible');
    clearTimeout(toast.timer);
    if (inferredTone !== 'error') toast.timer = setTimeout(hideToast, 4500);
  };

  const emptyHtml = (title, text, buttonText = 'Atualizar análise') => {
    const courseAvailable = Boolean(MAT.state.course?.id);
    return `
      <div class="mat-empty">
        <h3>${U.escapeHtml(title)}</h3>
        <p>${U.escapeHtml(text)}</p>
        <button class="mat-btn mat-btn-primary" data-action="${courseAvailable ? 'refresh' : 'open-my-courses'}" type="button">${U.escapeHtml(courseAvailable ? buttonText : 'Meus cursos')}</button>
      </div>`;
  };

  const warningsHtml = (snapshot) => {
    const warnings = snapshot?.meta?.warnings || [];
    if (!warnings.length) return '';
    const friendly = warnings.map(friendlyMessage);
    return `<details class="mat-data-quality mat-quality-warning"><summary><span><strong>Qualidade da leitura: parcial</strong><small>${friendly.length} ocorrência(s) podem afetar os resultados</small></span><span class="mat-quality-action">Ver detalhes</span></summary><div class="mat-quality-details">${friendly.map((warning) => `<p>${U.escapeHtml(warning)}</p>`).join('')}<div class="mat-form-actions"><button class="mat-btn mat-btn-sm mat-btn-primary" data-action="refresh" type="button">Tentar novamente</button><button class="mat-btn mat-btn-sm" data-action="tab" data-tab="diagnostico" type="button">Detalhes técnicos</button></div></div></details>`;
  };

  const dataState = (value, partial = false) => {
    if (partial) return { label: 'Leitura parcial', className: 'mat-risk-atencao' };
    if (Number.isFinite(value)) return { label: 'Confirmado', className: 'mat-risk-regular' };
    return { label: 'Dados indisponíveis', className: 'mat-badge-neutral' };
  };

  const operationalTimelineHtml = (snapshot) => {
    const events = [];
    if (snapshot?.meta?.collectedAt) events.push({ title: 'Análise atualizada', date: snapshot.meta.collectedAt, note: `${snapshot.summary?.assignments || 0} atividade(s) analisada(s)` });
    (MAT.state.actions || []).slice(0, 3).forEach((action) => events.push({ title: action.title || 'Ação registrada', date: action.createdAt, note: action.note || action.type || '' }));
    events.sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
    if (!events.length) return '<div class="mat-info">Nenhuma atividade recente registrada.</div>';
    return events.slice(0, 4).map((event) => `<div class="mat-activity-event"><span class="mat-event-dot" aria-hidden="true"></span><div><strong>${U.escapeHtml(event.title)}</strong><p>${U.escapeHtml(event.note)}</p></div><time>${U.escapeHtml(U.formatDate(event.date, true))}</time></div>`).join('');
  };

  const formatGrade = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : U.cleanText(value);
  };

  const gradeStatusBadge = (situation) => {
    const normalized = U.normalizeText(situation);
    const className = normalized.includes('media alcancada') ? 'mat-risk-regular'
      : normalized.includes('recuperacao') ? 'mat-risk-atencao'
        : normalized.includes('abaixo') ? 'mat-risk-imediato'
          : 'mat-badge-neutral';
    return `<span class="mat-badge ${className}">${U.escapeHtml(situation)}</span>`;
  };


  const renderHoje = () => {
    const view = document.querySelector('[data-view="hoje"]');
    if (!view) return;
    const s = MAT.state.snapshot;
    if (!s) {
      view.innerHTML = emptyHtml('Atualize o curso para analisar alunos e atividades', 'Execute a análise do curso atual para visualizar o panorama da UC, alunos e atividades. O relatório completo de notas está disponível exclusivamente na aba Notas.');
      return;
    }
    const summary = s.summary;
    const panorama = s.activityPanorama;
    const metrics = panorama.metrics;
    const tasks = s.tasks || [];
    const dataPartial = Boolean(metrics.activitiesUnverified || s.meta?.warnings?.length || panorama.dataMode !== 'detalhado');
    const correctionValue = metrics.pendingGradingMinimum > 0 ? `≥${metrics.pendingGradingMinimum}` : metrics.activitiesUnverified ? null : metrics.pendingGrading;
    const correctionState = dataState(correctionValue, Boolean(metrics.activitiesUnverified));
    const attentionStudents = Number(summary.riskImmediate || 0) + Number(summary.riskHigh || 0);
    const nextTask = tasks[0];
    view.innerHTML = `
      ${warningsHtml(s)}
      <section class="mat-priority-hero" aria-labelledby="mat-priority-title">
        <div class="mat-section-head"><div><span class="mat-eyebrow">Central operacional</span><h3 id="mat-priority-title">Prioridades de hoje</h3><p>O que exige atenção primeiro nesta UC.</p></div><span class="mat-badge ${dataPartial ? 'mat-risk-atencao' : 'mat-risk-regular'}">${dataPartial ? 'Leitura parcial' : 'Dados confirmados'}</span></div>
        ${nextTask ? `<article class="mat-next-action"><div><span class="mat-next-label">Próxima ação recomendada</span><h4>${U.escapeHtml(nextTask.title)}</h4><p>${U.escapeHtml(nextTask.description || nextTask.action || '')}</p></div><div class="mat-task-actions">${nextTask.url ? `<button class="mat-btn mat-btn-sm" data-action="open-url" data-url="${U.escapeHtml(nextTask.url)}" type="button">Abrir origem</button>` : ''}${nextTask.studentKey ? `<button class="mat-btn mat-btn-sm" data-action="student-detail" data-student-key="${U.escapeHtml(nextTask.studentKey)}" type="button">Ver aluno</button>` : ''}<button class="mat-btn mat-btn-sm mat-btn-primary" data-action="register-task" data-task-id="${U.escapeHtml(nextTask.id)}" type="button">Registrar ação</button></div></article>` : '<div class="mat-info">Nenhuma ação prioritária foi identificada com os dados disponíveis.</div>'}
        <div class="mat-quick-actions" aria-label="Ações rápidas">
          <button data-action="refresh" type="button">Atualizar</button>
          <button data-action="tab" data-tab="correcoes" type="button">Correções</button>
          <button data-action="tab" data-tab="notas" type="button">Importar notas</button>
          <button data-action="export-evidence-package" type="button">Exportar evidências</button>
        </div>
      </section>
      <div class="mat-grid mat-overview-grid">
        ${metricCard('Atividades avaliativas', metrics.evaluativeActivities, 'Tarefas acompanhadas nesta UC')}
        ${metricCard('Entregas realizadas', metrics.delivered, Number.isFinite(metrics.deliveryRate) ? `${metrics.deliveryRate}% do esperado` : 'Total ainda não confirmado', 'blue')}
        <div class="mat-card mat-kpi ${metrics.activitiesUnverified ? 'mat-kpi-orange' : correctionValue > 0 ? 'mat-kpi-orange' : 'mat-kpi-green'}"><div class="mat-kpi-top"><div class="mat-kpi-label">Correções pendentes</div><span class="mat-badge ${correctionState.className}">${correctionState.label}</span></div><div class="mat-kpi-value">${correctionValue === null ? 'Dados indisponíveis' : U.escapeHtml(correctionValue)}</div><div class="mat-kpi-hint">${metrics.activitiesUnverified ? `${metrics.activitiesUnverified} atividade(s) precisam de conferência` : `${metrics.activitiesWithPending} atividade(s) com pendência`}</div></div>
        ${metricCard('Alunos em atenção', attentionStudents, `${summary.riskImmediate || 0} com ação imediata`, attentionStudents > 0 ? 'orange' : 'green')}
      </div>
      <details class="mat-card mat-situation-card" open>
        <summary><div><span class="mat-eyebrow">Situação da UC</span><strong>${U.escapeHtml(panorama.scope.label)}</strong></div><span class="mat-badge ${panorama.dataMode === 'detalhado' ? 'mat-risk-regular' : 'mat-risk-atencao'}">${panorama.dataMode === 'detalhado' ? 'Leitura detalhada' : 'Leitura estimada'}</span></summary>
        ${panorama.scope.warning ? `<div class="mat-warning"><strong>Escopo:</strong> ${U.escapeHtml(panorama.scope.warning)}</div>` : ''}
        <div class="mat-situation-numbers">
          <div><span>Atividades</span><strong>${metricValue(metrics.totalActivities)}</strong></div>
          <div><span>Esperadas</span><strong>${metricValue(metrics.expectedDeliveries)}</strong></div>
          <div><span>Realizadas</span><strong>${metricValue(metrics.delivered)}</strong></div>
          <div><span>Corrigidas</span><strong>${U.escapeHtml(metrics.correctedDisplay === 'Verificar' ? 'Dados indisponíveis' : metrics.correctedDisplay)}</strong></div>
        </div>
        <div class="mat-grid mat-grid-2 mat-rate-grid">${rateBar(metrics.deliveryRate, 'Progresso das entregas')}${rateBar(metrics.correctionRate, 'Progresso das correções')}</div>
      </details>
      <div class="mat-card mat-recent-card">
        <div class="mat-section-head">
          <div><h3>Atividade recente</h3><p>Registros locais vinculados à auditoria.</p></div>
          <button class="mat-btn mat-btn-sm" data-action="tab" data-tab="historico" type="button">Ver auditoria</button>
        </div>
        <div class="mat-activity-timeline">${operationalTimelineHtml(s)}</div>
      </div>
      ${tasks.length > 1 ? `<details class="mat-card mat-work-queue"><summary><span><strong>Fila completa de trabalho</strong><small>${tasks.length} ações ordenadas por risco e prazo</small></span><span class="mat-quality-action">Expandir</span></summary><div class="mat-task-list">${tasks.slice(1, 30).map(taskHtml).join('')}</div></details>` : ''}
    `;
  };

  const taskHtml = (task) => `
    <article class="mat-task">
      <div class="mat-task-top">
        <div>${riskBadge(task.priority)}</div>
        <span class="mat-badge mat-badge-neutral">${U.escapeHtml(task.type)}</span>
      </div>
      <h4>${U.escapeHtml(task.title)}</h4>
      <p>${U.escapeHtml(task.description || task.action || '')}</p>
      <div class="mat-task-actions">
        ${task.url ? `<button class="mat-btn mat-btn-sm" data-action="open-url" data-url="${U.escapeHtml(task.url)}" type="button">Abrir origem</button>` : ''}
        ${task.studentKey ? `<button class="mat-btn mat-btn-sm" data-action="student-detail" data-student-key="${U.escapeHtml(task.studentKey)}" type="button">Ver aluno</button>` : ''}
        ${task.type === 'fechamento' ? '<button class="mat-btn mat-btn-sm" data-action="tab" data-tab="fechamento" type="button">Checklist</button>' : ''}
        <button class="mat-btn mat-btn-sm mat-btn-primary" data-action="register-task" data-task-id="${U.escapeHtml(task.id)}" type="button">Registrar ação</button>
      </div>
    </article>`;

  const upcomingHtml = (snapshot) => {
    const items = (snapshot.activityPanorama?.assignments || snapshot.assignments)
      .filter((item) => item.daysUntilDue !== null)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 8);
    const ucEnd = snapshot.course.activeUcEndDate ? new Date(`${snapshot.course.activeUcEndDate}T23:59:59`) : null;
    if (ucEnd && !Number.isNaN(ucEnd.getTime())) {
      items.unshift({ name: snapshot.course.activeUcName || 'UC ativa', daysUntilDue: U.daysUntil(ucEnd), dueText: U.formatDate(ucEnd), url: snapshot.course.url, isUc: true });
    }
    if (!items.length) return '<div class="mat-info">Configure a UC ativa ou atualize o curso para visualizar os próximos prazos.</div>';
    return items.map((item) => `
      <div class="mat-source">
        <div><div class="mat-source-name">${U.escapeHtml(item.name)}</div><div class="mat-source-url">${item.isUc ? 'Encerramento da UC' : 'Prazo da atividade'}: ${U.escapeHtml(item.dueText || 'Não identificado')}</div></div>
        <span class="mat-badge ${item.daysUntilDue !== null && item.daysUntilDue <= 2 ? 'mat-risk-imediato' : item.daysUntilDue !== null && item.daysUntilDue <= 7 ? 'mat-risk-alto' : 'mat-badge-neutral'}">${item.daysUntilDue === null ? '?' : item.daysUntilDue < 0 ? `${Math.abs(item.daysUntilDue)}d atrasado` : `${item.daysUntilDue}d`}</span>
      </div>`).join('');
  };

  const renderCurso = () => {
    const view = document.querySelector('[data-view="curso"]');
    if (!view) return;
    const s = MAT.state.snapshot;
    const course = s?.course || MAT.state.course;
    if (!course?.id) {
      view.innerHTML = emptyHtml('Curso não identificado', 'Abra a página de um curso do Moodle e tente novamente.');
      return;
    }
    const sections = s?.course?.sections || [];
    const activeSectionId = String(MAT.state.settings.activeUcSectionId || course.activeUcSectionId || '');
    const selectedSection = sections.find((section) => String(section.id) === activeSectionId) || null;
    const panorama = s?.activityPanorama;
    view.innerHTML = `
      ${MAT.state.storageError ? `<div class="mat-warning mat-error" role="alert"><strong>Armazenamento indisponível:</strong> ${U.escapeHtml(MAT.state.storageError)}. Exportações continuam disponíveis, mas alterações locais podem não ser preservadas.</div>` : ''}
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Curso atual</h3><p>O painel trabalha somente com a sala aberta.</p></div><span class="mat-badge mat-badge-neutral">ID ${course.id}</span></div>
        <div class="mat-source"><div><div class="mat-source-name">${U.escapeHtml(course.name)}</div><div class="mat-source-url">${U.escapeHtml(course.url)}</div></div><button class="mat-btn mat-btn-sm" data-action="open-url" data-url="${U.escapeHtml(course.url)}" type="button">Abrir</button></div>
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>UC em acompanhamento</h3><p>Selecione a seção correta para que entregas, correções e alunos sejam calculados apenas dentro da UC.</p></div></div>
        <div class="mat-form-row">
          <div>
            <label class="mat-label" for="mat-uc-section">Seção da UC no Moodle</label>
            <select class="mat-select" id="mat-uc-section" data-input="uc-section">
              <option value="">Selecionar seção ou usar nome manual</option>
              ${sections.map((section) => `<option value="${U.escapeHtml(section.id)}" data-section-name="${U.escapeHtml(section.name)}" ${String(section.id) === activeSectionId ? 'selected' : ''}>${U.escapeHtml(section.name)} (${section.activityCount} itens, ${section.assignmentCount || 0} tarefa(s))</option>`).join('')}
            </select>
          </div>
          <div><label class="mat-label" for="mat-uc-end">Data final</label><input class="mat-input" id="mat-uc-end" type="date" value="${U.escapeHtml(MAT.state.settings.activeUcEndDate || '')}"></div>
        </div>
        <div><label class="mat-label" for="mat-uc-name">Nome da UC</label><input class="mat-input" id="mat-uc-name" value="${U.escapeHtml(MAT.state.settings.activeUcName || selectedSection?.name || '')}" placeholder="Ex.: Saúde e Segurança do Trabalho"></div>
        <input id="mat-uc-section-id" type="hidden" value="${U.escapeHtml(activeSectionId)}">
        <div class="mat-form-actions" style="margin-top:10px"><button class="mat-btn mat-btn-primary" data-action="save-uc" type="button">Salvar e recalcular panorama</button></div>
      </div>
      ${panorama ? `
        <div class="mat-card">
          <div class="mat-section-head"><div><h3>Escopo atual do panorama</h3><p>${U.escapeHtml(panorama.scope.label)}</p></div><span class="mat-badge ${panorama.scope.mode === 'section' ? 'mat-risk-regular' : panorama.scope.mode === 'fallback' ? 'mat-risk-alto' : 'mat-risk-atencao'}">${panorama.scope.mode === 'section' ? 'UC vinculada' : panorama.scope.mode === 'fallback' ? 'Curso completo por contingência' : 'Curso completo'}</span></div>
          ${panorama.scope.warning ? `<div class="mat-warning">${U.escapeHtml(panorama.scope.warning)}</div>` : ''}
          <div class="mat-pills">
            <span class="mat-pill">${panorama.metrics.totalActivities} itens na UC</span>
            <span class="mat-pill">${panorama.metrics.evaluativeActivities} tarefa(s) avaliativa(s)</span>
            <span class="mat-pill">${metricValue(panorama.metrics.expectedDeliveries)} entregas esperadas</span>
            <span class="mat-pill">${panorama.metrics.pendingGradingMinimum > 0 ? `≥${panorama.metrics.pendingGradingMinimum}` : metricValue(panorama.metrics.pendingGrading)} falta(m) corrigir</span>
          </div>
        </div>` : ''}
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Seções identificadas</h3><p>Inventário geral da sala. Selecione a seção que corresponde à UC vigente.</p></div><span class="mat-badge mat-badge-neutral">${sections.length}</span></div>
        ${sections.length ? `<div class="mat-list">${sections.map((section) => {
          const types = new Map();
          (section.activities || []).forEach((activity) => types.set(activity.typeLabel || activity.moduleType || 'Outro', (types.get(activity.typeLabel || activity.moduleType || 'Outro') || 0) + 1));
          const typeText = [...types.entries()].map(([type, count]) => `${count} ${type}`).join(', ');
          const dates = section.dates || [];
          const sectionState = [
            `ID ${section.id}`,
            section.currentMarker ? 'Seção atual' : '',
            section.hidden ? 'Oculta ou indisponível' : '',
            dates.length ? `datas: ${dates.join(', ')}` : ''
          ].filter(Boolean).join(' | ');
          return `
          <div class="mat-source">
            <div><div class="mat-source-name">${U.escapeHtml(section.name)}</div><div class="mat-source-url">${section.activityCount} item(ns), ${section.assignmentCount || 0} tarefa(s) avaliativa(s)${typeText ? ` | ${U.escapeHtml(typeText)}` : ''}<br>${U.escapeHtml(sectionState)}</div></div>
            <div class="mat-inline-actions"><button class="mat-btn mat-btn-sm" data-action="open-url" data-url="${U.escapeHtml(section.url)}" type="button">Abrir seção</button><button class="mat-btn mat-btn-sm" data-action="use-section" data-section-id="${U.escapeHtml(section.id)}" data-section-name="${U.escapeHtml(section.name)}" type="button">Selecionar UC</button></div>
          </div>
          ${(section.activities || []).length ? `<div class="mat-section-inventory">${section.activities.map((activity) => `<button class="mat-activity-link" data-action="open-url" data-url="${U.escapeHtml(activity.url)}" type="button"><span>${U.escapeHtml(activity.typeLabel || activity.moduleType || 'Item')}</span>${U.escapeHtml(activity.name)}</button>`).join('')}</div>` : ''}`;
        }).join('')}</div>` : '<div class="mat-info">Nenhuma seção foi reconhecida. Isso não impede o uso manual da UC, mas o panorama ficará no curso completo.</div>'}
      </div>
      ${s ? `<div class="mat-card"><div class="mat-section-head"><div><h3>Resumo da coleta</h3><p>Transparência sobre o que foi lido e possíveis limites.</p></div></div><div class="mat-pills"><span class="mat-pill">${s.meta.assignmentsDiscovered ?? s.assignments.length} tarefas identificadas</span><span class="mat-pill">${s.assignments.length} tarefas analisadas</span><span class="mat-pill">${s.participants.length} participantes</span><span class="mat-pill">${s.sources.filter(x => x.status === 'ok').length} fontes válidas</span><span class="mat-pill">${s.meta.durationMs} ms</span></div>${s.meta.assignmentDataTruncated ? '<div class="mat-warning" style="margin-top:10px">A quantidade de tarefas ultrapassou o limite configurado. Aumente “Máximo de atividades” no Diagnóstico e atualize novamente.</div>' : ''}</div>` : ''}
    `;
  };

  const renderAlunos = () => {
    const view = document.querySelector('[data-view="alunos"]');
    if (!view) return;
    const s = MAT.state.snapshot;
    if (!s) {
      view.innerHTML = emptyHtml('Dados dos alunos ainda não coletados', 'Execute a análise do curso para montar a ficha de acompanhamento.');
      return;
    }
    const query = U.normalizeText(MAT.state.studentFilter);
    const filtered = s.students.filter((student) => {
      const matchesText = !query || U.normalizeText(`${student.name} ${student.email}`).includes(query);
      const matchesRisk = MAT.state.riskFilter === 'todos' || student.riskLevel === MAT.state.riskFilter;
      return matchesText && matchesRisk;
    }).sort((a, b) => (MAT.rules.riskRank[b.riskLevel] || 0) - (MAT.rules.riskRank[a.riskLevel] || 0) || a.name.localeCompare(b.name, 'pt-BR'));

    view.innerHTML = `
      <div class="mat-filterbar">
        <label><span class="mat-label">Buscar aluno</span><input class="mat-input" data-input="student-filter" value="${U.escapeHtml(MAT.state.studentFilter)}" placeholder="Nome ou e-mail"></label>
        <label><span class="mat-label">Filtrar por risco</span><select class="mat-select" data-input="risk-filter">
          <option value="todos" ${MAT.state.riskFilter === 'todos' ? 'selected' : ''}>Todos os riscos</option>
          <option value="imediato" ${MAT.state.riskFilter === 'imediato' ? 'selected' : ''}>Ação imediata</option>
          <option value="alto" ${MAT.state.riskFilter === 'alto' ? 'selected' : ''}>Risco alto</option>
          <option value="atencao" ${MAT.state.riskFilter === 'atencao' ? 'selected' : ''}>Atenção</option>
          <option value="regular" ${MAT.state.riskFilter === 'regular' ? 'selected' : ''}>Regular</option>
        </select></label>
      </div>
      <div class="mat-table-wrap">
        <table class="mat-table">
          <thead><tr><th>Aluno</th><th>Risco</th><th>Último acesso</th><th>Sem entrega</th><th>Nota</th><th>Ação</th></tr></thead>
          <tbody>${filtered.length ? filtered.map((student) => `
            <tr>
              <td><button class="mat-link-button" data-action="student-detail" data-student-key="${U.escapeHtml(student.key)}" type="button">${U.escapeHtml(student.name)}</button><br><span class="mat-source-url">${U.escapeHtml(student.email || student.role || '')}</span></td>
              <td>${riskBadge(student.riskLevel)}</td>
              <td>${U.escapeHtml(U.formatRelativeDays(student.lastAccessDays))}</td>
              <td>${student.missingAssignments}</td>
              <td>${student.gradeTotal === null ? 'Não reconhecida' : U.escapeHtml(student.gradeTotal)}</td>
              <td><button class="mat-btn mat-btn-sm" data-action="student-detail" data-student-key="${U.escapeHtml(student.key)}" type="button">Abrir ficha</button></td>
            </tr>`).join('') : '<tr><td colspan="6">Nenhum aluno corresponde aos filtros.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="mat-footer-note">A classificação é uma recomendação baseada nas regras configuradas e nas informações que o Moodle disponibilizou. O tutor deve validar cada caso.</div>
    `;
  };

  const renderCorrecoes = () => {
    const view = document.querySelector('[data-view="correcoes"]');
    if (!view) return;
    const s = MAT.state.snapshot;
    if (!s) {
      view.innerHTML = emptyHtml('Panorama de atividades indisponível', 'Execute a análise completa para ler as atividades, entregas e correções da UC.');
      return;
    }
    const panorama = s.activityPanorama;
    const metrics = panorama.metrics;
    const assignments = panorama.assignments || [];
    const filter = MAT.state.assignmentFilter || 'todos';
    const filtered = assignments.filter((assignment) => {
      const m = assignment.metrics;
      if (filter === 'pendentes') return m.pending > 0;
      if (filter === 'sem_entrega') return m.delivered === 0 && m.expected > 0;
      if (filter === 'incompletas') return m.missing > 0;
      if (filter === 'concluidas') return m.complete;
      if (filter === 'verificar') return !m.pendingKnown;
      if (filter === 'falhas') return m.statusLevel === 'imediato' && /falha/i.test(m.status);
      return true;
    });

    view.innerHTML = `
      ${s.meta.mode !== 'complete' ? '<div class="mat-warning"><strong>Leitura rápida:</strong> a ausência de correções pendentes não será considerada confirmada. Use o modo Completa para conferir aluno por aluno.</div>' : ''}
      ${metrics.activitiesUnverified ? `<div class="mat-warning"><strong>Verificação obrigatória:</strong> ${metrics.activitiesUnverified} atividade(s) não puderam ser confirmadas. O sistema não mostrará zero pendências como resultado definitivo nesses casos.</div>` : ''}
      ${panorama.scope.warning ? `<div class="mat-warning"><strong>Escopo:</strong> ${U.escapeHtml(panorama.scope.warning)}</div>` : ''}
      <div class="mat-card mat-panorama-card">
        <div class="mat-section-head"><div><h3>Panorama de atividades da UC</h3><p>${U.escapeHtml(panorama.scope.label)}. Visão consolidada de tudo o que foi reconhecido na unidade curricular.</p></div><button class="mat-btn mat-btn-sm" data-action="export-activities" type="button">Exportar panorama</button></div>
        <div class="mat-grid mat-grid-3">
          ${metricCard('Atividades na UC', metrics.totalActivities, 'Todos os recursos e atividades reconhecidos')}
          ${metricCard('Tarefas avaliativas', metrics.evaluativeActivities, 'Atividades com entrega e correção')}
          ${metricCard('Entregas esperadas', metrics.expectedDeliveries, 'Soma dos alunos previstos por tarefa')}
          ${metricCard('Entregues', metrics.delivered, `${rateValue(metrics.deliveryRate)} das entregas esperadas`, 'blue')}
          ${metricCard('Corrigidas', metrics.correctedDisplay, metrics.correctedCountsVerified ? `${rateValue(metrics.correctionRate)} do que foi entregue` : `Contagem parcial. Taxa mínima reconhecida: ${rateValue(metrics.correctionRate)}`, metrics.correctedCountsVerified ? 'green' : 'orange')}
          ${metricCard('Falta corrigir', metrics.pendingGradingMinimum > 0 ? `≥${metrics.pendingGradingMinimum}` : metrics.activitiesUnverified ? 'Dados indisponíveis' : metrics.pendingGrading, metrics.activitiesUnverified ? `${metrics.activitiesUnverified} tarefa(s) sem confirmação` : `${metrics.activitiesWithPending} tarefa(s) afetada(s)`, metrics.pendingGradingMinimum || metrics.activitiesUnverified ? 'orange' : 'green')}
        </div>
        <div class="mat-grid mat-grid-2 mat-rate-grid">
          ${rateBar(metrics.deliveryRate, 'Entrega geral da UC')}
          ${rateBar(metrics.correctionRate, 'Correção geral da UC')}
        </div>
        <div class="mat-pills" style="margin-top:10px">
          <span class="mat-pill">${metricValue(metrics.missingDeliveries)} não entregue(s)</span>
          <span class="mat-pill">${metrics.activitiesComplete} tarefa(s) totalmente concluída(s)</span>
          <span class="mat-pill">${metrics.activitiesWithoutDelivery} tarefa(s) sem nenhuma entrega</span>
          <span class="mat-pill">${metrics.activitiesUnverified} tarefa(s) não confirmada(s)</span>
          <span class="mat-pill">Dados ${panorama.dataMode === 'detalhado' ? 'detalhados' : 'estimados'}</span>
        </div>
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Correção em lote com IA</h3><p>Baixa de uma vez os envios de todas as atividades pendentes e, depois, lança o resultado da IA em todas elas automaticamente.</p></div></div>
        <div class="mat-form-actions">
          <button class="mat-btn mat-btn-sm" data-action="batch-download-all" type="button">1. Baixar pacote para correção com IA</button>
          <button class="mat-btn mat-btn-sm mat-btn-primary" data-action="batch-open-launch" type="button">2. Lançar tudo</button>
        </div>
        <div class="mat-footer-note">O passo 1 gera um único ZIP com uma pasta por atividade, os envios dos alunos, enunciado, critérios disponíveis, nota máxima, manifesto e agente de correção. O passo 2 recebe o CSV único que a IA devolver e lança nota, feedback e situação em cada atividade.</div>
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Composição da UC</h3><p>Quantidade de itens por tipo de recurso ou atividade.</p></div><span class="mat-badge mat-badge-neutral">${metrics.totalActivities}</span></div>
        <div class="mat-pills">${panorama.inventoryByType.length ? panorama.inventoryByType.map((item) => `<span class="mat-pill"><strong>${item.count}</strong>&nbsp;${U.escapeHtml(item.type)}</span>`).join('') : '<span class="mat-pill">Inventário não reconhecido</span>'}</div>
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Detalhamento por atividade avaliativa</h3><p>Compare o volume esperado, entregue, corrigido e pendente em cada tarefa.</p></div><button class="mat-btn mat-btn-sm" data-action="export-grading" type="button">Exportar só pendências</button></div>
        <div class="mat-filterbar mat-filterbar-single">
          <label><span class="mat-label">Filtrar atividades</span><select class="mat-select" data-input="assignment-filter">
            <option value="todos" ${filter === 'todos' ? 'selected' : ''}>Todas as atividades</option>
            <option value="pendentes" ${filter === 'pendentes' ? 'selected' : ''}>Com correção pendente</option>
            <option value="incompletas" ${filter === 'incompletas' ? 'selected' : ''}>Com entregas faltantes</option>
            <option value="sem_entrega" ${filter === 'sem_entrega' ? 'selected' : ''}>Sem nenhuma entrega</option>
            <option value="concluidas" ${filter === 'concluidas' ? 'selected' : ''}>Totalmente concluídas</option>
            <option value="verificar" ${filter === 'verificar' ? 'selected' : ''}>Correção não confirmada</option>
            <option value="falhas" ${filter === 'falhas' ? 'selected' : ''}>Com falha de leitura</option>
          </select></label>
        </div>
        <div class="mat-table-wrap">
          <table class="mat-table mat-activity-table">
            <thead><tr><th>Atividade</th><th>Prazo</th><th>Esperadas</th><th>Entregues</th><th>Corrigidas</th><th>Falta corrigir</th><th>Sem entrega</th><th>Entrega</th><th>Correção</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>${filtered.length ? filtered.map((assignment) => {
              const m = assignment.metrics;
              return `<tr>
                <td><strong>${U.escapeHtml(assignment.name)}</strong><br><span class="mat-source-url">${U.escapeHtml(assignment.sectionName || panorama.scope.label)}</span></td>
                <td>${U.escapeHtml(assignment.dueText || 'Não reconhecido')}</td>
                <td>${metricValue(m.expected)}</td>
                <td><strong>${metricValue(m.delivered)}</strong></td>
                <td><strong>${U.escapeHtml(m.correctedDisplay)}</strong></td>
                <td><strong class="${m.pending > 0 || !m.pendingKnown ? 'mat-text-danger' : 'mat-text-success'}">${U.escapeHtml(m.pendingDisplay)}</strong></td>
                <td>${metricValue(m.missing)}</td>
                <td>${rateValue(m.deliveryRate)}</td>
                <td>${rateValue(m.correctionRate)}</td>
                <td>${statusBadge(m)}<br><span class="mat-source-url">${U.escapeHtml(m.source)} | confiança ${U.escapeHtml(m.confidence)}</span></td>
                <td><div class="mat-inline-actions"><button class="mat-btn mat-btn-sm" data-action="assignment-detail" data-assignment-id="${assignment.cmid}" type="button">Detalhar</button><button class="mat-btn mat-btn-sm mat-btn-primary" data-action="open-url" data-url="${U.escapeHtml(assignment.gradingUrl || assignment.url)}" type="button">Abrir</button></div></td>
              </tr>`;
            }).join('') : '<tr><td colspan="11">Nenhuma atividade corresponde ao filtro selecionado.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="mat-footer-note">O valor zero em “Falta corrigir” só é exibido como concluído quando a ausência de pendências foi confirmada. Quando a tabela está incompleta, dinâmica, filtrada por grupo ou não reconhecida, o resultado aparece como “Dados indisponíveis”.</div>
      </div>
    `;
  };

  const renderNotas = () => {
    const view = document.querySelector('[data-view="notas"]');
    if (!view) return;
    if (!MAT.state.course?.id) {
      view.innerHTML = emptyHtml('Abra um curso para emitir o relatório', 'O relatório de notas é gerado a partir do livro de notas do curso aberto.', 'Abrir um curso');
      return;
    }
    const gradebook = MAT.state.gradebook;
    const loading = MAT.state.isCollectingGrades;
    const gradebookUrl = MAT.state.adapter?.gradesUrl(MAT.state.course.id, MAT.state.settings?.maxParticipants || 500) || '';
    if (!gradebook?.items?.length) {
      view.innerHTML = `<div class="mat-card">
        <div class="mat-section-head"><div><h3>Relatório completo de notas</h3><p>A ferramenta lê todas as colunas reconhecidas no livro de notas, organiza os alunos e gera arquivos para download.</p></div><span class="mat-badge mat-badge-neutral">Curso atual</span></div>
        <div class="mat-info">Nenhum relatório de notas foi emitido para este curso. A leitura não altera notas nem configurações do Moodle.</div>
        <div class="mat-form-actions" style="margin-top:12px"><button class="mat-btn mat-btn-primary" data-action="generate-grades-excel" type="button" ${loading ? 'disabled' : ''}>${loading ? 'Lendo livro de notas' : 'Gerar e baixar Excel'}</button><button class="mat-btn" data-action="generate-grades-csv" type="button" ${loading ? 'disabled' : ''}>Gerar CSV</button><button class="mat-btn" data-action="open-url" data-url="${U.escapeHtml(gradebookUrl)}" type="button">Abrir livro de notas</button></div>
      </div>`;
      return;
    }

    const settings = MAT.state.settings || {};
    const students = gradebook.students || [];
    const situations = students.map((student) => MAT.exporters.gradeSituation(student, gradebook, settings));
    const counts = {
      approved: situations.filter((value) => U.normalizeText(value).includes('media alcancada')).length,
      recovery: situations.filter((value) => U.normalizeText(value).includes('recuperacao')).length,
      below: situations.filter((value) => U.normalizeText(value).includes('abaixo')).length,
      noFinal: situations.filter((value) => U.normalizeText(value).includes('sem nota final') || U.normalizeText(value).includes('total final nao identificado')).length
    };
    const gradeSummaryStat = (label, value, hint, tone = '') => `
      <div class="mat-grade-summary-stat ${tone ? `mat-summary-${tone}` : ''}">
        <div class="mat-grade-summary-label">${U.escapeHtml(label)}</div>
        <div class="mat-grade-summary-value">${U.escapeHtml(value)}</div>
        <div class="mat-grade-summary-hint">${U.escapeHtml(hint)}</div>
      </div>`;
    const query = U.normalizeText(MAT.state.gradeSearch || '');
    const statusFilter = MAT.state.gradeStatusFilter || 'todos';
    const filtered = students.filter((student) => {
      const situation = MAT.exporters.gradeSituation(student, gradebook, settings);
      const normalizedSituation = U.normalizeText(situation);
      const textMatch = !query || U.normalizeText(`${student.studentName} ${student.email}`).includes(query);
      const statusMatch = statusFilter === 'todos'
        || statusFilter === 'aprovados' && normalizedSituation.includes('media alcancada')
        || statusFilter === 'recuperacao' && normalizedSituation.includes('recuperacao')
        || statusFilter === 'abaixo' && normalizedSituation.includes('abaixo')
        || statusFilter === 'sem_nota' && (normalizedSituation.includes('sem nota final') || normalizedSituation.includes('total final nao identificado'));
      return textMatch && statusMatch;
    });

    view.innerHTML = `
      ${gradebook.meta?.partial ? `<div class="mat-warning"><strong>Relatório possivelmente parcial:</strong> ${gradebook.meta.paginationDetected && !gradebook.meta.paginationFullyRead ? 'existem páginas que não foram totalmente lidas. ' : ''}${gradebook.meta.limitedByGroup ? `há um filtro de grupo ativo: ${U.escapeHtml(gradebook.meta.selectedGroup)}. ` : ''}${gradebook.meta.collapsedCategoriesDetected ? 'uma ou mais categorias parecem recolhidas. ' : ''}Abra o livro de notas, selecione todos os participantes, expanda as categorias e atualize novamente.</div>` : ''}
      ${!gradebook.courseTotalItem ? '<div class="mat-warning"><strong>Total final não identificado:</strong> todas as notas encontradas serão exportadas, mas o assistente não calculará uma nota final porque pesos, categorias e fórmulas podem variar no Moodle.</div>' : ''}
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Relatório de notas do curso</h3><p>${U.escapeHtml(gradebook.course?.name || MAT.state.course.name)}. Fonte: livro de notas do Moodle, atualizado em ${U.escapeHtml(U.formatDate(gradebook.meta?.collectedAt, true))}.</p></div><span class="mat-badge ${gradebook.meta?.partial ? 'mat-risk-atencao' : 'mat-risk-regular'}">${gradebook.meta?.partial ? 'Parcial' : 'Conferido'}</span></div>
        <div class="mat-grade-summary-grid">
          ${gradeSummaryStat('Alunos', gradebook.summary?.studentCount || 0, 'Reconhecidos no livro de notas')}
          ${gradeSummaryStat('Itens de nota', gradebook.summary?.itemCount || 0, 'Atividades, categorias e totais', 'blue')}
          ${gradeSummaryStat('Média alcançada', counts.approved, `Nota igual ou superior a ${settings.minimumGrade}`, 'green')}
          ${gradeSummaryStat('Recuperação', counts.recovery, `Notas entre ${settings.recoveryMin} e ${settings.recoveryMax}`, counts.recovery ? 'orange' : 'green')}
        </div>
        <div class="mat-pills"><span class="mat-pill">${counts.below} abaixo da faixa de recuperação</span><span class="mat-pill">${counts.noFinal} sem nota final reconhecida</span><span class="mat-pill">${gradebook.summary?.gradedCells || 0} células com nota</span><span class="mat-pill">${gradebook.summary?.missingCells || 0} células sem nota</span></div>
        <div class="mat-form-actions" style="margin-top:12px"><button class="mat-btn mat-btn-primary" data-action="export-grades-excel" type="button">Baixar Excel</button><button class="mat-btn" data-action="export-grades-csv" type="button">Baixar CSV</button><button class="mat-btn" data-action="generate-grades-excel" type="button" ${loading ? 'disabled' : ''}>${loading ? 'Atualizando notas' : 'Atualizar e baixar Excel'}</button><button class="mat-btn" data-action="open-url" data-url="${U.escapeHtml(gradebook.meta?.sourceUrl || gradebookUrl)}" type="button">Abrir livro de notas</button></div>
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Notas por aluno</h3><p>Itens avaliativos e totais reconhecidos no livro de notas.</p></div><span class="mat-badge mat-badge-neutral">${filtered.length} de ${students.length}</span></div>
        <div class="mat-filterbar">
          <label><span class="mat-label">Buscar no livro de notas</span><input class="mat-input" data-input="grade-search" value="${U.escapeHtml(MAT.state.gradeSearch || '')}" placeholder="Nome ou e-mail"></label>
          <label><span class="mat-label">Filtrar situação</span><select class="mat-select" data-input="grade-status">
            <option value="todos" ${statusFilter === 'todos' ? 'selected' : ''}>Todos os alunos</option>
            <option value="aprovados" ${statusFilter === 'aprovados' ? 'selected' : ''}>Média alcançada</option>
            <option value="recuperacao" ${statusFilter === 'recuperacao' ? 'selected' : ''}>Recuperação</option>
            <option value="abaixo" ${statusFilter === 'abaixo' ? 'selected' : ''}>Abaixo da recuperação</option>
            <option value="sem_nota" ${statusFilter === 'sem_nota' ? 'selected' : ''}>Sem nota final</option>
          </select></label>
        </div>
        <div class="mat-table-wrap mat-gradebook-wrap">
          <table class="mat-table mat-gradebook-table">
            <thead><tr><th class="mat-sticky-name">Aluno</th><th class="mat-gradebook-email">E-mail</th>${gradebook.items.map((item) => `<th class="mat-gradebook-item" title="${U.escapeHtml(item.sourceHeader || item.name)}">${U.escapeHtml(item.name)}${item.maxGrade === null || item.maxGrade === undefined ? '' : `<br><span class="mat-source-url">Máx. ${formatGrade(item.maxGrade)}</span>`}</th>`).join('')}<th class="mat-gradebook-situation">Situação final</th></tr></thead>
            <tbody>${filtered.length ? filtered.map((student) => {
              const situation = MAT.exporters.gradeSituation(student, gradebook, settings);
              return `<tr><td class="mat-sticky-name"><strong>${U.escapeHtml(student.studentName)}</strong></td><td class="mat-gradebook-email">${U.escapeHtml(student.email || '-')}</td>${gradebook.items.map((item) => {
                const entry = student.grades?.[item.key];
                const missing = entry?.value === null || entry?.value === undefined;
                const tone = missing ? 'mat-grade-missing' : entry.value >= settings.minimumGrade ? 'mat-grade-high' : 'mat-grade-low';
                const status = missing ? 'Sem nota reconhecida' : entry.value >= settings.minimumGrade ? `Nota igual ou acima de ${settings.minimumGrade}` : `Nota abaixo de ${settings.minimumGrade}`;
                const title = entry?.display ? `${entry.display}. ${status}` : status;
                return `<td class="mat-gradebook-item ${tone} ${item.isCourseTotal ? 'mat-grade-total' : ''}" title="${U.escapeHtml(title)}" aria-label="${U.escapeHtml(title)}">${missing ? '-' : formatGrade(entry.value)}</td>`;
              }).join('')}<td class="mat-gradebook-situation">${gradeStatusBadge(situation)}</td></tr>`;
            }).join('') : `<tr><td colspan="${gradebook.items.length + 3}">Nenhum aluno corresponde aos filtros selecionados.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="mat-footer-note">O relatório reproduz as notas visíveis no livro de notas. Não soma atividades nem recalcula médias, pois o Moodle pode utilizar pesos, categorias, exclusões e fórmulas próprias.</div>
      </div>
    `;
  };

  const renderFechamento = async () => {
    const view = document.querySelector('[data-view="fechamento"]');
    if (!view) return;
    const s = MAT.state.snapshot;
    if (!s) {
      view.innerHTML = emptyHtml('Checklist ainda não disponível', 'Atualize a análise para conferir as pendências do curso e da UC.');
      return;
    }
    const manual = await MAT.storage.loadChecklist(s.course.id);
    const manualItems = [
      ['feedbacks', 'Feedbacks foram publicados e conferidos'],
      ['contacts', 'Busca ativa e contatos foram registrados'],
      ['presential', 'Momentos presenciais foram conferidos, quando aplicável'],
      ['recovery', 'Recuperação foi organizada e comunicada'],
      ['report', 'Relatório final da UC foi gerado'],
      ['evidence', 'Evidências foram salvas na pasta oficial']
    ];
    const manualDone = manualItems.filter(([id]) => manual[id]).length;
    const totalDone = s.closing.autoDone + manualDone;
    const total = s.closing.autoTotal + manualItems.length;
    view.innerHTML = `
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Fechamento da UC</h3><p>${U.escapeHtml(s.course.activeUcName || 'UC não definida')}</p></div><span class="mat-badge ${totalDone === total ? 'mat-risk-regular' : 'mat-risk-alto'}">${totalDone} de ${total}</span></div>
        <div class="mat-progress" style="background:#e9eef4"><span style="width:${Math.round((totalDone / total) * 100)}%;background:var(--mat-blue)"></span></div>
        <div class="mat-section-title">Verificações automáticas</div>
        ${s.closing.autoItems.map(checkAutoHtml).join('')}
        <div class="mat-section-title">Confirmações do tutor</div>
        ${manualItems.map(([id, label]) => `
          <label class="mat-check-item">
            <input type="checkbox" data-checklist-id="${id}" ${manual[id] ? 'checked' : ''}>
            <span><span class="mat-check-label">${U.escapeHtml(label)}</span><span class="mat-check-detail">Confirmação armazenada localmente neste navegador.</span></span>
            <span class="mat-check-symbol ${manual[id] ? 'mat-check-done' : 'mat-check-pending'}">${manual[id] ? '✓' : '!'}</span>
          </label>`).join('')}
        <div class="mat-form-actions" style="margin-top:12px"><button class="mat-btn mat-btn-primary" data-action="save-checklist" type="button">Salvar checklist</button><button class="mat-btn" data-action="export-json" type="button">Exportar relatório</button></div>
      </div>
      <div class="mat-card"><div class="mat-section-head"><div><h3>Pendências reconhecidas</h3><p>Resumo para conferência antes do encerramento.</p></div></div><div class="mat-pills"><span class="mat-pill">${metricValue(s.closing.metrics.delivered)} de ${metricValue(s.closing.metrics.expectedDeliveries)} entregas realizadas</span><span class="mat-pill">${metricValue(s.closing.metrics.corrected)} corrigida(s)</span><span class="mat-pill">${metricValue(s.closing.metrics.pendingGrading)} falta(m) corrigir</span><span class="mat-pill">${metricValue(s.closing.metrics.missingDeliveries)} entrega(s) faltante(s)</span><span class="mat-pill">${s.closing.metrics.missingStudents} aluno(s) com pendência</span><span class="mat-pill">${s.closing.metrics.recoveryStudents} na faixa de recuperação</span><span class="mat-pill">${s.closing.metrics.withoutGrade} sem nota reconhecida</span></div></div>
    `;
  };

  const checkAutoHtml = (item) => `
    <div class="mat-check-item">
      <span class="mat-check-symbol ${item.done ? 'mat-check-done' : 'mat-check-pending'}">${item.done ? '✓' : '!'}</span>
      <span><span class="mat-check-label">${U.escapeHtml(item.label)}</span><span class="mat-check-detail">${U.escapeHtml(item.detail)}</span></span>
      <span class="mat-badge ${item.done ? 'mat-risk-regular' : 'mat-risk-atencao'}">${item.done ? 'Concluído' : 'Conferir'}</span>
    </div>`;

  const renderHistorico = () => {
    const view = document.querySelector('[data-view="historico"]');
    if (!view) return;
    const actions = MAT.state.actions || [];
    view.innerHTML = `
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Auditoria local</h3><p>Linha do tempo das ações e evidências do curso atual.</p></div><span class="mat-badge mat-badge-neutral">${actions.length}</span></div>
        <div class="mat-form-actions" style="margin:12px 0"><button class="mat-btn mat-btn-primary" data-action="export-evidence-package" type="button" ${MAT.state.snapshot ? '' : 'disabled'}>Exportar evidências</button></div>
        <div class="mat-footer-note">O pacote será salvo no computador pelo navegador e reunirá relatório HTML, histórico CSV e auditoria JSON com os dados disponíveis.</div>
        ${actions.length ? actions.map((action) => `
          <div class="mat-timeline-item">
            <div class="mat-timeline-title">${U.escapeHtml(action.title || action.type || 'Ação registrada')}</div>
            <div class="mat-timeline-meta">${U.escapeHtml(U.formatDate(action.createdAt, true))} | ${U.escapeHtml(action.status || 'realizada')}</div>
            ${action.studentName ? `<div class="mat-timeline-meta">Aluno: ${U.escapeHtml(action.studentName)}</div>` : ''}
            ${action.note ? `<div class="mat-timeline-note">${U.escapeHtml(action.note)}</div>` : ''}
          </div>`).join('') : '<div class="mat-info">Nenhuma ação foi registrada neste navegador para o curso atual.</div>'}
      </div>
      <div class="mat-card"><div class="mat-section-head"><div><h3>Novo registro</h3><p>Use para anotar uma providência geral do curso.</p></div></div><label class="mat-label" for="mat-general-note">Descrição</label><textarea class="mat-input" id="mat-general-note" rows="3" placeholder="Ex.: Conferência do livro de notas concluída."></textarea><div class="mat-form-actions" style="margin-top:9px"><button class="mat-btn mat-btn-primary" data-action="add-general-action" type="button">Registrar</button></div></div>
    `;
  };

  const renderDiagnostico = () => {
    const view = document.querySelector('[data-view="diagnostico"]');
    if (!view) return;
    const s = MAT.state.snapshot;
    const settings = MAT.state.settings;
    const gradebookStatus = s?.gradebook?.status || (s?.gradebook?.meta?.partial ? 'parcial' : 'não lidas');
    view.innerHTML = `
      ${MAT.state.storageError ? `<div class="mat-warning mat-error" role="alert"><strong>Armazenamento indisponível:</strong> ${U.escapeHtml(MAT.state.storageError)}. Alterações locais podem não ser preservadas.</div>` : ''}
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Configurações da análise</h3><p>Controle de carga e regras de risco.</p></div></div>
        <div class="mat-form-row">
          <div><label class="mat-label">Máximo de atividades</label><input class="mat-input" data-setting="maxAssignments" type="number" min="1" max="200" value="${settings.maxAssignments}"></div>
          <div><label class="mat-label">Máximo de participantes</label><input class="mat-input" data-setting="maxParticipants" type="number" min="10" max="5000" value="${settings.maxParticipants}"></div>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label">Atenção sem acesso, dias</label><input class="mat-input" data-setting="noAccessAttentionDays" type="number" min="1" value="${settings.noAccessAttentionDays}"></div>
          <div><label class="mat-label">Risco alto sem acesso, dias</label><input class="mat-input" data-setting="noAccessHighDays" type="number" min="1" value="${settings.noAccessHighDays}"></div>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label">Ação imediata, dias</label><input class="mat-input" data-setting="noAccessImmediateDays" type="number" min="1" value="${settings.noAccessImmediateDays}"></div>
          <div><label class="mat-label">Média mínima</label><input class="mat-input" data-setting="minimumGrade" type="number" min="0" max="100" value="${settings.minimumGrade}"></div>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label">Recuperação, mínimo</label><input class="mat-input" data-setting="recoveryMin" type="number" min="0" max="100" step="0.01" value="${settings.recoveryMin}"></div>
          <div><label class="mat-label">Recuperação, máximo</label><input class="mat-input" data-setting="recoveryMax" type="number" min="0" max="100" step="0.01" value="${settings.recoveryMax}"></div>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label">Alerta de fechamento, dias</label><input class="mat-input" data-setting="closingWarningDays" type="number" min="0" max="365" value="${settings.closingWarningDays}"></div>
          <div><label class="mat-label">Requisições simultâneas</label><input class="mat-input" data-setting="requestConcurrency" type="number" min="1" max="6" value="${settings.requestConcurrency}"></div>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label">Intervalo entre requisições, ms</label><input class="mat-input" data-setting="requestDelayMs" type="number" min="0" max="5000" value="${settings.requestDelayMs}"></div>
          <div><label class="mat-label">Tempo limite por requisição, ms</label><input class="mat-input" data-setting="requestTimeoutMs" type="number" min="1000" max="60000" value="${settings.requestTimeoutMs}"></div>
        </div>
        <div class="mat-form-row">
          <label class="mat-check-item"><input data-setting="showFloatingButton" type="checkbox" ${settings.showFloatingButton ? 'checked' : ''}><span><span class="mat-check-label">Mostrar botão lateral</span><span class="mat-check-detail">Disponível em todas as páginas do Moodle.</span></span></label>
          <label class="mat-check-item"><input data-setting="autoOpenPanel" type="checkbox" ${settings.autoOpenPanel ? 'checked' : ''}><span><span class="mat-check-label">Abrir painel automaticamente</span><span class="mat-check-detail">Executa somente quando houver curso identificado.</span></span></label>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label" for="mat-setting-theme">Tema</label><select class="mat-input" id="mat-setting-theme" data-setting="theme"><option value="system" ${settings.theme === 'system' ? 'selected' : ''}>Sistema</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Claro</option><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Escuro</option></select></div>
          <div><label class="mat-label" for="mat-setting-panel">Comportamento do painel</label><select class="mat-input" id="mat-setting-panel" data-setting="panelBehavior"><option value="overlay" ${settings.panelBehavior === 'overlay' ? 'selected' : ''}>Sobrepor o Moodle</option><option value="push" ${settings.panelBehavior === 'push' ? 'selected' : ''}>Reduzir a página em telas amplas</option></select></div>
        </div>
        <div class="mat-form-row">
          <div><label class="mat-label" for="mat-setting-retention">Retenção local, dias</label><input class="mat-input" id="mat-setting-retention" data-setting="retentionDays" type="number" min="7" max="365" value="${settings.retentionDays}"></div>
          <label class="mat-check-item"><input data-setting="storeMessageContent" type="checkbox" ${settings.storeMessageContent ? 'checked' : ''}><span><span class="mat-check-label">Guardar texto das mensagens</span><span class="mat-check-detail">Desativado por padrão para reduzir dados pessoais armazenados.</span></span></label>
        </div>
        <div class="mat-form-row">
          <label class="mat-check-item"><input data-setting="enableAutomaticCourseScan" type="checkbox" ${settings.enableAutomaticCourseScan ? 'checked' : ''}><span><span class="mat-check-label">Varrer atividades automaticamente</span><span class="mat-check-detail">Pode aumentar as consultas ao Moodle.</span></span></label>
          <label class="mat-check-item"><input data-setting="enableAutomaticCategoryScan" type="checkbox" ${settings.enableAutomaticCategoryScan ? 'checked' : ''}><span><span class="mat-check-label">Varrer categorias automaticamente</span><span class="mat-check-detail">Requer nova abertura da página após salvar.</span></span></label>
        </div>
        <div class="mat-form-row"><label class="mat-check-item"><input data-setting="forcePortuguese" type="checkbox" ${settings.forcePortuguese ? 'checked' : ''}><span><span class="mat-check-label">Solicitar Moodle em português</span><span class="mat-check-detail">Redireciona somente quando esta opção estiver ativa.</span></span></label></div>
        <div class="mat-form-actions"><button class="mat-btn mat-btn-primary" data-action="save-settings" type="button">Salvar configurações</button><button class="mat-btn" data-action="load-demo" type="button">Carregar demonstração</button></div>
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Origem dos dados</h3><p>Cada leitura registra a página consultada e o resultado.</p></div><span class="mat-badge mat-badge-neutral">${s?.sources?.length || 0}</span></div>
        ${s ? `<div class="mat-pills"><span class="mat-pill">Duração: ${Math.round((s.meta?.durationMs || 0) / 1000)}s</span><span class="mat-pill">${s.activityPanorama?.metrics?.activitiesPartial || 0} atividade(s) parcial(is)</span><span class="mat-pill">${s.activityPanorama?.metrics?.activitiesUnverified || 0} atividade(s) para verificar</span><span class="mat-pill">Notas: ${U.escapeHtml(gradebookStatus)}</span></div><div class="mat-list">${s.sources.map(sourceHtml).join('')}</div>${warningsHtml(s)}` : '<div class="mat-info">Nenhuma análise foi executada.</div>'}
      </div>
      <div class="mat-card">
        <div class="mat-section-head"><div><h3>Exportar e suporte</h3><p>Arquivos úteis para relatório e ajuste de compatibilidade.</p></div></div>
        <div class="mat-form-actions">
          <button class="mat-btn" data-action="export-json" type="button" ${s ? '' : 'disabled'}>Relatório JSON</button>
          <button class="mat-btn" data-action="export-activities" type="button" ${s ? '' : 'disabled'}>Atividades CSV</button>
          <button class="mat-btn" data-action="export-students" type="button" ${s ? '' : 'disabled'}>Alunos CSV</button>
          <button class="mat-btn" data-action="export-diagnostics" type="button" ${s ? '' : 'disabled'}>Diagnóstico JSON</button>
          <button class="mat-btn mat-btn-danger" data-action="clear-course" type="button">Limpar dados locais</button>
        </div>
      </div>
      <div class="mat-footer-note">Privacidade: a extensão não armazena senha nem token. As consultas automáticas ficam nos domínios autorizados. Retratos e registros permanecem no navegador pelo período configurado; mensagens não são guardadas por padrão.</div>
    `;
  };

  const sourceHtml = (source) => `
    <div class="mat-source">
      <div><div class="mat-source-name">${U.escapeHtml(source.name)}</div><div class="mat-source-url">${U.escapeHtml(source.url)}${source.error ? `<br>Erro: ${U.escapeHtml(source.error)}` : ''}<br>Tempo: ${source.durationMs === null || source.durationMs === undefined ? 'não disponível' : `${source.durationMs}ms`} | confiança: ${U.escapeHtml(source.confidence || 'não disponível')}</div></div>
      <span class="mat-badge ${source.status === 'ok' ? 'mat-risk-regular' : 'mat-risk-imediato'}">${source.status === 'ok' ? 'Lida' : 'Falhou'}</span>
    </div>`;

  const renderView = (name) => {
    const renderers = { hoje: renderHoje, curso: renderCurso, alunos: renderAlunos, correcoes: renderCorrecoes, notas: renderNotas, fechamento: renderFechamento, historico: renderHistorico, diagnostico: renderDiagnostico };
    renderers[name]?.();
  };

  const renderAll = () => {
    updateHeader();
    updateLauncher();
    renderView(MAT.state.activeTab || 'hoje');
  };

  const showDetail = (overlay, detail) => {
    lastDetailFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.classList.add('mat-visible');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      const focusTarget = detail.querySelector('[data-close-detail], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      (focusTarget || detail).focus();
    }, 0);
  };

  const openStudentDetail = (studentKey) => {
    const student = MAT.state.snapshot?.students.find((item) => item.key === studentKey);
    const actionHistory = (MAT.state.actions || []).filter((action) => action.studentKey === student?.key).slice(0, 20);
    if (!student) return toast('Aluno não encontrado no retrato atual.');
    const overlay = document.getElementById('mat-detail-overlay');
    const detail = document.getElementById('mat-detail');
    const needsContact = student.missingAssignments > 0 || student.riskLevel !== 'regular';
    const automaticMessage = needsContact ? MAT.communications?.buildStudentPendingMessage(student, MAT.state) || '' : '';
    detail.innerHTML = `
      <div class="mat-detail-head"><div><h3>${U.escapeHtml(student.name)}</h3><div class="mat-detail-sub">${U.escapeHtml(student.email || student.role || 'Sem informação complementar')}</div></div><button class="mat-btn mat-btn-sm" data-close-detail type="button">Fechar</button></div>
      <div class="mat-pills" style="margin-top:12px">${riskBadge(student.riskLevel)}<span class="mat-pill">${U.escapeHtml(U.formatRelativeDays(student.lastAccessDays))}</span><span class="mat-pill">${student.missingAssignments} sem entrega</span><span class="mat-pill">${student.pendingGrading} aguardando correção</span><span class="mat-pill">Nota: ${student.gradeTotal === null ? 'não reconhecida' : U.escapeHtml(student.gradeTotal)}</span></div>
      <div class="mat-section-title">Motivos da classificação</div>
      ${student.riskReasons.length ? `<ul class="mat-reason-list">${student.riskReasons.map((reason) => `<li>${U.escapeHtml(reason.text)}</li>`).join('')}</ul>` : '<div class="mat-info">Nenhum fator de risco identificado.</div>'}
      <div class="mat-action-box"><strong>Ação recomendada:</strong><br>${U.escapeHtml(student.recommendedAction)}</div>
      ${needsContact ? `<div class="mat-section-title">Mensagem automática das pendências</div><textarea class="mat-input mat-message-preview" id="mat-student-message-preview" rows="6" aria-label="Mensagem automática editável das pendências">${U.escapeHtml(automaticMessage)}</textarea><div class="mat-form-actions" style="margin-top:8px"><button class="mat-btn mat-btn-sm" data-action="copy-student-message" data-student-key="${U.escapeHtml(student.key)}" type="button">Copiar mensagem</button><button class="mat-btn mat-btn-sm mat-btn-primary" data-action="student-moodle-message" data-student-key="${U.escapeHtml(student.key)}" type="button">Enviar mensagem</button></div>` : ''}
      <div class="mat-section-title">Atividades do aluno</div>
      ${student.assignments.length ? `<div class="mat-table-wrap"><table class="mat-table"><thead><tr><th>Atividade</th><th>Entrega</th><th>Correção</th><th>Nota</th></tr></thead><tbody>${student.assignments.map((item) => `<tr><td><a href="${U.escapeHtml(U.isAllowedMoodleUrl(item.assignmentUrl) ? item.assignmentUrl : '#')}" target="_blank" rel="noopener">${U.escapeHtml(item.name)}</a></td><td>${item.missing ? 'Sem entrega' : item.submitted ? 'Entregue' : U.escapeHtml(item.statusText)}</td><td>${item.graded ? 'Corrigida' : item.submitted ? 'Pendente' : '-'}</td><td>${item.grade === null ? '-' : U.escapeHtml(item.grade)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="mat-info">A análise não encontrou linhas de avaliação para este aluno.</div>'}
      <div class="mat-section-title">Registrar acompanhamento</div>
      <textarea class="mat-input" id="mat-student-note" rows="3" placeholder="Registre o contato, orientação ou encaminhamento."></textarea>
      <div class="mat-section-title">Histórico do aluno</div>
      ${actionHistory.length ? `<div class="mat-list">${actionHistory.map((action) => `<div class="mat-source"><div><div class="mat-source-name">${U.escapeHtml(action.title || action.type || 'Acompanhamento')}</div><div class="mat-source-url">${U.escapeHtml(U.formatDate(action.createdAt, true))}${action.channel ? ` | ${U.escapeHtml(action.channel)}` : ''}${action.note ? `<br>${U.escapeHtml(action.note)}` : ''}</div></div><span class="mat-badge mat-badge-neutral">${U.escapeHtml(action.status || 'registrada')}</span></div>`).join('')}</div>` : '<div class="mat-info">Nenhum acompanhamento local foi registrado para este aluno.</div>'}
      <div class="mat-form-actions" style="margin-top:9px">
        <button class="mat-btn mat-btn-primary" data-action="register-student" data-student-key="${U.escapeHtml(student.key)}" data-status="realizada" type="button">Ação realizada</button>
        <button class="mat-btn" data-action="register-student" data-student-key="${U.escapeHtml(student.key)}" data-status="aguardando_retorno" type="button">Aguardando retorno</button>
        ${student.profileUrl ? `<button class="mat-btn" data-action="open-url" data-url="${U.escapeHtml(student.profileUrl)}" type="button">Abrir perfil</button>` : ''}
      </div>
      ${needsContact ? `<div class="mat-footer-note">A mensagem é preenchida automaticamente e pode ser editada. Ao clicar em Enviar mensagem, a conversa do aluno será aberta no AVA com o texto revisado para confirmação do tutor.</div>` : ''}`;
    showDetail(overlay, detail);
  };

  const openAssignmentDetail = (assignmentId) => {
    const assignment = MAT.state.snapshot?.activityPanorama?.assignments.find((item) => String(item.cmid) === String(assignmentId))
      || MAT.state.snapshot?.assignments.find((item) => String(item.cmid) === String(assignmentId));
    if (!assignment) return toast('Atividade não encontrada.');
    const rows = assignment.gradingRows || [];
    const metrics = assignment.metrics || MAT.rules.calculateAssignmentMetrics(assignment, MAT.state.snapshot?.summary?.students || 0);
    const pendingRows = rows.filter((row) => row.requiresGrading || row.submitted && !row.graded);
    const correctedRows = rows.filter((row) => row.submitted && !row.missing && row.graded);
    const missingRows = rows.filter((row) => row.missing);
    const assistedAvailability = MAT.assistedGrading?.getAvailability(assignment) || { available: false, reason: 'Preparacao assistida indisponivel.' };
    const overlay = document.getElementById('mat-detail-overlay');
    const detail = document.getElementById('mat-detail');
    detail.innerHTML = `
      <div class="mat-detail-head"><div><h3>${U.escapeHtml(assignment.name)}</h3><div class="mat-detail-sub">${U.escapeHtml(assignment.sectionName || MAT.state.snapshot?.activityPanorama?.scope?.label || '')} | ${U.escapeHtml(assignment.dueText || 'Prazo não reconhecido')}</div></div><button class="mat-btn mat-btn-sm" data-close-detail type="button">Fechar</button></div>
      <div class="mat-grid mat-grid-3" style="margin-top:12px">
        ${metricCard('Entregas esperadas', metrics.expected, 'Alunos previstos nesta tarefa')}
        ${metricCard('Entregues', metrics.delivered, `${rateValue(metrics.deliveryRate)} do esperado`, 'blue')}
        ${metricCard('Corrigidas', metrics.correctedDisplay, metrics.correctedKnown ? `${rateValue(metrics.correctionRate)} das entregas` : 'Contagem parcial ou não confirmada', metrics.correctedKnown ? 'green' : 'orange')}
        ${metricCard('Falta corrigir', metrics.pendingDisplay, metrics.pendingKnown ? 'Resultado conferido pelas fontes disponíveis' : 'Ausência de pendências não confirmada', metrics.pending > 0 || !metrics.pendingKnown ? 'orange' : 'green')}
        ${metricCard('Sem entrega', metrics.missing, 'Alunos ainda sem envio', metrics.missing > 0 ? 'orange' : '')}
        <div class="mat-card mat-kpi"><div class="mat-kpi-label">Situação</div><div style="margin-top:10px">${statusBadge(metrics)}</div><div class="mat-kpi-hint">Fonte: ${U.escapeHtml(metrics.source)} | confiança ${U.escapeHtml(metrics.confidence)}</div></div>
      </div>
      <div class="mat-grid mat-grid-2 mat-rate-grid">
        ${rateBar(metrics.deliveryRate, 'Progresso das entregas')}
        ${rateBar(metrics.correctionRate, 'Progresso das correções')}
      </div>
      ${!metrics.pendingKnown ? '<div class="mat-warning" style="margin-top:12px"><strong>Conferência necessária:</strong> abra a tela de avaliação desta atividade e execute “Atualizar análise”. O assistente não considera esta atividade concluída enquanto não houver evidência suficiente.</div>' : ''}
      ${assignment.gradingVerification?.hasConflict ? '<div class="mat-warning" style="margin-top:12px"><strong>Divergência detectada:</strong> as fontes do Moodle apresentaram contagens diferentes. A pendência positiva foi mantida por segurança.</div>' : ''}
      <section class="mat-assisted-grading ${assistedAvailability.available ? 'mat-assisted-grading-ready' : 'mat-assisted-grading-blocked'}" aria-label="Preparar correção assistida">
        <div><h4>Preparar correção com IA</h4><p>Gera uma lista local para uso manual em uma ferramenta de IA. Nenhum dado é enviado e nenhuma nota é salva.</p></div>
        ${assistedAvailability.available
          ? `<div class="mat-form-actions"><button class="mat-btn mat-btn-primary" data-action="download-ai-package" data-assignment-id="${assignment.cmid}" type="button">Baixar lista CSV</button><button class="mat-btn" data-action="copy-ai-prompt" data-assignment-id="${assignment.cmid}" type="button">Copiar orientação</button></div>`
          : `<div class="mat-info">${U.escapeHtml(assistedAvailability.reason)}</div>`}
        <details class="mat-assisted-prompt" open><summary>Prompt de correção com IA</summary><textarea id="mat-assisted-grading-prompt" readonly aria-label="Prompt de correção com IA"></textarea><div class="mat-form-actions"><button class="mat-btn mat-btn-sm" data-action="copy-ai-general-prompt" type="button">Copiar prompt</button><button class="mat-btn mat-btn-sm" data-action="download-ai-agent-md" type="button">Baixar agente (.md)</button></div><div class="mat-footer-note">O arquivo .md traz o agente completo (regras, estilo, fóruns e formato de saída) para colar como instrução personalizada na IA de sua preferência.</div></details>
      </section>
      ${rows.length ? `
        <div class="mat-section-title">Alunos por situação</div>
        <div class="mat-pills"><span class="mat-pill">${pendingRows.length} aguardando correção</span><span class="mat-pill">${correctedRows.length} corrigidos</span><span class="mat-pill">${missingRows.length} sem entrega</span></div>
        <div class="mat-table-wrap" style="margin-top:12px"><table class="mat-table"><thead><tr><th>Aluno</th><th>Entrega</th><th>Correção</th><th>Arquivo</th><th>Nota</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${U.escapeHtml(row.studentName)}</td><td>${row.missing ? 'Sem entrega' : row.submitted || row.graded ? 'Entregue' : U.escapeHtml(row.statusText)}</td><td>${row.graded ? 'Corrigida' : row.requiresGrading || row.submitted ? '<strong class="mat-text-danger">Pendente</strong>' : row.unknown ? 'Não confirmado' : '-'}</td><td>${row.files?.length ? 'Sim' : 'Não'}</td><td>${row.grade === null ? '-' : U.escapeHtml(row.grade)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="mat-warning" style="margin-top:12px">A tabela de alunos não foi reconhecida. Os números exibidos vieram do resumo da atividade e podem ser estimados.</div>'}
      <div class="mat-form-actions" style="margin-top:12px"><button class="mat-btn mat-btn-primary" data-action="open-url" data-url="${U.escapeHtml(assignment.gradingUrl || assignment.url)}" type="button">Abrir correção no Moodle</button><button class="mat-btn" data-action="open-url" data-url="${U.escapeHtml(assignment.url)}" type="button">Abrir atividade</button></div>`;
    const promptField = detail.querySelector('#mat-assisted-grading-prompt');
    if (promptField) promptField.value = MAT.assistedGrading?.generalPrompt?.() || '';
    showDetail(overlay, detail);
  };

  const closeDetail = () => {
    const overlay = document.getElementById('mat-detail-overlay');
    if (!overlay?.classList.contains('mat-visible')) return;
    overlay.classList.remove('mat-visible');
    overlay.setAttribute('aria-hidden', 'true');
    const focusTarget = lastDetailFocus;
    lastDetailFocus = null;
    if (focusTarget?.isConnected) focusTarget.focus();
  };

  const findAssignment = (assignmentId) => MAT.state.snapshot?.activityPanorama?.assignments.find((item) => String(item.cmid) === String(assignmentId))
    || MAT.state.snapshot?.assignments.find((item) => String(item.cmid) === String(assignmentId));

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Falha ao copiar.');
  };

  const prepareAssistedGrading = async (assignmentId, action) => {
    const assignment = findAssignment(assignmentId);
    const packageData = MAT.assistedGrading?.createPackage({ course: MAT.state.course, assignment });
    if (!packageData || packageData.error) return toast(packageData?.error || 'Nao foi possivel preparar a lista.');
    if (action === 'download-ai-package') {
      U.downloadBlob(MAT.assistedGrading.toCsv(packageData), MAT.assistedGrading.packageFileName(packageData), 'text/csv;charset=utf-8');
      return toast('Lista CSV preparada localmente. Revise antes de compartilhar.');
    }
    try {
      await copyText(MAT.assistedGrading.toPrompt(packageData));
      toast('Orientacao copiada. Anexe ou cole as evidencias manualmente antes de pedir a correcao.');
    } catch (_) {
      toast('Nao foi possivel copiar a orientacao neste navegador.');
    }
  };

  const copyGeneralAssistedPrompt = async () => {
    try {
      await copyText(MAT.assistedGrading?.generalPrompt?.() || '');
      toast('Prompt de correção copiado. Anexe ou cole as evidências antes de solicitar a correção.');
    } catch (_) {
      toast('Não foi possível copiar o prompt neste navegador.');
    }
  };

  const downloadAssistedGradingAgent = () => {
    const markdown = MAT.assistedGrading?.AGENT_MARKDOWN;
    if (!markdown) return toast('O agente de correção não está disponível nesta versão.');
    const filename = MAT.assistedGrading?.AGENT_MARKDOWN_FILENAME || 'agente-corretor-moodle-universal.md';
    U.downloadBlob(markdown, filename, 'text/markdown;charset=utf-8');
    toast('Agente baixado em .md. Cole o conteúdo como instrução personalizada na IA de sua preferência.');
  };

  const registerTask = async (taskId) => {
    const task = MAT.state.snapshot?.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const note = prompt('Registre o que foi feito ou o próximo encaminhamento:', task.action || '');
    if (note === null) return;
    await MAT.storage.addAction({ title: task.title, type: task.type, note, studentKey: task.studentKey || null }, MAT.state.course.id);
    MAT.state.actions = await MAT.storage.loadActions(MAT.state.course.id);
    renderHistorico();
    toast('Ação registrada no histórico local.');
  };

  const handleContentClick = async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'open-my-courses') return openApprovedUrl(`${location.origin}/my/`);
    if (action === 'refresh') return MAT.main?.refreshAnalysis();
    if (action === 'refresh-grades') return MAT.main?.refreshGrades();
    if (action === 'generate-grades-excel') return MAT.main?.refreshGrades('excel');
    if (action === 'generate-grades-csv') return MAT.main?.refreshGrades('csv');
    if (action === 'tab') return setTab(target.dataset.tab);
    if (action === 'open-url') return openApprovedUrl(target.dataset.url);
    if (action === 'student-detail') return openStudentDetail(target.dataset.studentKey);
    if (action === 'assignment-detail') return openAssignmentDetail(target.dataset.assignmentId);
    if (action === 'register-task') return registerTask(target.dataset.taskId);
    if (action === 'save-uc') return saveUc();
    if (action === 'use-section') {
      document.getElementById('mat-uc-name').value = target.dataset.sectionName || '';
      const hidden = document.getElementById('mat-uc-section-id');
      const select = document.getElementById('mat-uc-section');
      if (hidden) hidden.value = target.dataset.sectionId || '';
      if (select) select.value = target.dataset.sectionId || '';
      return;
    }
    if (action === 'save-checklist') return saveChecklist();
    if (action === 'add-general-action') return addGeneralAction();
    if (action === 'export-evidence-package' && MAT.state.snapshot) {
      const checklist = await MAT.storage.loadChecklist(MAT.state.course.id);
      const result = MAT.exporters.exportEvidencePackage({ snapshot: MAT.state.snapshot, actions: MAT.state.actions, gradebook: MAT.state.gradebook, checklist });
      if (result) return toast(`Pacote de evidências preparado com ${result.recordCount} registro(s).`);
      return toast('Não foi possível preparar o pacote de evidências.');
    }
    if (action === 'save-settings') return saveSettingsFromForm();
    if (action === 'load-demo') return loadDemo();
    if (action === 'export-json' && MAT.state.snapshot) return MAT.exporters.exportSnapshotJson(MAT.state.snapshot, MAT.state.actions);
    if (action === 'export-students' && MAT.state.snapshot) return MAT.exporters.exportStudentsCsv(MAT.state.snapshot);
    if (action === 'export-grading' && MAT.state.snapshot) return MAT.exporters.exportPendingGradingCsv(MAT.state.snapshot);
    if (action === 'export-activities' && MAT.state.snapshot) return MAT.exporters.exportActivitiesCsv(MAT.state.snapshot);
    if (action === 'export-diagnostics' && MAT.state.snapshot) return MAT.exporters.exportDiagnostics(MAT.state.snapshot);
    if (action === 'export-grades-csv' && MAT.state.gradebook) return MAT.exporters.exportGradebookCsv(MAT.state.gradebook, MAT.state.settings);
    if (action === 'export-grades-excel' && MAT.state.gradebook) return MAT.exporters.exportGradebookExcel(MAT.state.gradebook, MAT.state.settings);
    if (action === 'batch-download-all') return MAT.batchGrading?.downloadAllForCorrection();
    if (action === 'batch-open-launch') return MAT.batchGrading?.openModal();
    if (action === 'clear-course') {
      if (target.dataset.confirm !== 'true') {
        target.dataset.confirm = 'true';
        target.textContent = 'Confirmar remoção';
        target.focus();
        window.setTimeout(() => {
          if (target.isConnected) { delete target.dataset.confirm; target.textContent = 'Limpar dados locais'; }
        }, 8000);
        return toast('Confirme no mesmo botão para remover os dados locais deste curso.');
      }
      return clearCourse();
    }
  };

  const handleContentInput = (event) => {
    if (event.target.dataset.input === 'grade-search') {
      MAT.state.gradeSearch = event.target.value;
      renderNotas();
      const input = document.querySelector('[data-input="grade-search"]');
      input?.focus();
      input?.setSelectionRange(MAT.state.gradeSearch.length, MAT.state.gradeSearch.length);
      return;
    }
    if (event.target.dataset.input === 'student-filter') {
      MAT.state.studentFilter = event.target.value;
      renderAlunos();
      const input = document.querySelector('[data-input="student-filter"]');
      input?.focus();
      input?.setSelectionRange(MAT.state.studentFilter.length, MAT.state.studentFilter.length);
    }
  };

  const handleContentChange = (event) => {
    if (event.target.dataset.input === 'grade-status') {
      MAT.state.gradeStatusFilter = event.target.value;
      renderNotas();
      return;
    }
    if (event.target.dataset.input === 'risk-filter') {
      MAT.state.riskFilter = event.target.value;
      renderAlunos();
    }
    if (event.target.dataset.input === 'assignment-filter') {
      MAT.state.assignmentFilter = event.target.value;
      renderCorrecoes();
    }
    if (event.target.dataset.input === 'uc-section') {
      const selected = event.target.selectedOptions?.[0];
      const nameInput = document.getElementById('mat-uc-name');
      const hidden = document.getElementById('mat-uc-section-id');
      if (nameInput && selected?.dataset.sectionName) nameInput.value = selected.dataset.sectionName;
      if (hidden) hidden.value = event.target.value || '';
    }
  };

  const handleDetailClick = async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'open-url') return openApprovedUrl(target.dataset.url);
    if (target.dataset.action === 'download-ai-package' || target.dataset.action === 'copy-ai-prompt') return prepareAssistedGrading(target.dataset.assignmentId, target.dataset.action);
    if (target.dataset.action === 'copy-ai-general-prompt') return copyGeneralAssistedPrompt();
    if (target.dataset.action === 'download-ai-agent-md') return downloadAssistedGradingAgent();
    if (target.dataset.action === 'copy-student-message') {
      const student = MAT.state.snapshot?.students.find((item) => item.key === target.dataset.studentKey);
      if (!student) return toast('Aluno não encontrado.');
      const message = document.getElementById('mat-student-message-preview')?.value.trim() || '';
      if (!message) return toast('Escreva a mensagem antes de copiar.');
      await copyText(message);
      return toast('Mensagem copiada.');
    }
    if (target.dataset.action === 'student-moodle-message') {
      const message = document.getElementById('mat-student-message-preview')?.value.trim() || '';
      if (!message) return toast('Escreva a mensagem antes de enviar.');
      return MAT.communications?.openMoodleMessageForStudent(target.dataset.studentKey, { toast, openUrl: openApprovedUrl, renderHistory: renderHistorico, message });
    }
    if (target.dataset.action === 'register-student') {
      const student = MAT.state.snapshot.students.find((item) => item.key === target.dataset.studentKey);
      const note = document.getElementById('mat-student-note')?.value.trim();
      if (!note) return toast('Escreva uma observação antes de registrar.');
      await MAT.storage.addAction({ title: 'Acompanhamento do aluno', type: 'aluno', status: target.dataset.status, note, studentKey: student.key, studentName: student.name }, MAT.state.course.id);
      MAT.state.actions = await MAT.storage.loadActions(MAT.state.course.id);
      closeDetail();
      renderHistorico();
      toast('Acompanhamento registrado.');
    }
  };

  const saveUc = async () => {
    const name = document.getElementById('mat-uc-name')?.value.trim() || '';
    const sectionId = document.getElementById('mat-uc-section-id')?.value || document.getElementById('mat-uc-section')?.value || '';
    const endDate = document.getElementById('mat-uc-end')?.value || '';
    const courseConfig = await MAT.storage.saveCourseConfig({ activeUcName: name, activeUcSectionId: sectionId, activeUcEndDate: endDate }, MAT.state.course.id);
    MAT.state.settings = { ...MAT.state.settings, ...courseConfig };
    if (MAT.state.snapshot) {
      MAT.state.snapshot.course.activeUcName = name;
      MAT.state.snapshot.course.activeUcSectionId = sectionId;
      MAT.state.snapshot.course.activeUcEndDate = endDate;
      MAT.state.snapshot = MAT.rules.enrichSnapshot(MAT.state.snapshot, MAT.state.settings);
      await MAT.storage.saveSnapshot(MAT.state.snapshot, MAT.state.course.id);
    }
    renderAll();
    toast('UC ativa salva.');
  };

  const saveChecklist = async () => {
    const values = {};
    document.querySelectorAll('[data-view="fechamento"] [data-checklist-id]').forEach((input) => { values[input.dataset.checklistId] = input.checked; });
    await MAT.storage.saveChecklist(values, MAT.state.course.id);
    await renderFechamento();
    toast('Checklist salvo localmente.');
  };

  const addGeneralAction = async () => {
    const input = document.getElementById('mat-general-note');
    const note = input?.value.trim();
    if (!note) return toast('Descreva a ação antes de registrar.');
    await MAT.storage.addAction({ title: 'Registro geral do curso', type: 'curso', note }, MAT.state.course.id);
    MAT.state.actions = await MAT.storage.loadActions(MAT.state.course.id);
    renderHistorico();
    toast('Registro adicionado.');
  };

  const saveSettingsFromForm = async () => {
    const patch = {};
    document.querySelectorAll('[data-setting]').forEach((input) => {
      const key = input.dataset.setting;
      patch[key] = input.type === 'number' ? Number(input.value) : input.type === 'checkbox' ? input.checked : input.value;
    });
    MAT.state.settings = await MAT.storage.saveSettings({ ...MAT.state.settings, ...patch });
    await MAT.storage.purgeExpiredData(MAT.state.settings.retentionDays);
    const host = MAT.dom.ensureHost().host;
    if (host) host.dataset.theme = MAT.state.settings.theme;
    syncPageLayout();
    const launcher = document.getElementById('mat-launcher');
    if (launcher) launcher.style.display = MAT.state.settings.showFloatingButton ? 'flex' : 'none';
    renderDiagnostico();
    toast('Configurações salvas.');
  };

  const clearCourse = async () => {
    await MAT.storage.clearCourseData(MAT.state.course.id);
    MAT.state.snapshot = null;
    MAT.state.gradebook = null;
    MAT.state.actions = [];
    renderAll();
    toast('Dados locais do curso removidos.');
  };

  const loadDemo = async () => {
    const course = MAT.state.course || { id: 999, name: 'Curso de demonstração', url: location.href, environment: MAT.state.adapter?.environment || 'Moodle' };
    const participants = [
      { id: 1, key: 'id:1', name: 'Ana Souza', email: 'ana@exemplo.com', role: 'Estudante', lastAccessText: '12 dias', lastAccessDays: 12, profileUrl: '' },
      { id: 2, key: 'id:2', name: 'Bruno Lima', email: 'bruno@exemplo.com', role: 'Estudante', lastAccessText: '2 dias', lastAccessDays: 2, profileUrl: '' },
      { id: 3, key: 'id:3', name: 'Carla Mendes', email: 'carla@exemplo.com', role: 'Estudante', lastAccessText: 'Nunca', lastAccessDays: 9999, profileUrl: '' }
    ];
    const assignments = [
      { cmid: 101, name: 'Situação de Aprendizagem A', sectionId: 'section-demo', sectionName: 'UC de demonstração', url: location.href, gradingUrl: location.href, dueText: '30/07/2026', dueDate: '2026-07-30T23:59:00.000Z', daysUntilDue: 3, needsGrading: 1, gradingRows: [
        { studentId: 1, studentKey: 'id:1', studentName: 'Ana Souza', submitted: false, missing: true, graded: false, grade: null, statusText: 'Nenhuma entrega', files: [] },
        { studentId: 2, studentKey: 'id:2', studentName: 'Bruno Lima', submitted: true, missing: false, graded: false, grade: null, statusText: 'Enviado para avaliação', files: [{ name: 'atividade.pdf', url: '' }] },
        { studentId: 3, studentKey: 'id:3', studentName: 'Carla Mendes', submitted: false, missing: true, graded: false, grade: null, statusText: 'Nenhuma entrega', files: [] }
      ] },
      { cmid: 102, name: 'Atividade Avaliativa B', sectionId: 'section-demo', sectionName: 'UC de demonstração', url: location.href, gradingUrl: location.href, dueText: '05/08/2026', dueDate: '2026-08-05T23:59:00.000Z', daysUntilDue: 9, needsGrading: 0, gradingRows: [
        { studentId: 1, studentKey: 'id:1', studentName: 'Ana Souza', submitted: true, missing: false, graded: true, grade: 48, statusText: 'Avaliado', files: [{ name: 'resposta.docx', url: '' }] },
        { studentId: 2, studentKey: 'id:2', studentName: 'Bruno Lima', submitted: true, missing: false, graded: true, grade: 72, statusText: 'Avaliado', files: [{ name: 'resposta.pdf', url: '' }] },
        { studentId: 3, studentKey: 'id:3', studentName: 'Carla Mendes', submitted: false, missing: true, graded: false, grade: null, statusText: 'Nenhuma entrega', files: [] }
      ] }
    ];
    const grades = [
      { studentId: 1, studentKey: 'id:1', studentName: 'Ana Souza', total: 48, confidence: 'media' },
      { studentId: 2, studentKey: 'id:2', studentName: 'Bruno Lima', total: 72, confidence: 'media' },
      { studentId: 3, studentKey: 'id:3', studentName: 'Carla Mendes', total: 20, confidence: 'media' }
    ];
    const gradebookItems = [
      { key: 'item:101', itemId: '101', name: 'Situação de Aprendizagem A', columnIndex: 2, maxGrade: 30, isCourseTotal: false, isTotal: false },
      { key: 'item:102', itemId: '102', name: 'Atividade Avaliativa B', columnIndex: 3, maxGrade: 30, isCourseTotal: false, isTotal: false },
      { key: 'item:total', itemId: 'total', name: 'Total do curso', columnIndex: 4, maxGrade: 100, isCourseTotal: true, isTotal: true }
    ];
    const gradebookStudents = [
      { studentId: 1, studentKey: 'id:1', studentName: 'Ana Souza', email: 'ana@exemplo.com', profileUrl: '', grades: { 'item:101': { value: 23, display: '23' }, 'item:102': { value: 25, display: '25' }, 'item:total': { value: 48, display: '48' } }, courseTotal: 48, courseTotalDisplay: '48', gradedItems: 3, missingItems: 0 },
      { studentId: 2, studentKey: 'id:2', studentName: 'Bruno Lima', email: 'bruno@exemplo.com', profileUrl: '', grades: { 'item:101': { value: 30, display: '30' }, 'item:102': { value: 28, display: '28' }, 'item:total': { value: 72, display: '72' } }, courseTotal: 72, courseTotalDisplay: '72', gradedItems: 3, missingItems: 0 },
      { studentId: 3, studentKey: 'id:3', studentName: 'Carla Mendes', email: 'carla@exemplo.com', profileUrl: '', grades: { 'item:101': { value: null, display: '' }, 'item:102': { value: null, display: '' }, 'item:total': { value: 20, display: '20' } }, courseTotal: 20, courseTotalDisplay: '20', gradedItems: 1, missingItems: 2 }
    ];
    const gradebook = { course, items: gradebookItems, students: gradebookStudents, courseTotalItem: gradebookItems[2], summary: { itemCount: 3, studentCount: 3, gradedCells: 7, missingCells: 2, studentsWithCourseTotal: 3, studentsWithoutCourseTotal: 0 }, meta: { status: 'ok', collectedAt: new Date().toISOString(), partial: false, confidence: 'alta', sourceUrl: location.href }, diagnostics: { demo: true } };
    const students = MAT.collectors.buildStudents(participants, assignments, grades);
    let snapshot = {
      schemaVersion: 5,
      meta: { extensionVersion: MAT.VERSION, collectedAt: new Date().toISOString(), durationMs: 1200, mode: 'complete', environment: course.environment, host: location.hostname, sourcePage: location.href, warnings: ['Dados de demonstração. Não representam o curso real.'] },
      course: { ...course, sections: [{ id: 'section-demo', name: 'UC de demonstração', dates: ['27/07/2026', '05/08/2026'], activityCount: 3, assignmentCount: 2, activities: [{ id: 'cmid:101', cmid: 101, name: 'Situação de Aprendizagem A', moduleType: 'assign', typeLabel: 'Tarefa', url: location.href, isAssignment: true }, { id: 'cmid:102', cmid: 102, name: 'Atividade Avaliativa B', moduleType: 'assign', typeLabel: 'Tarefa', url: location.href, isAssignment: true }, { id: 'resource:1', cmid: 103, name: 'Material complementar', moduleType: 'resource', typeLabel: 'Arquivo', url: location.href, isAssignment: false }] }], activeUcName: MAT.state.settings.activeUcName || 'UC de demonstração', activeUcSectionId: MAT.state.settings.activeUcSectionId || 'section-demo', activeUcEndDate: MAT.state.settings.activeUcEndDate || '2026-08-05' },
      participants, assignments, grades, gradebook, students,
      sources: [{ name: 'Demonstração local', url: location.href, status: 'ok', collectedAt: new Date().toISOString() }],
      diagnostics: { demo: true }
    };
    snapshot = MAT.rules.enrichSnapshot(snapshot, MAT.state.settings);
    MAT.state.snapshot = snapshot;
    MAT.state.gradebook = gradebook;
    await MAT.storage.saveSnapshot(snapshot, course.id);
    await MAT.storage.saveGradebook(gradebook, course.id);
    renderAll();
    setTab('hoje');
    toast('Demonstração carregada. Atualize para voltar aos dados reais.');
  };

  MAT.ui = { makeLauncher, makePanel, openPanel, closePanel, togglePanel, setLauncherPassive, syncPageLayout, removePanel, renderAll, renderView, updateHeader, updateLauncher, showProgress, hideProgress, setBusy, toast, setTab };
})();
