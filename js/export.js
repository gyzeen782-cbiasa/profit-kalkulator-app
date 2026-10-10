/**
 * export.js — Export CSV, Backup & Restore
 * WendStudio · Profit Kalkulator App
 */

const ExportModule = (() => {

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function csvEscape(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  async function exportCSV() {
    const files = await DB.Files.getAll();
    const allItems = await DB.Items.getAll();

    const fileMap = {};
    files.forEach(f => { fileMap[f.id] = f.name; });

    let csv = 'File,Nama Barang,Stock,Modal,Persentase,Per Satuan,Total Jumlah\r\n';
    allItems.forEach(item => {
      const s = parseFloat(item.stock) || 0;
      const m = parseFloat(item.modal) || 0;
      const p = parseFloat(item.pct) || 0;
      const satuan = Calc.perSatuan(m, p);
      const jumlah = Calc.totalJumlah(s, m, p);
      csv += [
        fileMap[item.fileId] || '',
        item.name, s, m, p,
        Math.round(satuan), Math.round(jumlah)
      ].map(csvEscape).join(',') + '\r\n';
    });

    const date = new Date().toISOString().slice(0,10);
    downloadBlob('\uFEFF' + csv, `profit-kalkulator-${date}.csv`, 'text/csv;charset=utf-8');
    App.toast('CSV berhasil diexport');
  }

  function fmtStamp(ts) {
    return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function showLastBackup() {
    const ts = await DB.Settings.get('last_backup');
    const el = document.getElementById('settings-last-backup');
    if (el) el.textContent = ts ? 'Backup terakhir: ' + fmtStamp(ts) : 'Backup terakhir: belum pernah';
  }

  async function backup() {
    const data = await DB.fullDump();
    const json = JSON.stringify(data, null, 2);
    const filename = `backup-profit-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: 'application/json' });
    let shared = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Backup Profit Kalkulator' });
        shared = true;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    if (!shared) downloadBlob(json, filename, 'application/json');
    await DB.Settings.set('last_backup', Date.now());
    showLastBackup();
    App.toast(shared ? 'Backup dibagikan' : 'Backup berhasil disimpan');
  }

  function readText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('File tidak bisa dibaca.'));
      reader.readAsText(file);
    });
  }

  async function restore(file) {
    let data, sum;
    try {
      data = JSON.parse(await readText(file));
      sum = DB.validateDump(data);
    } catch (err) {
      const msg = err instanceof SyntaxError ? 'File bukan backup yang benar.' : err.message;
      App.toast('Restore dibatalkan: ' + msg + ' Data kamu tidak berubah.', 4500);
      return;
    }
    const lines = [
      `${sum.files} file, ${sum.items} barang, ${sum.notes} catatan` + (sum.hasHistory ? `, ${sum.belanja} transaksi belanja.` : '.'),
      sum.exportedAt ? `Dibuat: ${fmtStamp(sum.exportedAt)}.` : 'Backup lama tanpa tanggal.',
      'Data saat ini akan diganti.'
    ];
    App.confirm('Pulihkan data ini?', lines.join(' '), async () => {
      try {
        await DB.restoreFromDump(data);
        App.toast('Restore berhasil! Memuat ulang...');
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        App.toast('Restore gagal. Data lama tetap aman.', 4500);
      }
    });
  }

  function init() {
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-backup').addEventListener('click', backup);

    showLastBackup();
    const restoreInput = document.getElementById('restore-input');
    document.getElementById('btn-restore').addEventListener('click', () => {
      restoreInput.click();
    });
    restoreInput.addEventListener('change', e => {
      if (e.target.files[0]) restore(e.target.files[0]);
      e.target.value = '';
    });
  }

  return { init };
})();
