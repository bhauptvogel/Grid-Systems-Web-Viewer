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
import { toLonLat } from 'ol/proj.js';

import { getState, setState } from './state/store.js';

// Projection helper
function toWGS84(map, geom) {
  const src = map.getView().getProjection();
  return src.getCode() === 'EPSG:4326'
    ? geom.clone()
    : geom.clone().transform(src, 'EPSG:4326');
}

// singletons (module-level)
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
    image : new CircleStyle({ radius: 5 }),
  }),
});

// init module
function init({ map: mapInstance, grids }) {
  map          = mapInstance;
  gridRegistry = grids;
  map.addLayer(drawLayer);
}

// geometry -> tile ids
function cellsFromGeometry(rawGeom) {
  const grid = gridRegistry?.[getState().activeGridSystem];
  if (!grid) return [];

  const geom = toWGS84(map, rawGeom);
	const precision = getState().precision;

  switch (geom.getType()) {
    case 'Polygon':
			const poly = geom.getCoordinates()[0];
      return grid.polygonToCells(precision,poly);

    case 'Circle':
			const polyProjected = fromCircle(rawGeom, 64);
			const polyWgs       = toWGS84(map, polyProjected);
			const circlePoly = polyWgs.getCoordinates()[0];
      return grid.polygonToCells(precision,circlePoly);

    case 'LineString':
			const ids      = new Set();
      const viewProj = map.getView().getProjection();
			const view     = map.getView();
 
      const metricGeom =
        viewProj.getCode() === 'EPSG:3857'
          ? rawGeom
          : rawGeom.clone().transform(viewProj, 'EPSG:3857');
      const metresPerPixel = view.getResolution();
      const pixelsBetweenSamples = 10;
      const sampleDist = metresPerPixel * pixelsBetweenSamples;

      const n = Math.max(1,Math.ceil(metricGeom.getLength() / sampleDist));

      for (let i = 0; i <= n; i++) {
        const coord = rawGeom.getCoordinateAt(i / n);
        const [lon, lat] =
          viewProj.getCode() === 'EPSG:4326'
            ? coord
            : toLonLat(coord, viewProj);
        ids.add(grid.encode(precision, lat, lon));
      }
      return [...ids];
  }
  return [];
}

// merge cells to state
function mergeIntoSelection(ids) {
  if (!ids?.length) return;
  const prev = getState().selectedCells;
  setState({ selectedCells: [...new Set([...prev, ...ids])] });
}

// draw mode lifecycle: stop
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

// draw mode lifecycle: begin
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

// reset drawing
function reset() {
  stopCurrentInteraction();
  vectorSource.clear();
}

// api
function activate(mode) {
  if (!map) {
    console.warn('drawTools: init() not yet called');
    return;
  }

  const cfg = {
		line:      { type: 'LineString' , maxPoints: 2},
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
		vectorSource.addFeatures(feats);
    function addGeometry(geom) {
      const type = geom.getType();
      if (type.startsWith('Multi') || type === 'GeometryCollection') {
        geom.getGeometries().forEach(addGeometry);
      } else {
        mergeIntoSelection(cellsFromGeometry(geom));
      }
    }
    feats.forEach(f => addGeometry(f.getGeometry()));
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
  importGeoJSON,
  reset,                      // clears drawings + selection
  hasDrawings,                // boolean for map-click guard
	stopCurrentInteraction,
};

