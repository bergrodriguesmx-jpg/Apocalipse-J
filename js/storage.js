'use strict';
// Arquivo temporário da sessão: chunks frios ficam em disco, não na lista de desenho.
// Falha de quota nunca descarta silenciosamente as alterações: usa memória e avisa.
EZ.openStorage = function() {
  EZ.archive = {
    db: null,
    pending: new Map(),
    fallback: new Map(),
    warning: false
  };
  if (typeof indexedDB === 'undefined') {
    EZ.archive.warning = true;
    return Promise.resolve();
  }
  return new Promise(resolve => {
    let request;
    try {
      request = indexedDB.open('ecozumbi-stream-v2', 1);
    } catch {
      EZ.archive.warning = true;
      resolve();
      return;
    }
    request.onupgradeneeded = () => request.result.createObjectStore('chunks');
    request.onsuccess = () => {
      EZ.archive.db = request.result;
      resolve();
    };
    request.onerror = () => {
      EZ.archive.warning = true;
      resolve();
    };
    request.onblocked = () => {
      EZ.archive.warning = true;
      resolve();
    };
  });
};
EZ.archivePut = function(key, value) {
  const a = EZ.archive;
  a.pending.set(key, value);
  if (!a.db) {
    a.fallback.set(key, value);
    a.pending.delete(key);
    return;
  }
  try {
    const tx = a.db.transaction('chunks', 'readwrite');
    tx.objectStore('chunks').put(value, key);
    tx.oncomplete = () => {
      if (a.pending.get(key) === value) a.pending.delete(key);
    };
    tx.onabort = tx.onerror = () => {
      a.fallback.set(key, value);
      a.pending.delete(key);
      a.warning = true;
    };
  } catch {
    a.fallback.set(key, value);
    a.pending.delete(key);
    a.warning = true;
  }
};
EZ.archiveGet = function(key) {
  const a = EZ.archive;
  if (a.pending.has(key)) return Promise.resolve(a.pending.get(key));
  if (a.fallback.has(key)) return Promise.resolve(a.fallback.get(key));
  if (!a.db) return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const r = a.db.transaction('chunks').objectStore('chunks').get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};
EZ.clearArchive = function() {
  const a = EZ.archive;
  if (!a) return;
  a.pending.clear();
  a.fallback.clear();
  if (a.db) {
    try {
      a.db.transaction('chunks', 'readwrite').objectStore('chunks').clear();
    } catch {
      a.warning = true;
    }
  }
};
