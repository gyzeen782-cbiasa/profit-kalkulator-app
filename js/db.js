/**
 * db.js — IndexedDB wrapper
 * WendStudio · Profit Kalkulator App
 */

const DB = (() => {
  const DB_NAME = 'ProfitKalkulatorDB';
  const DB_VERSION = 1;
  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const d = e.target.result;

        // FILES store
        if (!d.objectStoreNames.contains('files')) {
          const fs = d.createObjectStore('files', { keyPath: 'id' });
          fs.createIndex('updatedAt', 'updatedAt');
        }

        // ITEMS store
        if (!d.objectStoreNames.contains('items')) {
          const is = d.createObjectStore('items', { keyPath: 'id' });
          is.createIndex('fileId', 'fileId');
        }

        // NOTES store
        if (!d.objectStoreNames.contains('notes')) {
          const ns = d.createObjectStore('notes', { keyPath: 'id' });
          ns.createIndex('fileId', 'fileId');
          ns.createIndex('updatedAt', 'updatedAt');
        }

        // SETTINGS store
        if (!d.objectStoreNames.contains('settings')) {
          d.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, mode = 'readonly') {
    return db.transaction(store, mode).objectStore(store);
  }

  function req2p(r) {
    return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }

  // ---- FILES ----
  const Files = {
    getAll: () => open().then(() => req2p(tx('files').getAll())),
    get: id => open().then(() => req2p(tx('files').get(id))),
    save: file => open().then(() => req2p(tx('files', 'readwrite').put(file))),
    delete: id => open().then(() => req2p(tx('files', 'readwrite').delete(id))),
  };

  // ---- ITEMS ----
  const Items = {
    getAllByFile: fileId => open().then(() => {
      return new Promise((res, rej) => {
        const idx = tx('items').index('fileId');
        const req = idx.getAll(fileId);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    }),
    save: item => open().then(() => req2p(tx('items', 'readwrite').put(item))),
    delete: id => open().then(() => req2p(tx('items', 'readwrite').delete(id))),
    deleteByFile: fileId => open().then(() => {
      return new Promise((res, rej) => {
        const idx = tx('items', 'readwrite').index('fileId');
        const req = idx.openCursor(fileId);
        req.onsuccess = e => {
          const cur = e.target.result;
          if (cur) { cur.delete(); cur.continue(); }
          else res();
        };
        req.onerror = () => rej(req.error);
      });
    }),
    getAll: () => open().then(() => req2p(tx('items').getAll())),
  };

  // ---- NOTES ----
  const Notes = {
    getAll: () => open().then(() => req2p(tx('notes').getAll())),
    get: id => open().then(() => req2p(tx('notes').get(id))),
    save: note => open().then(() => req2p(tx('notes', 'readwrite').put(note))),
    delete: id => open().then(() => req2p(tx('notes', 'readwrite').delete(id))),
    getByFile: fileId => open().then(() => {
      return new Promise((res, rej) => {
        const idx = tx('notes').index('fileId');
        const req = idx.getAll(fileId);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    }),
  };

  // ---- SETTINGS ----
  const Settings = {
    get: key => open().then(() => req2p(tx('settings').get(key))).then(r => r ? r.value : null),
    set: (key, value) => open().then(() => req2p(tx('settings', 'readwrite').put({ key, value }))),
  };

  // ---- FULL DUMP (for backup) ----
  async function fullDump() {
    await open();
    const [files, items, notes] = await Promise.all([
      Files.getAll(), Items.getAll(), Notes.getAll()
    ]);
    return { files, items, notes, exportedAt: new Date().toISOString(), version: 1 };
  }

  async function restoreFromDump(data) {
    await open();
    // Clear existing
    await Promise.all([
      req2p(tx('files','readwrite').clear()),
      req2p(tx('items','readwrite').clear()),
      req2p(tx('notes','readwrite').clear()),
    ]);
    // Re-insert
    for (const f of (data.files || [])) await Files.save(f);
    for (const i of (data.items || [])) await Items.save(i);
    for (const n of (data.notes || [])) await Notes.save(n);
  }

  async function clearAll() {
    await open();
    await Promise.all([
      req2p(tx('files','readwrite').clear()),
      req2p(tx('items','readwrite').clear()),
      req2p(tx('notes','readwrite').clear()),
      req2p(tx('settings','readwrite').clear()),
    ]);
  }

  return { open, Files, Items, Notes, Settings, fullDump, restoreFromDump, clearAll };
})();
