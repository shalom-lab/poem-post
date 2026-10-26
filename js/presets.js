/**
 * 预设样式 · IndexedDB（非密钥数据）
 * DB: poem-post / store: presets
 */
(function (global) {
  'use strict';

  const DB_NAME = 'poem-post';
  const DB_VERSION = 1;
  const STORE = 'presets';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB 不可用'));
        return;
      }
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('打开 IndexedDB 失败'));
    });
    return dbPromise;
  }

  function txStore(mode) {
    return openDb().then((db) => {
      const tx = db.transaction(STORE, mode);
      return { store: tx.objectStore(STORE), tx };
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function newId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  async function listPresets() {
    const { store } = await txStore('readonly');
    const all = await reqToPromise(store.getAll());
    return (all || []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function getPreset(id) {
    if (!id) return null;
    const { store } = await txStore('readonly');
    return (await reqToPromise(store.get(id))) || null;
  }

  async function findByName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const all = await listPresets();
    return all.find((p) => p.name === trimmed) || null;
  }

  async function putPreset(preset) {
    const record = { ...preset };
    if (!record.id) record.id = newId();
    record.name = String(record.name || '').trim();
    if (!record.name) throw new Error('预设名称不能为空');
    record.updatedAt = Date.now();
    const { store, tx } = await txStore('readwrite');
    store.put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('写入中止'));
    });
    return record;
  }

  async function deletePreset(id) {
    if (!id) return;
    const { store, tx } = await txStore('readwrite');
    store.delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('删除中止'));
    });
  }

  async function renamePreset(id, newName) {
    const name = String(newName || '').trim();
    if (!name) throw new Error('预设名称不能为空');
    const existing = await getPreset(id);
    if (!existing) throw new Error('预设不存在');
    const clash = await findByName(name);
    if (clash && clash.id !== id) throw new Error('已有同名预设');
    existing.name = name;
    existing.updatedAt = Date.now();
    return putPreset(existing);
  }

  global.PoemPresets = {
    list: listPresets,
    get: getPreset,
    findByName,
    put: putPreset,
    remove: deletePreset,
    rename: renamePreset,
    newId
  };
})(typeof window !== 'undefined' ? window : globalThis);
