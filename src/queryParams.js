import { getState, setState, subscribe } from './state/store.js';

export function initUrlSync() {
  const qs = new URLSearchParams(window.location.search);
  const patch = {};

  // Grid system
  const g = qs.get('type');
  if (g) patch.activeGridSystem = g;

  // Basemap
  const b = qs.get('basemap');
  if (b) patch.activeBaseLayer = b;

  // Center
  const c = qs.get('center')?.split(',').map(Number);
  if (c?.length === 2 && c.every(Number.isFinite)) patch.mapCenter = c;

  // Zoom
  const z = Number(qs.get('zoom'));
  if (Number.isFinite(z) && z > 0) patch.mapZoom = z;

  // Tile list
  const t = qs.get('tiles');
  if (t) patch.selectedCells = t.split(',').filter(Boolean);

	// Precision
	const p = qs.get('precision');
  if (p !== null) {
    const pv = Number(p);
    if (Number.isFinite(pv) && pv >= 0) {
      patch.precision       = pv;
      patch.precisionLocked = true;
    }
  } else {
    patch.precisionLocked = false;
  }

  if (Object.keys(patch).length) setState(patch);

  subscribe(updateUrlFromState);
}

function updateUrlFromState(state = getState()) {
  const qp = new URLSearchParams();

  qp.set('type', state.activeGridSystem);
	qp.set('basemap', state.activeBaseLayer);
  if (state.mapCenter) qp.set('center', state.mapCenter.map(num=>num.toFixed(1)).join(','));
  if (state.mapZoom) qp.set('zoom', String(state.mapZoom.toFixed(1)));
  if (state.selectedCells?.length) qp.set('tiles', state.selectedCells.join(','));
	if (state.precisionLocked) qp.set('precision', String(state.precision));

  const newQuery = `?${qp.toString()}`;
  if (newQuery !== window.location.search) {
    history.replaceState(null, '', `${location.pathname}${newQuery}`);
  }
}

