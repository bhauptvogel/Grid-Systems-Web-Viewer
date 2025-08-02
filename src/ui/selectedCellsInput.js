import { getState, setState, subscribe } from '../state/store.js';
import { undo, redo, canUndo, canRedo, push } from '../history.js';

const input = document.getElementById('cellInput');   // <textarea id="cellInput">

/* ---------- helpers ---------- */
const listToString = arr => arr.join(',');

/**
 * Convert raw text → unique, case-insensitive array, after
 * translating "." and ";" to ",".
 */
const stringToList = str => {
  const cleaned = str.replace(/[.;]/g, ',');
  const seen = new Set();
  cleaned.split(/[,\s]+/).forEach(tok => {
    if (!tok) return;
    const key = tok.toLowerCase();
    if (!seen.has(key)) seen.add(tok);   // keep first-seen spelling
  });
  return Array.from(seen);
};

/* ---------- textarea auto-grow / scroll ---------- */
const MAX_PX = parseFloat(getComputedStyle(input).maxHeight) || 128;  // fallback 128px

function autoResize() {
  input.style.height = 'auto';                       // shrink first
  const h = Math.min(input.scrollHeight, MAX_PX);
  input.style.height = h + 'px';
  input.style.overflowY = input.scrollHeight > MAX_PX ? 'auto' : 'hidden';
}

/* ---------- initial fill ---------- */
input.value = listToString(getState().selectedCells || []);
autoResize();

let selfEcho = false;

/* ---------- push changes → store ---------- */
input.addEventListener('input', () => {
  // live normalise "." and ";" to ","
  const pos = input.selectionStart;
  input.value = input.value.replace(/[.;]/g, ',');
  input.setSelectionRange(pos, pos);

  autoResize();

  selfEcho = true;
  setState({ selectedCells: stringToList(input.value) });
});

/* ---------- pull changes ← store ---------- */
subscribe(state => {
  if (selfEcho) {            // ignore echo of our own keystroke
    selfEcho = false;
    return;
  }
  const str = listToString(state.selectedCells || []);
  if (input.value !== str) {
    input.value = str;
    autoResize();
  }
});

/* ====================================================
 * Undo / Redo
 * ==================================================== */
const undoBtn = document.getElementById('btnUndo');
const redoBtn = document.getElementById('btnRedo');

// click → action
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

// enable / disable depending on stack depth
function refreshHistoryButtons() {
  undoBtn.disabled = !canUndo();
  redoBtn.disabled = !canRedo();
}

refreshHistoryButtons();
document.addEventListener('history:change', refreshHistoryButtons);

/* ====================================================
 * Reset Selection 
 * ==================================================== */
const btnReset = document.getElementById('btnClear');

if (btnReset) {
  const fixedWidth = btnReset.offsetWidth + 'px';
  const originalLabel = btnReset.textContent;

  btnReset.addEventListener('click', () => {
    // Clear selected cells from state
		const { selectedCells } = getState();
		push([...selectedCells]);
    setState({ selectedCells: [] });

    // Give feedback
    btnReset.style.width = fixedWidth;  // lock width
    btnReset.style.color = 'red';
    btnReset.textContent = 'Reset!';

    // Reset to original after timeout
    setTimeout(() => {
      btnReset.style.color = '';
      btnReset.textContent = originalLabel;
      btnReset.style.width = '';        // unlock width
    }, 2000);
  });
}

/* ====================================================
 *  Copy-to-Clipboard button
 * ==================================================== */
const btnCopy = document.getElementById('btnCopy');

if (btnCopy) {
  // Capture initial width so the button won’t “jump” when the label changes.
  const fixedWidth = btnCopy.offsetWidth + 'px';
  const originalLabel = btnCopy.textContent;

  btnCopy.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;                   // nothing to copy

    const showCopied = () => {
      btnCopy.style.width = fixedWidth;  // lock width
      btnCopy.style.color = 'green';
      btnCopy.textContent = 'Copied!';
      // Optional: reset after 2 s to allow repeated use
      setTimeout(() => {
        btnCopy.style.color = '';
        btnCopy.textContent = originalLabel;
        btnCopy.style.width = '';        // unlock width again
      }, 2000);
    };

    // Modern API first …
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(showCopied).catch(() => {
        // fall back if writeText rejected (e.g. permission)
        legacyCopy();
      });
    } else {
      legacyCopy();
    }

    function legacyCopy() {
      // Fallback for non-secure context / older browsers
      const sel = document.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand('copy'); } catch (_) { /* ignore */ }
      sel.removeAllRanges();
      showCopied();
    }
  });
}
