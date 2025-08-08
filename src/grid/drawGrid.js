import { toLonLat } from 'ol/proj.js';
import Polygon      from 'ol/geom/Polygon.js';
import Feature      from 'ol/Feature.js';
import { Stroke, Style } from 'ol/style.js';

import { getState, setState, subscribe } from '../state/store.js';
import { showToast }      from '../ui/toast.js';
import { getGridSystem }  from './index.js';

/* styles ------------------------------------------------------- */
const tileStyle = new Style({ stroke: new Stroke({ color: 'red', width: 2 }) });

/* helpers ------------------------------------------------------------- */
const EPS = 1e-9;
const GROW = 0.3;
const MAX_FEATURES = 20_000;

function splitByAntimeridian (minLon, maxLon) {
  const width = maxLon - minLon;
  if (Math.abs(width) < EPS)        return [[-180+EPS, 0], [0, 180-EPS]];
  if (width > 0)                    return [[minLon, maxLon]];
  return [[minLon, 180-EPS], [-180+EPS, maxLon]];
}

function ring ([lon1, lat1, lon2, lat2]) {
  return [[lon1,lat1],[lon2,lat1],[lon2,lat2],[lon1,lat2],[lon1,lat1]];
}

const grow = (min,max,lim) => {
  const delta = (max-min)*GROW*0.5;
  return [Math.max(min-delta,-lim),Math.min(max+delta, lim)];
};
const growLat = (a,b)   => grow(a,b,85.051129 - EPS);
const growLon = ([a,b]) => [grow(a,b,180-EPS)];

/* public ---------------------------------------------------------------- */
function drawGrid ({ map, gridSource }) {
  gridSource.clear();

  const state      = getState();
  const grid       = getGridSystem(state.activeGridSystem);
  const precision  = state.precision;

  const viewExt    = map.getView().calculateExtent(map.getSize());
  const [minLon0,minLat0] = toLonLat([viewExt[0], viewExt[1]]);
  const [maxLon0,maxLat0] = toLonLat([viewExt[2], viewExt[3]]);

  const [minLat,maxLat] = growLat(minLat0,maxLat0);
  const lonRanges       = splitByAntimeridian(minLon0,maxLon0).flatMap(growLon);

  const features = lonRanges.flatMap(([lonMin,lonMax]) =>
    grid
      .polygonToCells(precision, ring([lonMin,minLat,lonMax,maxLat]))
      .map(id => new Feature(new Polygon(grid.decode(id))))
  );

  if (features.length > MAX_FEATURES) {
    showToast(`Too many grid cells (${features.length.toLocaleString()} > ${MAX_FEATURES.toLocaleString()}) – reduce precision!`);
    return;
  }

  features.forEach(f => f.setStyle(tileStyle));
  gridSource.addFeatures(features);
}

export function registerGridRenderer({ map, view, gridSource }) {
  // Keep precision synced to zoom unless locked
  const updatePrecisionFromZoom = (state) => {
		if(state.precisionLocked) return;
    const next = getGridSystem(state.activeGridSystem).mapToPrecision(view.getZoom());
    if (next !== state.precision) setState({ precision: next });
  };

  // Initial precision
  updatePrecisionFromZoom(getState());

  // Initial render
  drawGrid({ map, gridSource });

  // React to store changes
  let prev = getState();
	subscribe((state) => {
		const precisionChanged = state.precisionLocked === true && state.precision !== prev.precision;
		const lockChanged      = state.precisionLocked !== prev.precisionLocked;
		const gridChanged      = state.activeGridSystem !== prev.activeGridSystem;
		const centerChanged    = state.mapCenter !== prev.mapCenter;
		const zoomChanged			 = state.mapZoom !== prev.mapZoom;
		
		if (precisionChanged || zoomChanged || lockChanged || gridChanged || centerChanged) {
			updatePrecisionFromZoom(state);
			drawGrid({ map, gridSource });
		}
		prev = state;
	});

}
