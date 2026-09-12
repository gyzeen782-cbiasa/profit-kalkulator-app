/**
 * calculator.js — Kalkulator Standalone
 * WendStudio · Profit Kalkulator App
 */

const CalculatorModule = (() => {

  let expr = '';
  let result = '0';
  let lastOp = false;
  let history = [];

  function display(res, ex) {
    document.getElementById('calc-result').textContent = fmtNum(res);
    document.getElementById('calc-expr').textContent = ex || '';
  }

  function fmtNum(n) {
    if (n === '' || n === null || n === undefined) return '0';
    const s = String(n);
    // Format with thousand separator if it's a plain number
    const num = parseFloat(s);
    if (isNaN(num)) return s;
    // Show up to 10 sig digits, remove trailing zeros
    const formatted = parseFloat(num.toPrecision(12));
    return formatted.toLocaleString('id-ID', { maximumFractionDigits: 6 });
  }

  function safeEval(exprStr) {
    // Replace display ops with JS ops
    const clean = exprStr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');
    try {
      // Only allow safe chars
      if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(clean)) return null;
      const res = Function('"use strict"; return (' + clean + ')')();
      return isFinite(res) ? res : null;
    } catch { return null; }
  }

  function handleNum(num) {
    if (lastOp) { result = num === '.' ? '0.' : num; lastOp = false; }
    else {
      if (num === '.' && result.includes('.')) return;
      result = result === '0' && num !== '.' ? num : result + num;
    }
    display(result, expr + result);
  }

  function handleOp(op) {
    // If previous was op, replace it
    const trimmed = expr.trimEnd();
    const ops = ['+','−','×','÷'];
    if (ops.some(o => trimmed.endsWith(o))) {
      expr = trimmed.slice(0, -1) + op + ' ';
    } else {
      expr = (expr || '') + result + ' ' + op + ' ';
    }
    lastOp = true;
    display(result, expr);
  }

  function handleEquals() {
    const fullExpr = expr + result;
    const res = safeEval(fullExpr);
    if (res === null) { App.toast('Ekspresi tidak valid'); return; }
    const rounded = parseFloat(res.toPrecision(12));
    // Add to history
    history.unshift({ expr: fullExpr, res: rounded });
    if (history.length > 20) history.pop();
    renderHistory();

    expr = '';
    result = String(rounded);
    lastOp = false;
    display(result, fullExpr + ' =');
  }

  function handleClear() {
    expr = ''; result = '0'; lastOp = false;
    display('0', '');
  }

  function handleBackspace() {
    if (lastOp) { return; }
    result = result.slice(0, -1) || '0';
    display(result, expr + result);
  }

  function handlePct() {
    const num = parseFloat(result);
    if (isNaN(num)) return;
    // If there's a base in expr, compute percentage of base
    const baseMatch = (expr || '').match(/[\d.]+\s*[\+\−]\s*$/);
    if (baseMatch) {
      const base = parseFloat((expr || '').match(/([\d.]+)\s*[\+\−]\s*$/)[1]);
      result = String(parseFloat((num / 100 * base).toPrecision(12)));
    } else {
      result = String(parseFloat((num / 100).toPrecision(12)));
    }
    display(result, expr + result);
  }

  function renderHistory() {
    const el = document.getElementById('calc-history');
    el.innerHTML = '';
    if (history.length === 0) {
      el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0;">Belum ada riwayat.</div>';
      return;
    }
    history.slice(0, 10).forEach(h => {
      const div = document.createElement('div');
      div.className = 'calc-history-item';
      div.innerHTML = `
        <span class="calc-history-expr">${esc(h.expr)}</span>
        <span class="calc-history-res">${fmtNum(h.res)}</span>
      `;
      div.addEventListener('click', () => {
        result = String(h.res); expr = ''; lastOp = false;
        display(result, '');
      });
      el.appendChild(div);
    });
  }

  function init() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { num, op, action } = btn.dataset;
        if (num !== undefined) handleNum(num);
        else if (op) handleOp(op);
        else if (action === 'clear') handleClear();
        else if (action === 'backspace') handleBackspace();
        else if (action === 'equals') handleEquals();
        else if (action === 'pct') handlePct();
      });
    });
    renderHistory();
  }

  function esc(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  return { init };
})();
