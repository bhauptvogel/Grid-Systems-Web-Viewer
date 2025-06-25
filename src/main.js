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
import {toLonLat, fromLonLat, transformExtent} from 'ol/proj.js';
import {getWidth as getExtentWidth} from 'ol/extent.js';
import './ui/gridSelector.js';
import './ui/selectedCellsInput.js';
import './ui/cellIdLabel.js';

import { getState, subscribe, setState } from './state/store.js';

import {SlippyTilesGrid} from "./grid/slippy.js";
import {GeohashGrid} from "./grid/geohash.js";
import {UberH3Grid} from "./grid/h3.js";
import {QuadTreeGrid} from "./grid/quadtree.js";

const mapGridSystem = (gridSystemString) => {
	if(gridSystemString == 'slippy') return new SlippyTilesGrid(map);
	else if(gridSystemString == 'h3') return new UberH3Grid(map);
	else if(gridSystemString == 'geohash') return new GeohashGrid(map);
	else if(gridSystemString == 'quadtree') return new QuadTreeGrid(map);
	else throw new Error("Not a valid grid selected!");
};

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

const view = new View({
    center: [0,0],
    zoom: 4,
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

const { activeGridSystem } = getState();
var gridSystem = mapGridSystem(activeGridSystem);

subscribe(({ activeGridSystem }) => {
	gridSystem = mapGridSystem(activeGridSystem);
	drawGrid();
});


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

function drawGrid() {
  gridSource.clear();

	const viewExtent = map.getView().calculateExtent(map.getSize());
	const [minLon0, minLat0] = toLonLat([viewExtent[0],viewExtent[1]]);
	const [maxLon0, maxLat0] = toLonLat([viewExtent[2],viewExtent[3]]);

	// Grow viewport to include tiles slighty out of view
	const [minLat, maxLat] = growLat(minLat0, maxLat0);
  const lonSlices = splitByAntimeridian(minLon0, maxLon0).flatMap(growLon);

  const features = lonSlices.flatMap(([lonMin, lonMax]) =>
    gridSystem
     .polygonToCells(ring([lonMin, minLat, lonMax, maxLat]))
     .map(h => new Feature(new Polygon(gridSystem.decode(h))))
  );

  features.forEach(f => f.setStyle(tileStyle));
  gridSource.addFeatures(features);
}


function resetSelected() { setState({ selectedCells: [] }); }

function selectTile(lon, lat) {
	const id = gridSystem.encode(lat, lon);
	const { selectedCells } = getState();
	if(!selectedCells.includes(id)) {
		setState({ selectedCells: [...selectedCells, id], });
	}
	renderSelected();
}

subscribe(({ selectedCells }) => {
	renderSelected();
});

function renderSelected() {
	selectedSource.clear();
	const { selectedCells } = getState();
	const polygons = selectedCells.map(tile => gridSystem.decode(tile));
	const features = polygons.map(polygon => new Feature(new Polygon(polygon)));
	features.forEach(feature => feature.setStyle(selectedStyle));
	selectedSource.addFeatures(features);
}

// zoom change
map.getView().on('change:resolution', () => {
	drawGrid();
});

// map moving
// TODO: not just on move end (but all the time when moving, continuous)
map.on('moveend', () => {
	drawGrid();
});

let last = null;
map.on('pointermove', function (event) {
	const [lon, lat] = toLonLat(event.coordinate);
	const cell = gridSystem.encode(lat, lon);
	if (cell !== last) {
		last = cell;
		setState({ hoveredCell: cell});
	}
});

map.on('click', (event) => {
	if(event.originalEvent.ctrlKey == false) resetSelected();
	const [lon, lat] = toLonLat(event.coordinate);
	selectTile(lon, lat);
});
