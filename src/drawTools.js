// src/tools/drawTools.js
// Centralised geometry-to-cell utilities with multi-shape support.
// Import once; call drawTools.init({ map, grids }).

import VectorSource        from 'ol/source/Vector.js';
import VectorLayer         from 'ol/layer/Vector.js';
import Draw, { createBox } from 'ol/interaction/Draw.js';
import {
  Style,
  Stroke,
  Fill,
  Circle as CircleStyle,
} from 'ol/style.js';
import { fromCircle }      from 'ol/geom/Polygon.js';
import GeoJSON             from 'ol/format/GeoJSON.js';
import { fromLonLat }      from 'ol/proj.js';

import { getState, setState } from './state/store.js';

/* ------------------------------------------------------------------ */
/*  Projection helper                                                 */
/* ------------------------------------------------------------------ */
function toWGS84(map, geom) {
  const src = map.getView().getProjection();
  return src.getCode() === 'EPSG:4326'
    ? geom.clone()
    : geom.clone().transform(src, 'EPSG:4326');
}

/* ------------------------------------------------------------------ */
/*  Module-level singletons                                           */
/* ------------------------------------------------------------------ */
let map          = null;
let gridRegistry = null;
let activeDraw   = null;
let escHandler   = null;

const vectorSource = new VectorSource({ wrapX: false });
const drawLayer    = new VectorLayer({
  source: vectorSource,
  style : new Style({
		stroke: new Stroke({ width: 2, color: "blue" }),
		fill  : new Fill({ color: 'rgba(0, 0, 255, 0.2)' }),
    //fill  : new Fill({ opacity: 0.2, color: "blue" }),
    image : new CircleStyle({ radius: 5 }),
  }),
});

/* ------------------------------------------------------------------ */
/*  Init                                                              */
/* ------------------------------------------------------------------ */
function init({ map: mapInstance, grids }) {
  map          = mapInstance;
  gridRegistry = grids;
  map.addLayer(drawLayer);
}

/* ------------------------------------------------------------------ */
/*  Geometry → cell-ID translation                                    */
/* ------------------------------------------------------------------ */
function cellsFromGeometry(rawGeom) {
  const grid = gridRegistry?.[getState().activeGridSystem];
  if (!grid) return [];

  const geom = toWGS84(map, rawGeom);

  switch (geom.getType()) {
    case 'Polygon':
    case 'MultiPolygon':
			const poly = geom.getCoordinates()[0];
      return grid.polygonToCells(poly);

    case 'Circle':
			const circlePoly = fromCircle(geom, 64).getCoordinates()[0];
      return grid.polygonToCells(circlePoly);

    case 'LineString': {
      const ids = new Set();
      const n   = Math.max(1, Math.ceil(geom.getLength() / 5e4)); // ~50 km
      for (let i = 0; i <= n; i++) {
        const [lon, lat] = geom.getCoordinateAt(i / n);
        ids.add(grid.encode(lat, lon));
      }
      return [...ids];
    }
  }
  return [];
}

function mergeIntoSelection(ids) {
  if (!ids?.length) return;
  const prev = getState().selectedCells;
  setState({ selectedCells: [...new Set([...prev, ...ids])] });
}

/* ------------------------------------------------------------------ */
/*  Draw-mode lifecycle                                               */
/* ------------------------------------------------------------------ */
function stopCurrentInteraction() {
  if (activeDraw) {
    map.removeInteraction(activeDraw);
    activeDraw = null;
  }
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
    setState({ isDrawing: false });
}

function beginDrawInteraction(cfg) {
  stopCurrentInteraction();

  activeDraw = new Draw({ source: vectorSource, ...cfg });
  activeDraw.on('drawend', evt => {
    mergeIntoSelection(cellsFromGeometry(evt.feature.getGeometry()));
    // interaction remains active for additional shapes
  });
  map.addInteraction(activeDraw);

  escHandler = e => {
    if (e.key === 'Escape') stopCurrentInteraction();
  };
  document.addEventListener('keydown', escHandler);

  setState({ isDrawing: true });
}

function reset() {
  stopCurrentInteraction();
  vectorSource.clear();
}


/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
function activate(mode) {
  if (!map) {
    console.warn('drawTools: init() not yet called');
    return;
  }

  const cfg = {
    line:      { type: 'LineString' },
    polygon:   { type: 'Polygon' },
    rectangle: { type: 'Circle', geometryFunction: createBox() },
    circle:    { type: 'Circle' },
  }[mode];

  if (!cfg) {
    console.warn('drawTools: unknown mode', mode);
    return;
  }
  beginDrawInteraction(cfg);
}

function search(input) {
  if (!map) {
    console.warn('drawTools: init() not yet called');
    return;
  }
  const view  = map.getView();
  const parts = input.split(',').map(s => s.trim());

  // lat,lon
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const lat  = parseFloat(parts[0]);
    const lon  = parseFloat(parts[1]);
    view.animate({ center: fromLonLat([lon, lat]), zoom: 10 });
    const grid = gridRegistry?.[getState().activeGridSystem];
    if (grid) mergeIntoSelection([grid.encode(lat, lon)]);
    return;
  }

  // tile id
  const grid = gridRegistry?.[getState().activeGridSystem];
  if (!grid) {
    alert('Unknown grid system');
    return;
  }

  try {
    const poly = grid.decode(input);             // geometry in WGS84
    poly.transform('EPSG:4326', view.getProjection());
    view.fit(poly.getExtent(), { padding: [50, 50, 50, 50] });
    mergeIntoSelection([input]);
  } catch {
    alert('Input not recognised as coordinates or tile-id');
  }
}

function importGeoJSON(text) {
  if (!map) {
    console.warn('drawTools: init() not yet called');
    return;
  }
  try {
    const fmt   = new GeoJSON();
    const feats = fmt.readFeatures(text, {
      featureProjection: map.getView().getProjection(),
      dataProjection   : 'EPSG:4326',
    });
    feats.forEach(f => mergeIntoSelection(cellsFromGeometry(f.getGeometry())));
  } catch (err) {
    console.error(err);
    alert('GeoJSON could not be parsed');
  }
}

// helper for map-click guard
function hasDrawings() {
  return vectorSource.getFeatures().length > 0;
}

export const drawTools = {
  init,                       // ({ map, grids })
  activate,                   // 'line' | 'polygon' | 'rectangle' | 'circle'
  search,                     // 'lat,lon' | 'tileId'
  importGeoJSON,
  reset,                      // clears drawings + selection
  hasDrawings,                // boolean for map-click guard
};

