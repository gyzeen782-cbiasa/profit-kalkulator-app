/**
 * files.js — File Manager
 * WendStudio · Profit Kalkulator App
 * v2: no recent section, edit inline on File tab, home redesigned
 */

const FilesModule = (() => {

  const CATEGORIES = [
    { id: 'rokok',       icon: '🚬', label: 'Rokok' },
    { id: 'snack',       icon: '🍿', label: 'Snack' },
    { id: 'minuman',     icon: '🥤', label: 'Minuman' },
    { id: 'sembako',     icon: '🛒', label: 'Sembako' },
    { id: 'alat',        icon: '🧹', label: 'Alat RT' },
    { id: 'omset',       icon: '📊', label: 'Omset' },
    { id: 'pengeluaran', icon: '💸', label: 'Pengeluaran' },
    { id: 'supplier',    icon: '🏪', label: 'Supplier' },
    { id: 'lainnya',     icon: '📁', label: 'Lainnya' },
  ];

  let allFiles = [];
  let sortMode = 'terbaru';
  let editingFileId = null;
  let selectedCat = 'lainnya';

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function getCatIcon(id) { return (CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]).icon; }

  async function loadFiles() {
    allFiles = await DB.Files.getAll();
    renderFiles();
    renderHome();
  }

  function sortedFiles(files) {
    return [...files].sort((a, b) => {
      if (sortMode === 'nama')    return a.name.localeCompare(b.name, 'id');
      if (sortMode === 'terlama') return a.createdAt - b.createdAt;
      return b.updatedAt - a.updatedAt;
    });
  }

  // ---- HOME ----
  async function renderHome() {
    const items = await DB.Items.getAll();
    const sum = Calc.summarize(items);

    document.getElementById('home-total-value').textContent = Calc.toRupiah(sum.totalJumlah);
    document.getElementById('home-total-files').textContent =
      `${allFiles.length} file · ${items.length} jenis barang`;

    // Stats chips
    document.getElementById('home-stat-profit').textContent = Calc.toRupiah(sum.profit);
    document.getElementById('home-stat-modal').textContent = Calc.toRupiah(sum.totalModal);
    document.getElementById('home-stat-stock').textContent = sum.totalStock.toLocaleString('id-ID');

    // All files preview (no recent section)
    const preview = document.getElementById('home-files-preview');
    preview.innerHTML = '';
    const sorted = sortedFiles(allFiles);
    if (sorted.length === 0) {
      preview.innerHTML = `
        <div class="empty-state" style="padding:32px 0 8px;">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Belum Ada File</div>
          <div class="empty-desc">Buat file pertama untuk mulai mencatat stok.</div>
        </div>`;
    } else {
      sorted.forEach(f => preview.appendChild(buildFileCard(f, false)));
    }
  }

  // ---- FILES TAB ----
  function renderFiles(filter = '') {
    const list  = document.getElementById('files-list');
    const empty = document.getElementById('files-empty');
    const q = filter || document.getElementById('files-search')?.value || '';

    let files = sortedFiles(allFiles);
    if (q.trim()) files = files.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));

    list.innerHTML = '';
    if (files.length === 0) {
      empty.classList.remove('hidden');
      list.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    files.forEach(f => list.appendChild(buildFileCard(f, true)));
  }

  // ---- CARD ----
  function buildFileCard(f, showActions) {
    const div = document.createElement('div');
    div.className = 'file-card';
    div.dataset.id = f.id;

    const totalVal  = f.totalJumlah || 0;
    const itemCount = f.itemCount || 0;

    div.innerHTML = `
      <div class="file-card-icon">${getCatIcon(f.category)}</div>
      <div class="file-card-body">
        <div class="file-card-name">${esc(f.name)}</div>
        <div class="file-card-meta">${itemCount} jenis · ${fmtDate(f.updatedAt)}</div>
      </div>
      <div>
        <div class="file-card-value">${Calc.toRupiah(totalVal)}</div>
        <div class="file-card-value-sub">${Calc.fmtPct(f.pct)} margin</div>
      </div>
      ${showActions ? `
      <div class="file-card-actions">
        <button class="file-action-btn" data-action="open">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Buka
        </button>
        <button class="file-action-btn" data-action="edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Rename
        </button>
        <button class="file-action-btn red" data-action="delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          Hapus
        </button>
      </div>` : ''}
    `;

    div.querySelector('.file-card-body').addEventListener('click', () => openFile(f.id));
    div.querySelector('.file-card-icon').addEventListener('click', () => openFile(f.id));

    if (showActions) {
      div.querySelector('[data-action="open"]').addEventListener('click', e => { e.stopPropagation(); openFile(f.id); });
      div.querySelector('[data-action="edit"]').addEventListener('click', e => { e.stopPropagation(); showFileModal(f.id); });
      div.querySelector('[data-action="delete"]').addEventListener('click', e => { e.stopPropagation(); confirmDeleteFile(f.id, f.name); });
    }

    return div;
  }

  function openFile(id) {
    const f = allFiles.find(x => x.id === id);
    if (!f) return;
    f.updatedAt = Date.now();
    DB.Files.save(f);
    SpreadsheetModule.open(f);
  }

  // ---- MODAL FILE ----
  function buildCategoryGrid(currentCat) {
    const grid = document.getElementById('category-grid');
    grid.innerHTML = '';
    CATEGORIES.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (c.id === currentCat ? ' selected' : '');
      btn.innerHTML = `<span class="cat-icon">${c.icon}</span><span>${c.label}</span>`;
      btn.dataset.cat = c.id;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCat = c.id;
      });
      grid.appendChild(btn);
    });
    selectedCat = currentCat;
  }

  function showFileModal(editId = null) {
    editingFileId = editId;
    const titleEl  = document.getElementById('modal-file-title');
    const nameInput = document.getElementById('input-file-name');
    const pctInput  = document.getElementById('input-file-pct');

    if (editId) {
      const f = allFiles.find(x => x.id === editId);
      titleEl.textContent = 'Edit File';
      nameInput.value = f.name;
      pctInput.value  = f.pct || 8;
      buildCategoryGrid(f.category || 'lainnya');
    } else {
      titleEl.textContent = 'File Baru';
      nameInput.value = '';
      pctInput.value  = App.getDefaultPct();
      buildCategoryGrid('lainnya');
    }

    document.getElementById('modal-file').classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 300);
  }

  function hideFileModal() {
    document.getElementById('modal-file').classList.add('hidden');
    editingFileId = null;
  }

  async function saveFileFromModal() {
    const name = document.getElementById('input-file-name').value.trim();
    if (!name) { App.toast('Nama file tidak boleh kosong'); return; }
    const pct = parseFloat(document.getElementById('input-file-pct').value) || 8;
    const now = Date.now();

    if (editingFileId) {
      const f = allFiles.find(x => x.id === editingFileId);
      f.name = name; f.category = selectedCat; f.pct = pct; f.updatedAt = now;
      await DB.Files.save(f);
      App.toast('File diperbarui');
    } else {
      const f = { id: uid(), name, category: selectedCat, pct, createdAt: now, updatedAt: now, itemCount: 0, totalJumlah: 0 };
      await DB.Files.save(f);
      allFiles.push(f);
      App.toast('File baru dibuat');
    }

    hideFileModal();
    await loadFiles();
  }

  async function confirmDeleteFile(id, name) {
    App.confirm(`Hapus file "${name}"?`, 'Semua barang di dalam file ini juga akan dihapus.', async () => {
      await DB.Items.deleteByFile(id);
      await DB.Files.delete(id);
      allFiles = allFiles.filter(f => f.id !== id);
      App.toast('File dihapus');
      await loadFiles();
    });
  }

  async function updateFileStats(fileId, items) {
    const f = allFiles.find(x => x.id === fileId);
    if (!f) return;
    const sum = Calc.summarize(items);
    f.itemCount   = items.length;
    f.totalJumlah = sum.totalJumlah;
    f.updatedAt   = Date.now();
    await DB.Files.save(f);
    renderHome();
  }

  function cycleSortMode() {
    const modes  = ['terbaru', 'terlama', 'nama'];
    sortMode = modes[(modes.indexOf(sortMode) + 1) % modes.length];
    const labels = { terbaru: 'Terbaru', terlama: 'Terlama', nama: 'Nama A-Z' };
    App.toast('Urutan: ' + labels[sortMode]);
    renderFiles();
  }

  function init() {
    document.getElementById('btn-home-new-file').addEventListener('click', () => showFileModal());
    document.getElementById('btn-files-new-file').addEventListener('click', () => showFileModal());
    document.getElementById('btn-see-all-files').addEventListener('click', () => App.navigate('files'));

    document.getElementById('btn-file-modal-cancel').addEventListener('click', hideFileModal);
    document.getElementById('btn-file-modal-save').addEventListener('click', saveFileFromModal);

    document.getElementById('files-search').addEventListener('input', e => renderFiles(e.target.value));
    document.getElementById('btn-sort-files').addEventListener('click', cycleSortMode);

    loadFiles();
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return { init, loadFiles, showFileModal, updateFileStats, allFiles: () => allFiles };
})();
