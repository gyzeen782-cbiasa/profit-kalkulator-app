/**
 * settings.js — Pengaturan
 * WendStudio · Profit Kalkulator App
 */

const SettingsModule = (() => {

  let defaultPct = 8;
  let darkMode = true;

  async function load() {
    darkMode = (await DB.Settings.get('darkMode')) !== false;
    defaultPct = parseFloat(await DB.Settings.get('defaultPct')) || 8;
    applyTheme();
    document.getElementById('toggle-dark').checked = darkMode;
    document.getElementById('input-default-pct').value = defaultPct;
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }

  async function setDarkMode(val) {
    darkMode = val;
    applyTheme();
    await DB.Settings.set('darkMode', val);
  }

  async function setDefaultPct(val) {
    defaultPct = parseFloat(val) || 8;
    await DB.Settings.set('defaultPct', defaultPct);
  }

  function getDefaultPct() { return defaultPct; }

  function init() {
    document.getElementById('toggle-dark').addEventListener('change', e => setDarkMode(e.target.checked));
    document.getElementById('input-default-pct').addEventListener('change', e => {
      setDefaultPct(e.target.value);
      App.toast('Persentase default disimpan');
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
      App.confirm('Hapus Semua Data?', 'Seluruh file, barang, dan catatan akan dihapus permanen. Tidak dapat dibatalkan.', async () => {
        await DB.clearAll();
        App.toast('Semua data dihapus');
        location.reload();
      });
    });
  }

  return { init, load, getDefaultPct };
})();
