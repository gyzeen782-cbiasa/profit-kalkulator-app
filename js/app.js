/**
 * app.js — App Shell, Router, Navigation
 * WendStudio · Profit Kalkulator App
 */

const App = (() => {

  const SCREENS = ['home', 'files', 'calculator', 'notes', 'settings'];
  const SPREADSHEET_SCREEN = 'spreadsheet';
  let currentScreen = 'home';
  let prevScreen = null;
  let toastTimer = null;
  let confirmCallback = null;

  // ---- NAVIGATION ----

  function navigate(screenId) {
    const isSpreadsheet = screenId === SPREADSHEET_SCREEN;

    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    if (isSpreadsheet) {
      document.getElementById('screen-spreadsheet').classList.add('active');
      document.getElementById('btn-back').classList.remove('hidden');
      document.getElementById('bottom-nav').style.display = 'none';
      prevScreen = currentScreen;
      currentScreen = SPREADSHEET_SCREEN;
    } else {
      const screen = document.getElementById(`screen-${screenId}`);
      if (!screen) return;
      screen.classList.add('active');

      // Update bottom nav
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screenId);
      });

      // Top bar
      document.getElementById('btn-back').classList.add('hidden');
      document.getElementById('bottom-nav').style.display = 'flex';

      const titles = { home: 'Beranda', files: 'File Saya', calculator: 'Kalkulator', notes: 'Catatan', settings: 'Pengaturan' };
      document.getElementById('page-title').textContent = titles[screenId] || '';
      document.getElementById('topbar-actions').innerHTML = '';

      prevScreen = currentScreen;
      currentScreen = screenId;

      // Trigger screen-specific load
      if (screenId === 'notes') NotesModule.showListView();
    }
  }

  function goBack() {
    if (currentScreen === SPREADSHEET_SCREEN) {
      navigate(prevScreen || 'home');
      FilesModule.loadFiles();
    }
  }

  // ---- TOAST ----

  function toast(msg, duration = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  // ---- CONFIRM MODAL ----

  function confirm(title, desc, onOk) {
    confirmCallback = onOk;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-desc').textContent = desc;
    document.getElementById('modal-confirm').classList.remove('hidden');
  }

  function getDefaultPct() {
    return SettingsModule.getDefaultPct();
  }

  // ---- SPLASH ----

  function hideSplash() {
    const splash = document.getElementById('splash');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
    }, 400);
  }

  // ---- INIT ----

  async function init() {
    await DB.open();
    await SettingsModule.load();

    // Init modules
    FilesModule.init();
    SpreadsheetModule.init();
    CalculatorModule.init();
    NotesModule.init();
    SettingsModule.init();
    ExportModule.init();

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.screen));
    });

    // Back btn
    document.getElementById('btn-back').addEventListener('click', goBack);

    // Confirm modal
    document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
      document.getElementById('modal-confirm').classList.add('hidden');
      confirmCallback = null;
    });
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
      document.getElementById('modal-confirm').classList.add('hidden');
      if (confirmCallback) { confirmCallback(); confirmCallback = null; }
    });

    // Overlay click to close modals
    ['modal-file','modal-item','modal-pct','modal-file-notes','modal-confirm'].forEach(id => {
      document.getElementById(id).addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
      });
    });

    // Start on home
    navigate('home');

    // Splash -> app
    setTimeout(hideSplash, 1200);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, toast, confirm, getDefaultPct };
})();
