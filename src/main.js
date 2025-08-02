import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultInteractions } from 'ol/interaction';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js'
import VectorSource from 'ol/source/Vector.js';
import {Fill, Stroke, Style} from 'ol/style.js';
import { initUrlSync } from './queryParams.js';
import {toLonLat, fromLonLat, transformExtent} from 'ol/proj.js';
import { boundingExtent } from 'ol/extent.js';
import { drawTools } from './drawTools.js';
import './ui/gridSelector.js';
import './ui/selectedCellsInput.js';
import './ui/cellIdLabel.js';
import './ui/toolBar.js';
import './ui/precisionControl.js';

import { getState, subscribe, setState } from './state/store.js';
import * as history from './history.js';
import { showToast } from './ui/toast.js';

import {SlippyTilesGrid} from "./grid/slippy.js";
import {GeohashGrid} from "./grid/geohash.js";
import {UberH3Grid} from "./grid/h3.js";
import {QuadTreeGrid} from "./grid/quadtree.js";

// INIT: QueryParams
initUrlSync();

// ============== MAP INIT ============== 
const tileStyle = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 2,
  }),
});

const selectedStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 0, 0, 0.30)',   // 30 % opaque red
  }),
  stroke: new Stroke({
    color: 'rgba(255, 0, 0, 1)',   // 80 % opaque red outline
    width: 2,
  }),
});

const gridSource = new VectorSource({wrapX: true});
const selectedSource = new VectorSource({wrapX: true});

const { mapCenter, mapZoom } = getState();
const view = new View({
    zoom: mapZoom,
		center: mapCenter,
		projection: 'EPSG:3857',
		multiWorld: false
});

const map = new Map({
  target: 'map', 
  layers: [
    new TileLayer({
			source: new OSM(),
    }),
		new VectorLayer({
			source: gridSource,
		}),
		new VectorLayer({
			source: selectedSource,
		}),
  ],
	interactions: defaultInteractions({ doubleClickZoom: false }),
	view: view,
});


// ============== GRID SYSTEM CONTROL ============== 
const gridRegistry = {
  slippy   : new SlippyTilesGrid(), 
  geohash  : new GeohashGrid(),
  h3       : new UberH3Grid(),
  quadtree : new QuadTreeGrid(),
};

// INIT: Draw Tools
drawTools.init({map, grids: gridRegistry});

const gridSystem = () => {
	const key = getState().activeGridSystem;
  const grid = gridRegistry[key];
  if (!grid) throw new Error(`Not a valid grid selected: “${key}”`);
  return grid;
}

const watchActiveGridSystem = (() => {
  let prevKey = getState().activeGridSystem;
  return (state) => {
    const { activeGridSystem: nextKey } = state;
    if (nextKey === prevKey) return;
    prevKey = nextKey;

    // UI housekeeping
    drawTools.reset();
    // Unlock precision 
    setState({ precisionLocked: false });
    // Recompute precision and redraw
    updatePrecision();
    drawGrid();
  };
})();

subscribe(watchActiveGridSystem);

// ============== PRECISION CONTROL ============== 
// map zoom level to precision state
const updatePrecision = () => {
  const { precision: current, precisionLocked } = getState();
  if (precisionLocked) return;
  const next = gridSystem().mapToPrecision(map.getView().getZoom());
  if (next !== current) setState({ precision: next });
};
// re-draw grid when precision is changed
const watchPrecision = (() => {
  let prevPrecision = getState().precision;
  return (state) => {
    if (state.precision !== prevPrecision) {
      prevPrecision = state.precision;
      drawGrid();
    }
  };
})();
const getCurrentPrecision = () => getState().precision;
subscribe(updatePrecision);
subscribe(watchPrecision);

// ============== TILE DRAWING ============== 
const EPS = 1e-9;
// Split a [minLon, maxLon] range into one or two non-wrapping ranges.
// Returns an array of [lonMin, lonMax] tuples, always with lonMin < lonMax.
function splitByAntimeridian(minLon, maxLon) {
  const width = maxLon - minLon;
  if (Math.abs(width) < EPS) {
		// 1. Viewport spans ~360°, treat as whole world split in half.
    return [[-180+EPS, 0], [0, 180-EPS]];
  } else if (width > 0) {
		// 2. Normal case, no crossing.
    return [[minLon, maxLon]];
  } else {
		// 3. Crosses the ±180° meridian → two ranges.
		return [[minLon, 180-EPS], [-180+EPS, maxLon]];
	}
}

// TODO: to utils / helper file
function ring([lon1, lat1, lon2, lat2]) {
  return [
    [lon1, lat1],
    [lon2, lat1],
    [lon2, lat2],
    [lon1, lat2],
    [lon1, lat1],
  ];
}

