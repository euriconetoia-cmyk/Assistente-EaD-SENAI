'use strict';

(() => {
  const DB_NAME = 'mat_local_evidence_directory';
  const STORE_NAME = 'handles';
  const HANDLE_KEY = 'evidence-directory';

  const supported = () => typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';

  const openDatabase = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento da pasta.'));
  });

  const storeHandle = async (handle) => {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Não foi possível guardar a referência da pasta.'));
    });
    database.close();
    return handle;
  };

  const loadHandle = async () => {
    if (!supported()) return null;
    const database = await openDatabase();
    const handle = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Não foi possível recuperar a pasta.'));
    });
    database.close();
    return handle;
  };

  const forgetHandle = async () => {
    if (!supported()) return;
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Não foi possível remover a referência da pasta.'));
    });
    database.close();
  };

  const chooseDirectory = async () => {
    if (!supported()) throw new Error('A escolha direta de pasta não está disponível neste navegador.');
    const handle = await window.showDirectoryPicker({ id: 'mat-evidence-directory', mode: 'readwrite' });
    await storeHandle(handle);
    return handle;
  };

  const ensurePermission = async (handle, request = false) => {
    if (!handle) return false;
    const options = { mode: 'readwrite' };
    if (await handle.queryPermission(options) === 'granted') return true;
    return request && await handle.requestPermission(options) === 'granted';
  };

  const safeName = (value, fallback = 'evidencias') => String(value || fallback)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 100) || fallback;

  const uniqueDirectory = async (parent, preferredName) => {
    const base = safeName(preferredName);
    for (let index = 0; index < 100; index += 1) {
      const name = index ? `${base}_${index + 1}` : base;
      try {
        await parent.getDirectoryHandle(name);
      } catch (error) {
        if (error?.name === 'NotFoundError') return parent.getDirectoryHandle(name, { create: true });
        throw error;
      }
    }
    throw new Error('Não foi possível criar uma pasta exclusiva para a exportação.');
  };

  const writeFiles = async (handle, files, folderName) => {
    if (!await ensurePermission(handle, true)) throw new Error('A pasta não possui autorização de gravação.');
    const appFolder = await handle.getDirectoryHandle('Assistente_EaD_SENAI', { create: true });
    const evidenceFolder = await appFolder.getDirectoryHandle('Evidencias', { create: true });
    const destination = await uniqueDirectory(evidenceFolder, folderName);
    const written = [];
    for (const file of files) {
      const name = safeName(file.name, 'arquivo');
      const fileHandle = await destination.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(file.blob instanceof Blob ? file.blob : new Blob([file.content ?? ''], { type: file.type || 'application/octet-stream' }));
        await writable.close();
        written.push(name);
      } catch (error) {
        await writable.abort?.().catch(() => {});
        throw new Error(`Falha ao gravar ${name}: ${error?.message || error}`);
      }
    }
    return { directoryName: destination.name, written };
  };

  globalThis.MAT_DIRECTORY = { supported, loadHandle, chooseDirectory, ensurePermission, forgetHandle, writeFiles, safeName };
})();
