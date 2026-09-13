/**
 * spreadsheet.js — Spreadsheet / Tabel Barang
 * WendStudio · Profit Kalkulator App
 * v2: search, sort A-Z, jumlah barang di totals
 */

const SpreadsheetModule = (() => {

  let currentFile = null;
  let items = [];
  let filteredItems = [];
  let editingItemId = null;
  let sortMode = 'default'; // default | az | za
  let searchQuery = '';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  async function open(file) {
    currentFile = file;
    items = await DB.Items.getAllByFile(file.id);
    App.navigate('spreadsheet');
    document.getElementById('page-title').textContent = file.name;
    document.getElementById('btn-file-pct').textContent = Calc.fmtPct(file.pct);

    // Reset search & sort on open
    searchQuery = '';
    sortMode = 'default';
    const searchEl = document.getElementById('ss-search');
    if (searchEl) searchEl.value = '';
    updateSortBtn();

    applyFilterSort();
    renderTable();
    renderTotals();
  }

  // ---- FILTER & SORT ----

  function applyFilterSort() {
    let result = [...items];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortMode === 'az') result.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    else if (sortMode === 'za') result.sort((a, b) => b.name.localeCompare(a.name, 'id'));
    // 'default' = insertion order

    filteredItems = result;
  }

  function cycleSortMode() {
    const modes = ['default', 'az', 'za'];
    sortMode = modes[(modes.indexOf(sortMode) + 1) % modes.length];
    updateSortBtn();
    applyFilterSort();
    renderTable();
  }

  function updateSortBtn() {
    const btn = document.getElementById('btn-ss-sort');
    if (!btn) return;
    const labels = { default: 'Urutan', az: 'A→Z', za: 'Z→A' };
    btn.textContent = labels[sortMode] || 'Urutan';
    btn.classList.toggle('sort-active', sortMode !== 'default');
  }

  // ---- TABLE ----

  function renderTable() {
    const tbody = document.getElementById('ss-tbody');
    tbody.innerHTML = '';

    if (filteredItems.length === 0) {
      const tr = document.createElement('tr');
      const msg = searchQuery.trim()
        ? `Tidak ada barang "${searchQuery}".`
        : 'Belum ada barang. Tap "Tambah Barang".';
      tr.innerHTML = `<td colspan="7" style="text-align:center;padding:32px;color:var(--text3);font-size:14px;">${msg}</td>`;
      tbody.appendChild(tr);
      return;
    }

    filteredItems.forEach(item => tbody.appendChild(buildRow(item)));
  }

  function buildRow(item) {
    const tr = document.createElement('tr');
    const s = parseFloat(item.stock) || 0;
    const m = parseFloat(item.modal) || 0;
    const p = parseFloat(item.pct) || 0;
    const satuan = Calc.perSatuan(m, p);
    const jumlah = Calc.totalJumlah(s, m, p);

    tr.innerHTML = `
      <td class="col-name" title="${esc(item.name)}">${esc(item.name)}</td>
      <td class="col-stock">${s.toLocaleString('id-ID')}</td>
      <td class="col-modal">${Calc.toRupiah(m)}</td>
      <td class="col-pct">${Calc.fmtPct(p)}</td>
      <td class="col-satuan">${Calc.toRupiah(satuan)}</td>
      <td class="col-jumlah">${Calc.toRupiah(jumlah)}</td>
      <td class="col-act">
        <div style="display:flex;gap:2px;justify-content:center;">
          <button class="row-action-btn" data-action="edit" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="row-action-btn del" data-action="delete" title="Hapus">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener('click', () => showItemModal(item.id));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDeleteItem(item.id, item.name));
    return tr;
  }

  function renderTotals() {
    const sum = Calc.summarize(items);
    document.getElementById('tot-barang').textContent = items.length + ' jenis';
    document.getElementById('tot-stock').textContent = sum.totalStock.toLocaleString('id-ID');
    document.getElementById('tot-modal').textContent = Calc.toRupiah(sum.totalModal);
    document.getElementById('tot-jumlah').textContent = Calc.toRupiah(sum.totalJumlah);
    document.getElementById('tot-profit').textContent = Calc.toRupiah(sum.profit);
    FilesModule.updateFileStats(currentFile.id, items);
  }

  // ---- ITEM MODAL ----

  function showItemModal(editId = null) {
    editingItemId = editId;
    const modal = document.getElementById('modal-item');
    const titleEl = document.getElementById('modal-item-title');

    if (editId) {
      const item = items.find(x => x.id === editId);
      titleEl.textContent = 'Edit Barang';
      document.getElementById('input-item-name').value = item.name;
      document.getElementById('input-item-stock').value = item.stock;
      document.getElementById('input-item-modal').value = item.modal;
      document.getElementById('input-item-pct').value = item.pct;
    } else {
      titleEl.textContent = 'Tambah Barang';
      document.getElementById('input-item-name').value = '';
      document.getElementById('input-item-stock').value = '';
      document.getElementById('input-item-modal').value = '';
      document.getElementById('input-item-pct').value = currentFile.pct || 8;
    }

    updateItemPreview();
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('input-item-name').focus(), 300);
  }

  function hideItemModal() {
    document.getElementById('modal-item').classList.add('hidden');
    editingItemId = null;
  }

  function updateItemPreview() {
    const stock = parseFloat(document.getElementById('input-item-stock').value) || 0;
    const modal = parseFloat(document.getElementById('input-item-modal').value) || 0;
    const pct   = parseFloat(document.getElementById('input-item-pct').value) || 0;
    document.getElementById('prev-satuan').textContent = Calc.toRupiah(Calc.perSatuan(modal, pct));
    document.getElementById('prev-jumlah').textContent = Calc.toRupiah(Calc.totalJumlah(stock, modal, pct));
  }

  async function saveItemFromModal() {
    const name  = document.getElementById('input-item-name').value.trim();
    const stock = parseFloat(document.getElementById('input-item-stock').value);
    const modal = parseFloat(document.getElementById('input-item-modal').value);
    const pct   = parseFloat(document.getElementById('input-item-pct').value);

    if (!name) { App.toast('Nama barang tidak boleh kosong'); return; }
    if (isNaN(stock) || stock < 0) { App.toast('Stock tidak valid'); return; }
    if (isNaN(modal) || modal < 0) { App.toast('Modal tidak valid'); return; }

    const now = Date.now();
    if (editingItemId) {
      const item = items.find(x => x.id === editingItemId);
      item.name = name; item.stock = stock; item.modal = modal; item.pct = pct; item.updatedAt = now;
      await DB.Items.save(item);
      App.toast('Barang diperbarui');
    } else {
      const item = { id: uid(), fileId: currentFile.id, name, stock, modal, pct, createdAt: now, updatedAt: now };
      items.push(item);
      await DB.Items.save(item);
      App.toast('Barang ditambahkan');
    }

    hideItemModal();
    applyFilterSort();
    renderTable();
    renderTotals();
  }

  async function confirmDeleteItem(id, name) {
    App.confirm(`Hapus "${name}"?`, 'Barang akan dihapus dari file ini.', async () => {
      await DB.Items.delete(id);
      items = items.filter(x => x.id !== id);
      applyFilterSort();
      renderTable();
      renderTotals();
      App.toast('Barang dihapus');
    });
  }

  // ---- % MODAL ----

  function showPctModal() {
    const modal = document.getElementById('modal-pct');
    document.getElementById('input-pct-custom').value = currentFile.pct || 8;
    document.querySelectorAll('.pct-chip-opt').forEach(btn => {
      btn.classList.toggle('selected', parseFloat(btn.dataset.v) === parseFloat(currentFile.pct));
    });
    modal.classList.remove('hidden');
  }

  function hidePctModal() { document.getElementById('modal-pct').classList.add('hidden'); }

  async function savePct() {
    const val = parseFloat(document.getElementById('input-pct-custom').value);
    if (isNaN(val) || val < 0) { App.toast('Persentase tidak valid'); return; }
    currentFile.pct = val;
    currentFile.updatedAt = Date.now();
    await DB.Files.save(currentFile);
    document.getElementById('btn-file-pct').textContent = Calc.fmtPct(val);
    hidePctModal();
    App.toast('Persentase file diperbarui ke ' + Calc.fmtPct(val));
  }

  // ---- FILE NOTES ----

  function showFileNotesModal() {
    document.getElementById('file-notes-input').value = currentFile.notes || '';
    document.getElementById('modal-file-notes').classList.remove('hidden');
  }
  function hideFileNotesModal() { document.getElementById('modal-file-notes').classList.add('hidden'); }
  async function saveFileNotes() {
    currentFile.notes = document.getElementById('file-notes-input').value;
    currentFile.updatedAt = Date.now();
    await DB.Files.save(currentFile);
    hideFileNotesModal();
    App.toast('Catatan file disimpan');
  }

  // ---- INIT ----
  function init() {
    document.getElementById('btn-add-item').addEventListener('click', () => showItemModal());
    document.getElementById('btn-item-modal-cancel').addEventListener('click', hideItemModal);
    document.getElementById('btn-item-modal-save').addEventListener('click', saveItemFromModal);

    ['input-item-stock','input-item-modal','input-item-pct'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateItemPreview);
    });

    document.getElementById('btn-file-pct').addEventListener('click', showPctModal);
    document.getElementById('btn-pct-cancel').addEventListener('click', hidePctModal);
    document.getElementById('btn-pct-save').addEventListener('click', savePct);
    document.querySelectorAll('.pct-chip-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('input-pct-custom').value = btn.dataset.v;
        document.querySelectorAll('.pct-chip-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    document.getElementById('btn-ss-notes').addEventListener('click', showFileNotesModal);
    document.getElementById('btn-file-notes-cancel').addEventListener('click', hideFileNotesModal);
    document.getElementById('btn-file-notes-save').addEventListener('click', saveFileNotes);

    // Search
    document.getElementById('ss-search').addEventListener('input', e => {
      searchQuery = e.target.value;
      applyFilterSort();
      renderTable();
    });

    // Sort
    document.getElementById('btn-ss-sort').addEventListener('click', cycleSortMode);
  }

  function esc(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  return { init, open };
})();
