import { getState, setState, subscribe } from '../state/store.js';

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

