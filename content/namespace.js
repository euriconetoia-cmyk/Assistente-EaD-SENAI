'use strict';

(() => {
  const root = globalThis;
  root.MAT = root.MAT || {};
  root.MAT.VERSION = root.chrome?.runtime?.getManifest?.().version || '3.6.1';
  root.MAT.APP_NAME = 'Assistente EaD SENAI';
  root.MAT.dom = (() => {
    const HOST_ID = 'mat-assistant-host';
    let shadowRoot = null;

    const ensureHost = () => {
      if (shadowRoot?.isConnected) return shadowRoot;
      let host = document.getElementById(HOST_ID);
      if (!host) {
        host = document.createElement('div');
        host.id = HOST_ID;
        host.style.setProperty('all', 'initial', 'important');
        document.documentElement.appendChild(host);
      }
      shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      if (!shadowRoot.querySelector('link[data-mat-styles]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('content/styles.css');
        link.dataset.matStyles = 'true';
        shadowRoot.appendChild(link);
      }
      return shadowRoot;
    };

    const getElementById = (id) => ensureHost().getElementById(id) || document.getElementById(id);
    const querySelector = (selector) => ensureHost().querySelector(selector) || document.querySelector(selector);
    const querySelectorAll = (selector) => {
      const matches = ensureHost().querySelectorAll(selector);
      return matches.length ? matches : document.querySelectorAll(selector);
    };
    const append = (node) => ensureHost().appendChild(node);

    return { ensureHost, getElementById, querySelector, querySelectorAll, append };
  })();
  root.MAT.state = {
    adapter: null,
    course: null,
    snapshot: null,
    gradebook: null,
    settings: null,
    actions: [],
    isOpen: false,
    isMoodleAuthoring: false,
    isCollecting: false,
    isCollectingGrades: false,
    operationMode: 'consulta',
    storageError: '',
    activeTab: 'hoje',
    studentFilter: '',
    riskFilter: 'todos',
    assignmentFilter: 'todos',
    gradeSearch: '',
    gradeStatusFilter: 'todos'
  };
})();
