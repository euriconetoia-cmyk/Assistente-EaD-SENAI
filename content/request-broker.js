'use strict';

(() => {
  const MAT = globalThis.MAT;
  const MAX_CONCURRENT_REQUESTS = 2;
  const PRIORITY = { background: 0, normal: 1, interactive: 2 };
  const SENSITIVE_PARAMETERS = /^(?:access_?token|auth(?:orization)?|password|sesskey|token)$/i;
  const cache = new Map();
  const inFlight = new Map();
  const queue = [];
  const scopes = new Map();
  const subscribers = new Map();
  const metrics = {
    cacheHits: 0,
    sharedRequests: 0,
    networkRequests: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    active: 0,
    maxConcurrent: 0,
    totalDurationMs: 0
  };
  let sequence = 0;

  const scopeStatus = (scopeId = 'default') => {
    if (!scopes.has(scopeId)) {
      scopes.set(scopeId, { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 });
    }
    return scopes.get(scopeId);
  };
  const notify = (scopeId) => subscribers.get(scopeId)?.forEach((callback) => callback({ ...scopeStatus(scopeId) }));

  const canonicalKey = (url, cacheKey = '') => {
    if (cacheKey) return String(cacheKey);
    const parsed = new URL(url, globalThis.location?.href);
    parsed.hash = '';
    const parameters = [...parsed.searchParams.entries()]
      .filter(([name]) => !SENSITIVE_PARAMETERS.test(name))
      .sort(([leftName, leftValue], [rightName, rightValue]) => leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue));
    parsed.search = '';
    parameters.forEach(([name, value]) => parsed.searchParams.append(name, value));
    return parsed.toString();
  };

  const metricsSnapshot = () => ({ ...metrics, queued: queue.length, cacheEntries: cache.size });

  const finish = (item, error, result) => {
    clearTimeout(item.timer);
    inFlight.delete(item.key);
    metrics.active = Math.max(0, metrics.active - 1);
    const status = scopeStatus(item.scopeId);
    status.running = Math.max(0, status.running - 1);
    if (error) {
      metrics.failed += 1;
      status.failed += 1;
      item.reject(error);
    } else {
      metrics.completed += 1;
      metrics.totalDurationMs += result.durationMs;
      status.completed += 1;
      if (item.ttlMs > 0) cache.set(item.key, { result, expiresAt: Date.now() + item.ttlMs });
      item.resolve({ ...result, source: 'network' });
    }
    notify(item.scopeId);
    schedule();
  };

  const execute = (item) => {
    metrics.active += 1;
    metrics.maxConcurrent = Math.max(metrics.maxConcurrent, metrics.active);
    metrics.networkRequests += 1;
    const status = scopeStatus(item.scopeId);
    status.queued = Math.max(0, status.queued - 1);
    status.running += 1;
    notify(item.scopeId);
    const started = performance.now();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = new Promise((_, reject) => {
      item.timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error(`${item.label}: tempo limite excedido`));
      }, item.timeoutMs);
    });
    Promise.race([
      fetch(item.url, { credentials: 'include', redirect: 'follow', signal: controller.signal }),
      timeout
    ]).then(async (response) => {
      const text = await response.text();
      if (!response.ok) throw new Error(`${item.label}: HTTP ${response.status}`);
      const finalUrl = response.url || item.url;
      if (/\/login\//i.test(new URL(finalUrl, item.url).pathname) || (/name=["']username["']/i.test(text) && /name=["']password["']/i.test(text))) {
        throw new Error(`${item.label}: sessão expirada`);
      }
      const document = new DOMParser().parseFromString(text, 'text/html');
      return {
        document,
        url: finalUrl,
        fetchedAt: new Date().toISOString(),
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        size: text.length
      };
    }).then(
      (result) => finish(item, null, result),
      (error) => finish(item, timedOut || error?.name === 'AbortError' ? new Error(`${item.label}: tempo limite excedido`) : error)
    );
  };

  const schedule = () => {
    while (metrics.active < MAX_CONCURRENT_REQUESTS && queue.length) {
      queue.sort((left, right) => PRIORITY[right.priority] - PRIORITY[left.priority] || left.sequence - right.sequence);
      execute(queue.shift());
    }
  };

  const fetchDocument = ({
    url,
    cacheKey = '',
    ttlMs = 0,
    priority = 'normal',
    scopeId = 'default',
    timeoutMs = 18000,
    force = false,
    label = 'Leitura Moodle'
  } = {}) => {
    if (!url) return Promise.reject(new Error('Leitura Moodle: URL obrigatória'));
    const key = canonicalKey(url, cacheKey);
    const cached = cache.get(key);
    if (!force && cached && cached.expiresAt > Date.now()) {
      metrics.cacheHits += 1;
      return Promise.resolve({ ...cached.result, source: 'cache' });
    }
    if (cached) cache.delete(key);
    const current = inFlight.get(key);
    if (current) {
      metrics.sharedRequests += 1;
      return current.promise.then((result) => ({ ...result, source: 'shared' }));
    }
    let resolveRequest;
    let rejectRequest;
    const promise = new Promise((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    const item = {
      key,
      url,
      ttlMs: Number.isFinite(ttlMs) ? ttlMs : 0,
      priority: PRIORITY[priority] === undefined ? 'normal' : priority,
      scopeId,
      timeoutMs: Math.max(1, Number(timeoutMs) || 18000),
      label,
      sequence: sequence += 1,
      resolve: resolveRequest,
      reject: rejectRequest,
      timer: null
    };
    inFlight.set(key, { promise });
    queue.push(item);
    scopeStatus(scopeId).queued += 1;
    notify(scopeId);
    schedule();
    return promise;
  };

  const cancelScope = (scopeId) => {
    let cancelled = 0;
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      const item = queue[index];
      if (item.scopeId !== scopeId) continue;
      queue.splice(index, 1);
      inFlight.delete(item.key);
      scopeStatus(scopeId).queued = Math.max(0, scopeStatus(scopeId).queued - 1);
      scopeStatus(scopeId).cancelled += 1;
      metrics.cancelled += 1;
      cancelled += 1;
      item.reject(new Error(`${item.label}: leitura cancelada`));
      notify(scopeId);
    }
    return cancelled;
  };

  const invalidate = (predicate = () => true) => {
    let removed = 0;
    cache.forEach((entry, key) => {
      if (predicate(key, entry)) {
        cache.delete(key);
        removed += 1;
      }
    });
    return removed;
  };
  const subscribe = (scopeId, callback) => {
    if (typeof callback !== 'function') return () => {};
    const listeners = subscribers.get(scopeId) || new Set();
    subscribers.set(scopeId, listeners);
    listeners.add(callback);
    callback({ ...scopeStatus(scopeId) });
    return () => { listeners.delete(callback); if (!listeners.size) subscribers.delete(scopeId); };
  };

  MAT.requestBroker = {
    fetchDocument,
    cancelScope,
    invalidate,
    subscribe,
    getStatus: (scopeId = 'default') => ({ ...scopeStatus(scopeId) }),
    getMetrics: metricsSnapshot
  };
})();
