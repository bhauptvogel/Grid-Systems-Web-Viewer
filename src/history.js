import { getState, setState } from './state/store.js';

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 100;

// public helpers ------------------------------------------------------------
export function push(snapshot) {
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;             // a new action forgets future redos
  notify();
}

export function undo() {
  if (!undoStack.length) return;
  const current = getState().selectedCells;
  const prev    = undoStack.pop();
  redoStack.push([...current]);
	apply(prev);
	notify();
}

export function redo() {
  if (!redoStack.length) return;
  const current = getState().selectedCells;
  const next    = redoStack.pop();
  undoStack.push([...current]);
  apply(next);
	notify();
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

// private helpers -----------------------------------------------------------
const apply = cells => setState({ selectedCells: cells });
const notify = () => document.dispatchEvent(new Event('history:change'));

