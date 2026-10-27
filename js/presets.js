/**
 * 预设样式 · IndexedDB（非密钥数据）
 * DB: poem-post
 *   - presets：样式预设
 *   - blobs：自定义背景等二进制（不进 git）
 *
 * 背景遮罩持久化约定：
 *   新字段 veilOpacity（0–1，越高遮罩越强）。
 *   旧字段 bgOpacity 表示「背景图可见度」= 1 - veilOpacity；读写时双向兼容。
 */
(function (global) {
  'use strict';

  const DB_NAME = 'poem-post';
  const DB_VERSION = 2;
  const STORE = 'presets';
  const BLOB_STORE = 'blobs';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB 不可用'));
        return;
      }
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
        }
        // v1 → v2：仅新增 blobs；presets 记录结构由应用层迁移
        void ev;
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('打开 IndexedDB 失败'));
    });
    return dbPromise;
  }

  function txStore(storeName, mode) {
    return openDb().then((db) => {
      const tx = db.transaction(storeName, mode);
      return { store: tx.objectStore(storeName), tx };
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function waitTx(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('事务中止'));
    });
  }

  function newId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  async function listPresets() {
    const { store } = await txStore(STORE, 'readonly');
    const all = await reqToPromise(store.getAll());
    return (all || []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function getPreset(id) {
    if (!id) return null;
    const { store } = await txStore(STORE, 'readonly');
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
    const { store, tx } = await txStore(STORE, 'readwrite');
    store.put(record);
    await waitTx(tx);
    return record;
  }

  async function deletePreset(id) {
    if (!id) return;
    const { store, tx } = await txStore(STORE, 'readwrite');
    store.delete(id);
    await waitTx(tx);
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

  /** @param {{id?: string, blob: Blob|ArrayBuffer, mime?: string, kind?: string}} rec */
  async function putBlob(rec) {
    if (!rec || !rec.blob) throw new Error('缺少 blob');
    const id = rec.id || newId();
    const record = {
      id,
      blob: rec.blob,
      mime: rec.mime || (rec.blob && rec.blob.type) || 'application/octet-stream',
      kind: rec.kind || 'bg',
      updatedAt: Date.now()
    };
    const { store, tx } = await txStore(BLOB_STORE, 'readwrite');
    store.put(record);
    await waitTx(tx);
    return record;
  }

  async function getBlob(id) {
    if (!id) return null;
    const { store } = await txStore(BLOB_STORE, 'readonly');
    return (await reqToPromise(store.get(id))) || null;
  }

  async function deleteBlob(id) {
    if (!id) return;
    const { store, tx } = await txStore(BLOB_STORE, 'readwrite');
    store.delete(id);
    await waitTx(tx);
  }

  global.PoemPresets = {
    list: listPresets,
    get: getPreset,
    findByName,
    put: putPreset,
    remove: deletePreset,
    rename: renamePreset,
    newId,
    putBlob,
    getBlob,
    deleteBlob
  };
})(typeof window !== 'undefined' ? window : globalThis);
