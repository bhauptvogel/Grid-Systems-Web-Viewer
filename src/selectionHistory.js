import { getState, setState, subscribe } from './state/store.js';

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 100;

let lastCells = [...getState().selectedCells];  // initial reference
let blockHistory = false;                       // prevents loops

// ── helper ────────────────────────────────────────────────────────────────
const arraysEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const notify = () => document.dispatchEvent(new Event('history:change'));
const apply  = cells => setState({ selectedCells: cells });

// ── global store subscription ─────────────────────────────────────────────
subscribe(state => {
  if (blockHistory) {
    lastCells = [...state.selectedCells];
    return;
  }

  if (!arraysEqual(state.selectedCells, lastCells)) {
    // record *previous* state
    undoStack.push([...lastCells]);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    lastCells = [...state.selectedCells];
    notify();
  }
});

// ── public API ────────────────────────────────────────────────────────────
export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

export function undo() {
  if (!undoStack.length) return;
  const current = getState().selectedCells;
  const prev    = undoStack.pop();
  redoStack.push([...current]);

  blockHistory = true;
  apply(prev);
  blockHistory = false;

  notify();
}

export function redo() {
  if (!redoStack.length) return;
  const current = getState().selectedCells;
  const next    = redoStack.pop();
  undoStack.push([...current]);

  blockHistory = true;
  apply(next);
  blockHistory = false;

  notify();
}

