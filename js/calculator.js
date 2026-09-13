/**
 * calculator.js — Kalkulator (fixed, like real calculator)
 * WendStudio · Profit Kalkulator App
 *
 * Logic: chain calculation like physical calculator
 * 15 × 15 × 15 = works correctly, no history panel
 */

const CalculatorModule = (() => {

  // State
  let displayVal = '0';   // current display number (string)
  let storedVal = null;   // number stored before operator
  let currentOp = null;   // pending operator
  let justEvaled = false; // did we just press = ?
  let freshInput = true;  // next digit starts a new number

  const OPS = {
    '+':  (a,b) => a + b,
    '−':  (a,b) => a - b,
    '×':  (a,b) => a * b,
    '÷':  (a,b) => b !== 0 ? a / b : null,
  };

  // ---- Display ----
  function setDisplay(val) {
    displayVal = String(val);
    const num = parseFloat(displayVal);
    const el = document.getElementById('calc-result');
    if (isNaN(num)) { el.textContent = displayVal; return; }
    // Format: up to 10 significant digits, id-ID separators
    const formatted = parseFloat(num.toPrecision(10));
    el.textContent = formatted.toLocaleString('id-ID', { maximumFractionDigits: 8 });
  }

  function setExpr(str) {
    document.getElementById('calc-expr').textContent = str || '';
  }

  // ---- Compute stored op ----
  function compute() {
    if (currentOp === null || storedVal === null) return parseFloat(displayVal);
    const a = storedVal;
    const b = parseFloat(displayVal);
    const fn = OPS[currentOp];
    const res = fn ? fn(a, b) : b;
    return res === null ? null : parseFloat(res.toPrecision(12));
  }

  // ---- Handlers ----
  function handleNum(ch) {
    if (justEvaled) {
      // Start fresh after =
      displayVal = '0';
      storedVal = null;
      currentOp = null;
      setExpr('');
      justEvaled = false;
      freshInput = true;
    }

    if (freshInput) {
      displayVal = ch === '.' ? '0.' : ch;
      freshInput = false;
    } else {
      if (ch === '.' && displayVal.includes('.')) return;
      if (displayVal === '0' && ch !== '.') displayVal = ch;
      else displayVal += ch;
    }
    setDisplay(displayVal);
  }

  function handleOp(op) {
    justEvaled = false;

    // If there's a pending op and we have fresh input already typed, chain it
    if (!freshInput && currentOp !== null && storedVal !== null) {
      const res = compute();
      if (res === null) { App.toast('Tidak bisa bagi nol'); return; }
      storedVal = res;
      setDisplay(res);
    } else {
      storedVal = parseFloat(displayVal);
    }

    currentOp = op;
    freshInput = true;

    // Show expr like: 15 ×
    const dispNum = parseFloat(storedVal.toPrecision(10))
      .toLocaleString('id-ID', { maximumFractionDigits: 8 });
    setExpr(dispNum + ' ' + op);
  }

  function handleEquals() {
    if (currentOp === null || storedVal === null) return;
    const res = compute();
    if (res === null) { App.toast('Tidak bisa bagi nol'); return; }

    const aFmt = parseFloat(storedVal.toPrecision(10))
      .toLocaleString('id-ID', { maximumFractionDigits: 8 });
    const bFmt = parseFloat(parseFloat(displayVal).toPrecision(10))
      .toLocaleString('id-ID', { maximumFractionDigits: 8 });
    setExpr(aFmt + ' ' + currentOp + ' ' + bFmt + ' =');

    setDisplay(res);
    storedVal = null;
    currentOp = null;
    freshInput = true;
    justEvaled = true;
  }

  function handleClear() {
    displayVal = '0';
    storedVal = null;
    currentOp = null;
    freshInput = true;
    justEvaled = false;
    setDisplay('0');
    setExpr('');
  }

  function handleBackspace() {
    if (freshInput || justEvaled) return;
    displayVal = displayVal.slice(0, -1) || '0';
    setDisplay(displayVal);
  }

  function handlePct() {
    const num = parseFloat(displayVal);
    if (isNaN(num)) return;
    let result;
    if (storedVal !== null && (currentOp === '+' || currentOp === '−')) {
      // e.g. 200 + 8% → 200 + 16
      result = storedVal * num / 100;
    } else {
      result = num / 100;
    }
    const r = parseFloat(result.toPrecision(12));
    displayVal = String(r);
    setDisplay(r);
    freshInput = true;
  }

  // ---- Init ----
  function init() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { num, op, action } = btn.dataset;
        if (num !== undefined) handleNum(num);
        else if (op)           handleOp(op);
        else if (action === 'clear')     handleClear();
        else if (action === 'backspace') handleBackspace();
        else if (action === 'equals')    handleEquals();
        else if (action === 'pct')       handlePct();
      });
    });
  }

  return { init };
})();
