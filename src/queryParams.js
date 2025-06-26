import { getState, setState, subscribe } from './state/store.js';

// Config
const VALID_GRIDS = new Set(['slippy', 'h3', 'quadtree', 'geohash']);

export function initUrlSync() {
  const qs = new URLSearchParams(window.location.search);
  const patch = {};

  // Grid system
  const g = qs.get('type');
  if (VALID_GRIDS.has(g)) patch.activeGridSystem = g;

  // Center
  const c = qs.get('center')?.split(',').map(Number);
  if (c?.length === 2 && c.every(Number.isFinite)) patch.mapCenter = c;

  // Zoom
  const z = Number(qs.get('zoom'));
  if (Number.isFinite(z) && z > 0) patch.mapZoom = z;

  // Tile list
  const t = qs.get('tiles');
  if (t) patch.selectedCells = t.split(',').filter(Boolean);

  if (Object.keys(patch).length) setState(patch);

  subscribe(debounce(updateUrlFromState, 150));
}

function updateUrlFromState(state = getState()) {
  const qp = new URLSearchParams();

  qp.set('type', state.activeGridSystem);
  if (state.mapCenter) qp.set('center', state.mapCenter.map(num=>num.toFixed(1)).join(','));
  if (state.mapZoom) qp.set('zoom', String(state.mapZoom.toFixed(1)));
  if (state.selectedCells?.length) qp.set('tiles', state.selectedCells.join(','));

  const newQuery = `?${qp.toString()}`;
  if (newQuery !== window.location.search) {
    history.replaceState(null, '', `${location.pathname}${newQuery}`);
  }
}

function debounce(fn, ms = 100) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}
