/**
 * belanja.js — Fitur Belanja
 * WendStudio · Profit Kalkulator App
 *
 * Flow: Input barang (autocomplete dari semua file) →
 *       Modal otomatis terisi → Tambah ke daftar →
 *       Running total live → Konfirmasi → Simpan ke History
 */

const BelanjaModule = (() => {

  // ---- STATE ----
  let draftItems   = [];   // [{name, modal, qty}] — sesi belanja aktif
  let allCatalog   = [];   // [{name, modal, fileId, fileName}] — semua barang dari semua file
  let historyData  = [];   // [{id, date, items, total}]
  let editingHistId   = null;
  let editingHistIdx  = null;
  let activeView   = 'form'; // 'form' | 'confirm' | 'history'

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  // ---- CATALOG: load semua barang dari semua file ----
  async function loadCatalog() {
    const items = await DB.Items.getAll();
    const files = await DB.Files.getAll();
    const fileMap = {};
    files.forEach(f => { fileMap[f.id] = f.name; });

    allCatalog = items.map(i => ({
      name:     i.name,
      modal:    parseFloat(i.modal) || 0,
      fileId:   i.fileId,
      fileName: fileMap[i.fileId] || '',
    }));
  }

  // ---- HISTORY: load dari IndexedDB ----
  async function loadHistory() {
    // Simpan history belanja di key 'belanja_history' via Settings store
    const raw = await DB.Settings.get('belanja_history');
    historyData = raw ? JSON.parse(raw) : [];
  }

  async function saveHistory() {
    await DB.Settings.set('belanja_history', JSON.stringify(historyData));
  }

  // ---- VIEW SWITCHER ----
  function showView(v) {
    activeView = v;
    document.getElementById('belanja-form-view').classList.toggle('hidden', v !== 'form');
    document.getElementById('belanja-confirm-view').classList.toggle('hidden', v !== 'confirm');
    document.getElementById('belanja-history-view').classList.toggle('hidden', v !== 'history');

    // Update topbar title + actions
    const titles = { form: 'Belanja', confirm: 'Konfirmasi', history: 'History Belanja' };
    document.getElementById('page-title').textContent = titles[v] || 'Belanja';

    const actions = document.getElementById('topbar-actions');
    if (v === 'form') {
      actions.innerHTML = `
        <button class="icon-btn" id="btn-to-history" title="History Belanja">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>`;
      document.getElementById('btn-to-history').addEventListener('click', () => {
        renderHistoryView();
        showView('history');
      });
    } else if (v === 'history') {
      actions.innerHTML = `
        <button class="icon-btn" id="btn-to-form" title="Buat Belanja Baru">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>`;
      document.getElementById('btn-to-form').addEventListener('click', () => showView('form'));
    } else {
      actions.innerHTML = '';
    }
  }

  // ---- AUTOCOMPLETE ----
  function setupAutocomplete() {
    const input    = document.getElementById('belanja-name-input');
    const dropdown = document.getElementById('autocomplete-dropdown');
    const modalEl  = document.getElementById('belanja-modal-input');
    const qtyEl    = document.getElementById('belanja-qty-input');

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      updatePreview();

      if (!q) { dropdown.classList.add('hidden'); return; }

      // Filter catalog
      const matches = allCatalog
        .filter(c => c.name.toLowerCase().includes(q))
        .slice(0, 8);

      if (matches.length === 0) { dropdown.classList.add('hidden'); return; }

      dropdown.innerHTML = '';
      matches.forEach(c => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `
          <div class="ac-name">${esc(c.name)}</div>
          <div class="ac-meta">${Calc.toRupiah(c.modal)} · <span class="ac-file">${esc(c.fileName)}</span></div>
        `;
        div.addEventListener('mousedown', e => e.preventDefault());
        div.addEventListener('click', () => {
          input.value   = c.name;
          modalEl.value = c.modal;
          dropdown.classList.add('hidden');
          updatePreview();
          qtyEl.focus();
        });
        dropdown.appendChild(div);
      });
      dropdown.classList.remove('hidden');
    });

    input.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.add('hidden'), 150);
    });

    modalEl.addEventListener('input', updatePreview);
    qtyEl.addEventListener('input', updatePreview);
  }

  function updatePreview() {
    const modal = parseFloat(document.getElementById('belanja-modal-input').value) || 0;
    const qty   = parseFloat(document.getElementById('belanja-qty-input').value) || 1;
    document.getElementById('belanja-preview-val').textContent = Calc.toRupiah(modal * qty);
  }

  // ---- ADD ITEM TO DRAFT ----
  function addToDraft() {
    const name  = document.getElementById('belanja-name-input').value.trim();
    const modal = parseFloat(document.getElementById('belanja-modal-input').value);
    const qty   = parseFloat(document.getElementById('belanja-qty-input').value) || 1;

    if (!name)         { App.toast('Nama barang tidak boleh kosong'); return; }
    if (isNaN(modal) || modal < 0) { App.toast('Modal tidak valid'); return; }

    draftItems.push({ id: uid(), name, modal, qty });

    // Reset input
    document.getElementById('belanja-name-input').value  = '';
    document.getElementById('belanja-modal-input').value = '';
    document.getElementById('belanja-qty-input').value   = 1;
    document.getElementById('belanja-preview-val').textContent = 'Rp0';
    document.getElementById('belanja-name-input').focus();

    renderDraftList();
    App.toast(`${name} ditambahkan`);
  }

  // ---- RENDER DRAFT LIST ----
  function renderDraftList() {
    const list  = document.getElementById('belanja-list');
    const empty = document.getElementById('belanja-empty');
    const bar   = document.getElementById('belanja-total-bar');

    list.innerHTML = '';

    if (draftItems.length === 0) {
      empty.classList.remove('hidden');
      bar.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    bar.classList.remove('hidden');

    let grand = 0;
    draftItems.forEach((item, idx) => {
      const sub = item.modal * item.qty;
      grand += sub;
      list.appendChild(buildDraftRow(item, idx, sub));
    });

    document.getElementById('belanja-grand-total').textContent = Calc.toRupiah(grand);
  }

  function buildDraftRow(item, idx, sub) {
    const div = document.createElement('div');
    div.className = 'belanja-row';
    div.innerHTML = `
      <div class="belanja-row-main">
        <div class="belanja-row-name">${esc(item.name)}</div>
        <div class="belanja-row-sub">${Calc.toRupiah(item.modal)} × ${item.qty}</div>
      </div>
      <div class="belanja-row-right">
        <div class="belanja-row-total">${Calc.toRupiah(sub)}</div>
        <button class="row-action-btn del belanja-del" data-idx="${idx}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;
    div.querySelector('.belanja-del').addEventListener('click', () => {
      draftItems.splice(idx, 1);
      renderDraftList();
    });
    return div;
  }

  // ---- KONFIRMASI VIEW ----
  function showKonfirmasi() {
    if (draftItems.length === 0) { App.toast('Daftar belanja masih kosong'); return; }

    const now = new Date();
    document.getElementById('konfirmasi-date').textContent =
      now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    const list = document.getElementById('konfirmasi-list');
    list.innerHTML = '';
    let grand = 0;
    draftItems.forEach(item => {
      const sub = item.modal * item.qty;
      grand += sub;
      const div = document.createElement('div');
      div.className = 'belanja-row';
      div.innerHTML = `
        <div class="belanja-row-main">
          <div class="belanja-row-name">${esc(item.name)}</div>
          <div class="belanja-row-sub">${Calc.toRupiah(item.modal)} × ${item.qty}</div>
        </div>
        <div class="belanja-row-right">
          <div class="belanja-row-total">${Calc.toRupiah(sub)}</div>
        </div>
      `;
      list.appendChild(div);
    });

    document.getElementById('konfirmasi-total').textContent = Calc.toRupiah(grand);
    showView('confirm');
  }

  // ---- SAVE TO HISTORY ----
  async function saveToHistory() {
    const grand = draftItems.reduce((s, i) => s + i.modal * i.qty, 0);
    const entry = {
      id:        uid(),
      date:      Date.now(),
      items:     [...draftItems],
      total:     grand,
    };
    historyData.unshift(entry);
    await saveHistory();

    // Reset draft
    draftItems = [];
    renderDraftList();
    App.toast('Belanja disimpan ke history!');
    renderHistoryView();
    showView('history');
  }

  // ---- HISTORY VIEW ----
  function renderHistoryView() {
    const list  = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    list.innerHTML = '';

    if (historyData.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    historyData.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
      const timeStr = d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

      card.innerHTML = `
        <div class="history-card-header">
          <div>
            <div class="history-card-date">${dateStr} · ${timeStr}</div>
            <div class="history-card-count">${entry.items.length} jenis barang</div>
          </div>
          <div class="history-card-total">${Calc.toRupiah(entry.total)}</div>
        </div>
        <div class="history-card-preview">
          ${entry.items.slice(0,3).map(i => `<span class="history-pill">${esc(i.name)}</span>`).join('')}
          ${entry.items.length > 3 ? `<span class="history-pill muted">+${entry.items.length-3} lagi</span>` : ''}
        </div>
        <div class="history-card-actions">
          <button class="file-action-btn" data-hid="${entry.id}" data-action="detail">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Detail
          </button>
          <button class="file-action-btn" data-hid="${entry.id}" data-action="edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="file-action-btn red" data-hid="${entry.id}" data-action="delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Hapus
          </button>
        </div>
      `;

      // Events
      card.querySelector('[data-action="detail"]').addEventListener('click', () => showHistoryDetail(entry.id));
      card.querySelector('[data-action="edit"]').addEventListener('click', () => showHistoryEditSession(entry.id));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteHistory(entry.id));

      list.appendChild(card);
    });
  }

  // ---- HISTORY DETAIL (modal) ----
  function showHistoryDetail(hid) {
    const entry = historyData.find(e => e.id === hid);
    if (!entry) return;

    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    let html = `<div style="font-size:13px;color:var(--text3);margin-bottom:14px;">${dateStr}</div>`;
    entry.items.forEach(i => {
      const sub = i.modal * i.qty;
      html += `
        <div class="belanja-row" style="margin-bottom:8px;">
          <div class="belanja-row-main">
            <div class="belanja-row-name">${esc(i.name)}</div>
            <div class="belanja-row-sub">${Calc.toRupiah(i.modal)} × ${i.qty}</div>
          </div>
          <div class="belanja-row-right">
            <div class="belanja-row-total">${Calc.toRupiah(sub)}</div>
          </div>
        </div>`;
    });
    html += `<div class="konfirmasi-total-box" style="margin-top:12px;">
      <span class="konfirmasi-total-label">TOTAL</span>
      <span class="konfirmasi-total-val">${Calc.toRupiah(entry.total)}</span>
    </div>`;

    // Reuse confirm modal as detail view
    document.getElementById('confirm-title').textContent = 'Detail Belanja';
    document.getElementById('confirm-desc').innerHTML = html;
    document.getElementById('btn-confirm-ok').style.display = 'none';
    document.getElementById('btn-confirm-cancel').textContent = 'Tutup';
    document.getElementById('modal-confirm').classList.remove('hidden');

    // Reset confirm btn after close
    document.getElementById('btn-confirm-cancel').onclick = () => {
      document.getElementById('modal-confirm').classList.add('hidden');
      document.getElementById('btn-confirm-ok').style.display = '';
      document.getElementById('btn-confirm-cancel').textContent = 'Batal';
      document.getElementById('btn-confirm-cancel').onclick = null;
    };
  }

  // ---- HISTORY EDIT SESSION ----
  // Load history entry back into draft, go to form, save overwrites same entry
  function showHistoryEditSession(hid) {
    const entry = historyData.find(e => e.id === hid);
    if (!entry) return;

    editingHistId = hid;
    draftItems = entry.items.map(i => ({ ...i, id: i.id || uid() }));
    renderDraftList();
    showView('form');
    App.toast('Edit mode — simpan konfirmasi untuk update history');

    // Override save button to UPDATE not create new
    document.getElementById('btn-konfirmasi-save').dataset.editMode = hid;
  }

  // ---- DELETE HISTORY ----
  async function deleteHistory(hid) {
    App.confirm('Hapus history ini?', 'Data belanja ini akan dihapus permanen.', async () => {
      historyData = historyData.filter(e => e.id !== hid);
      await saveHistory();
      renderHistoryView();
      App.toast('History dihapus');
    });
  }

  // ---- INIT ----
  async function onEnter() {
    await loadCatalog();
    await loadHistory();
    showView('form');
    renderDraftList();
  }

  function init() {
    // Add to draft
    document.getElementById('btn-belanja-add').addEventListener('click', addToDraft);

    // Enter on qty input = add
    document.getElementById('belanja-qty-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') addToDraft();
    });

    // Clear draft
    document.getElementById('btn-belanja-clear').addEventListener('click', () => {
      if (draftItems.length === 0) return;
      App.confirm('Kosongkan daftar?', 'Semua item dalam daftar belanja akan dihapus.', () => {
        draftItems = [];
        editingHistId = null;
        document.getElementById('btn-konfirmasi-save').dataset.editMode = '';
        renderDraftList();
      });
    });

    // Konfirmasi
    document.getElementById('btn-belanja-konfirmasi').addEventListener('click', showKonfirmasi);

    // Back from konfirmasi
    document.getElementById('btn-konfirmasi-back').addEventListener('click', () => showView('form'));

    // Save to history
    document.getElementById('btn-konfirmasi-save').addEventListener('click', async () => {
      const editMode = document.getElementById('btn-konfirmasi-save').dataset.editMode;
      if (editMode) {
        // Update existing history entry
        const idx = historyData.findIndex(e => e.id === editMode);
        if (idx !== -1) {
          const grand = draftItems.reduce((s, i) => s + i.modal * i.qty, 0);
          historyData[idx].items = [...draftItems];
          historyData[idx].total = grand;
          await saveHistory();
          draftItems = [];
          editingHistId = null;
          document.getElementById('btn-konfirmasi-save').dataset.editMode = '';
          renderDraftList();
          renderHistoryView();
          showView('history');
          App.toast('History diperbarui');
          return;
        }
      }
      await saveToHistory();
    });

    // Autocomplete setup
    setupAutocomplete();

    // Overlay close for history edit modal
    document.getElementById('modal-history-edit').addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('btn-hist-edit-cancel').addEventListener('click', () => {
      document.getElementById('modal-history-edit').classList.add('hidden');
    });
    document.getElementById('btn-hist-edit-save').addEventListener('click', saveHistItemEdit);
  }

  // ---- INLINE ITEM EDIT IN HISTORY (from detail view) ----
  let histEditEntry = null;

  function saveHistItemEdit() {
    if (!histEditEntry) return;
    const name  = document.getElementById('hist-edit-name').value.trim();
    const modal = parseFloat(document.getElementById('hist-edit-modal').value);
    const qty   = parseFloat(document.getElementById('hist-edit-qty').value) || 1;
    if (!name || isNaN(modal)) { App.toast('Data tidak valid'); return; }

    const entry = historyData.find(e => e.id === histEditEntry.hid);
    if (entry) {
      entry.items[histEditEntry.idx] = { ...entry.items[histEditEntry.idx], name, modal, qty };
      entry.total = entry.items.reduce((s, i) => s + i.modal * i.qty, 0);
      saveHistory();
      renderHistoryView();
      App.toast('Item diperbarui');
    }
    document.getElementById('modal-history-edit').classList.add('hidden');
    histEditEntry = null;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  return { init, onEnter };
})();
