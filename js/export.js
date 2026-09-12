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

  async function backup() {
    const data = await DB.fullDump();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0,10);
    downloadBlob(json, `backup-profit-${date}.json`, 'application/json');
    App.toast('Backup berhasil disimpan');
  }

  async function restore(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.files || !data.items) throw new Error('Format tidak valid');
          await DB.restoreFromDump(data);
          App.toast('Restore berhasil! Memuat ulang...');
          setTimeout(() => location.reload(), 1200);
          resolve();
        } catch (err) {
          App.toast('Gagal restore: file tidak valid');
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  function init() {
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-backup').addEventListener('click', backup);

    const restoreInput = document.getElementById('restore-input');
    document.getElementById('btn-restore').addEventListener('click', () => {
      App.confirm('Restore Data?', 'Data saat ini akan digantikan oleh data dari file backup.', () => {
        restoreInput.click();
      });
    });
    restoreInput.addEventListener('change', e => {
      if (e.target.files[0]) restore(e.target.files[0]);
      e.target.value = '';
    });
  }

  return { init };
})();