const GROW_FACTOR = 0.3;
function grow(minCoord, maxCoord, limit, growFactor) {
	const span = maxCoord - minCoord;
	const delta = span * growFactor * 0.5;
	const clamp = (x, min, max) => Math.min(Math.max(x, min), max);
	return [ clamp(minCoord - delta, -limit, limit), clamp(maxCoord + delta, -limit, limit) ];
}
const growLat = (minLat, maxLat) => grow(minLat, maxLat, 85.051129 - EPS, GROW_FACTOR);
const growLon = ([minLon, maxLon]) => [grow(minLon, maxLon, 180-EPS, GROW_FACTOR)];

const MAX_FEATURES = 20000;
function drawGrid() {
  gridSource.clear();

	const viewExtent = map.getView().calculateExtent(map.getSize());
	const [minLon0, minLat0] = toLonLat([viewExtent[0],viewExtent[1]]);
	const [maxLon0, maxLat0] = toLonLat([viewExtent[2],viewExtent[3]]);

	// Grow viewport to include tiles slighty out of view
	const [minLat, maxLat] = growLat(minLat0, maxLat0);
  const lonSlices = splitByAntimeridian(minLon0, maxLon0).flatMap(growLon);

  const features = lonSlices.flatMap(([lonMin, lonMax]) =>
    gridSystem()
     .polygonToCells(getCurrentPrecision(), ring([lonMin, minLat, lonMax, maxLat]))
     .map(h => new Feature(new Polygon(gridSystem().decode(h))))
  );
	
	if (features.length > MAX_FEATURES) {
		showToast(`Too many grid cells to display (${features.length.toLocaleString()} > ${MAX_FEATURES.toLocaleString()}) please reduce precision!`);
		return;
	}

	features.forEach(f => f.setStyle(tileStyle));
	gridSource.addFeatures(features);
}

// ============== TILE SELECTION ============== 
function selectTile(lon, lat) {
	const id = gridSystem().encode(getCurrentPrecision(), lat, lon);
	const { selectedCells } = getState();
	if(selectedCells.includes(id)) setState({ selectedCells: selectedCells.filter(cell => cell !== id) });
	else setState({ selectedCells: [...selectedCells, id], });
}

function renderSelected() {
	const { selectedCells } = getState();
	selectedSource.clear();
	const polygons = selectedCells.map(tile => gridSystem().decode(tile));
	const features = polygons.map(polygon => new Feature(new Polygon(polygon)));
	features.forEach(feature => feature.setStyle(selectedStyle));
	selectedSource.addFeatures(features);
}

subscribe(() => renderSelected());

updatePrecision();

// ============== MAP EVENTS ============== 
// zoom change
map.getView().on('change:resolution', () => {
	drawGrid();
  setState({ mapCenter: view.getCenter(), mapZoom: view.getZoom() });
	updatePrecision();
});

// map moving
map.on('moveend', () => {
	drawGrid();
  setState({ mapCenter: view.getCenter(), mapZoom: view.getZoom() });
	updatePrecision();
});

let last = null;
map.on('pointermove', function (event) {
	const [lon, lat] = toLonLat(event.coordinate);
	const cell = gridSystem().encode(getCurrentPrecision(), lat, lon);
	if (cell !== last) {
		last = cell;
		setState({ hoveredCell: cell});
	}
});

// tile selection per click
map.on('click', (event) => {
	if(getState().isDrawing) return;
	const [lon, lat] = toLonLat(event.coordinate);
	selectTile(lon, lat);
});

// ============== SEARCH LOGIC ============= 
// move to coordinate
document.addEventListener('app:searchCoordinate', (e) => {
  const { lat, lon } = e.detail;
  view.animate({
    center: fromLonLat([lon, lat]),
    duration: 400,
  });
});

// move to tile
document.addEventListener('app:searchCell', (e) => {
  const { cellId } = e.detail;
  try {
		const ring = (() => { const p = gridSystem().decode(cellId); return Array.isArray(p[0][0]) ? p[0] : p; })();
    const [cx, cy] = ring.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]).map(v => v / ring.length);

    const ext = boundingExtent(ring), w = ext[2] - ext[0], h = ext[3] - ext[1];
    const pad = [ext[0] - w, ext[1] - h, ext[2] + w, ext[3] + h];

    const res  = view.getResolutionForExtent(pad, map.getSize());
    const zoom = Math.min(view.getMaxZoom(), Math.round(view.getZoomForResolution(res) * 2) / 2);

    view.animate({ center: [cx, cy], zoom: zoom, duration: 250 });
		const { selectedCells } = getState();
    if(!selectedCells.includes(cellId)) {
			setState({ selectedCells: [...selectedCells, cellId], });
		}
  } catch {
    showToast(`Could not locate “${cellId}”.\nDoes it match the active grid system?`);
  }
});

// ============== KEYBOARD SHORTCUTS ============= 
document.addEventListener('keydown', (event) => {
  const view = map.getView();
  const zoom = view.getZoom();

	// ── MAP ZOOM ───────────────────────────────────────────────
  if (event.key === '+' || event.key === '=') {
    view.setZoom(zoom + 1);
  } else if (event.key === '-') {
    view.setZoom(zoom - 1);
  }

	// ── HISTORY UNDO / REDO ───────────────────────────────────────────────
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    history.undo();
  }
  if ((event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    history.redo();
  }
});
