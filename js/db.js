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
  const TRANSIENT_KEYS = ['belanja_history', 'belanja_draft', 'last_backup'];
  const BACKUP_FORMAT = 'profit-kalkulator-backup';
  const SCHEMA_VERSION = 2;
  const APP_VERSION = '1.1.0';

  async function fullDump() {
    await open();
    const [files, items, notes, allSettings] = await Promise.all([
      Files.getAll(), Items.getAll(), Notes.getAll(), req2p(tx('settings').getAll())
    ]);
    const hist = allSettings.find(r => r.key === 'belanja_history');
    return {
      format: BACKUP_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      files, items, notes,
      belanjaHistory: hist && hist.value ? JSON.parse(hist.value) : [],
      settings: allSettings.filter(r => !TRANSIENT_KEYS.includes(r.key)),
      version: 1
    };
  }

  function validateDump(data) {
    const bad = m => { throw new Error(m); };
    if (!data || typeof data !== 'object' || Array.isArray(data)) bad('Isi file bukan data backup.');
    if (data.format && data.format !== BACKUP_FORMAT) bad('File ini bukan backup Profit Kalkulator.');
    if (!Array.isArray(data.files) || !Array.isArray(data.items)) bad('Data file dan barang tidak ditemukan.');
    if (data.notes !== undefined && !Array.isArray(data.notes)) bad('Data catatan rusak.');
    if (data.belanjaHistory !== undefined && !Array.isArray(data.belanjaHistory)) bad('Data history belanja rusak.');
    if (data.settings !== undefined && !Array.isArray(data.settings)) bad('Data pengaturan rusak.');
    data.files.forEach(f => { if (!f || !f.id || typeof f.name !== 'string') bad('Ada file di backup yang rusak.'); });
    data.items.forEach(i => { if (!i || !i.id || !i.fileId) bad('Ada barang di backup yang rusak.'); });
    (data.notes || []).forEach(n => { if (!n || !n.id) bad('Ada catatan di backup yang rusak.'); });
    (data.settings || []).forEach(r => { if (!r || typeof r.key !== 'string') bad('Ada pengaturan di backup yang rusak.'); });
    return {
      files: data.files.length,
      items: data.items.length,
      notes: (data.notes || []).length,
      belanja: (data.belanjaHistory || []).length,
      hasHistory: data.belanjaHistory !== undefined,
      exportedAt: data.exportedAt || null
    };
  }

  async function restoreFromDump(data) {
    validateDump(data);
    await open();
    const withSettings = Array.isArray(data.settings);
    const touchSettings = withSettings || data.belanjaHistory !== undefined;
    const names = ['files', 'items', 'notes'].concat(touchSettings ? ['settings'] : []);
    await new Promise((resolve, reject) => {
      const t = db.transaction(names, 'readwrite');
      t.oncomplete = resolve;
      t.onerror = t.onabort = () => reject(t.error || new Error('Restore gagal'));
      ['files', 'items', 'notes'].forEach(n => t.objectStore(n).clear());
      data.files.forEach(f => t.objectStore('files').put(f));
      data.items.forEach(i => t.objectStore('items').put(i));
      (data.notes || []).forEach(n => t.objectStore('notes').put(n));
      if (touchSettings) {
        const st = t.objectStore('settings');
        if (withSettings) {
          st.getAllKeys().onsuccess = e => {
            e.target.result.filter(k => !TRANSIENT_KEYS.includes(k)).forEach(k => st.delete(k));
            data.settings.forEach(r => { if (!TRANSIENT_KEYS.includes(r.key)) st.put({ key: r.key, value: r.value }); });
          };
        }
        if (data.belanjaHistory !== undefined) st.put({ key: 'belanja_history', value: JSON.stringify(data.belanjaHistory) });
        st.put({ key: 'belanja_draft', value: '[]' });
      }
    });
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

  return { open, Files, Items, Notes, Settings, fullDump, validateDump, restoreFromDump, clearAll };
})();
