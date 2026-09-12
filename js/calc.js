/**
 * calc.js — Calculation Engine
 * WendStudio · Profit Kalkulator App
 */

const Calc = (() => {

  /**
   * Harga per satuan setelah persentase keuntungan
   * @param {number} modal  - Harga beli per satuan
   * @param {number} pct    - Persentase (misal: 8 untuk 8%)
   * @returns {number}
   */
  function perSatuan(modal, pct) {
    return modal * (1 + pct / 100);
  }

  /**
   * Total jumlah = stock × per satuan
   */
  function totalJumlah(stock, modal, pct) {
    return stock * perSatuan(modal, pct);
  }

  /**
   * Total modal murni = stock × modal
   */
  function totalModal(stock, modal) {
    return stock * modal;
  }

  /**
   * Estimasi keuntungan
   */
  function profit(stock, modal, pct) {
    return totalJumlah(stock, modal, pct) - totalModal(stock, modal);
  }

  /**
   * Format angka ke Rupiah
   */
  function toRupiah(num) {
    if (isNaN(num) || num === null || num === undefined) return 'Rp0';
    return 'Rp' + Math.round(num).toLocaleString('id-ID');
  }

  /**
   * Format persentase
   */
  function fmtPct(pct) {
    const p = parseFloat(pct);
    if (isNaN(p)) return '0%';
    return (p % 1 === 0 ? p : p.toFixed(1)) + '%';
  }

  /**
   * Hitung ringkasan dari array items
   */
  function summarize(items) {
    let totalStock = 0;
    let totalModalVal = 0;
    let totalJumlahVal = 0;

    for (const item of items) {
      const s = parseFloat(item.stock) || 0;
      const m = parseFloat(item.modal) || 0;
      const p = parseFloat(item.pct) || 0;

      totalStock += s;
      totalModalVal += totalModal(s, m);
      totalJumlahVal += totalJumlah(s, m, p);
    }

    return {
      totalStock,
      totalModal: totalModalVal,
      totalJumlah: totalJumlahVal,
      profit: totalJumlahVal - totalModalVal,
    };
  }

  return { perSatuan, totalJumlah, totalModal, profit, toRupiah, fmtPct, summarize };
})();
