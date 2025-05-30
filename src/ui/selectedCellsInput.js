import { getState, setState, subscribe } from '../state/store.js';

const input = document.getElementById('cellInput');

/* ---------- helpers ---------- */
const listToString = arr => arr.join(',');

/**
 * Convert raw text -> unique, case-insensitive array of IDs.
 * Before splitting, replace dots and semicolons with colons.
 */
const stringToList = str => {
  const cleaned = str.replace(/[.;]/g, ',');
  const seen = new Set();
  cleaned.split(/[,\s]+/).forEach(tok => {
    if (!tok) return;
    const key = tok.toLowerCase();
    if (!seen.has(key)) seen.add(tok);
  });
  return Array.from(seen);
};

/* ---------- initial fill ---------- */
input.value = listToString(getState().selectedCells || []);

let selfEcho = false;

/* ---------- push changes -> store ---------- */
input.addEventListener('input', () => {
  const raw = input.value;
  const normalisedVisible = raw.replace(/[.;]/g, ',');
  if (normalisedVisible !== raw) {
    const pos = input.selectionStart;
    input.value = normalisedVisible;
    input.setSelectionRange(pos, pos);
  }

  selfEcho = true;
  setState({ selectedCells: stringToList(normalisedVisible) });
});

/* ---------- pull changes <- store ---------- */
subscribe(state => {
  if (selfEcho) {
    selfEcho = false;
    return;
  }
  const str = listToString(state.selectedCells || []);
  if (input.value !== str) input.value = str;
});
