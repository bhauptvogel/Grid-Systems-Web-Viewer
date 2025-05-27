import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js'
import VectorSource from 'ol/source/Vector.js';
import {Fill, Stroke, Style} from 'ol/style.js';

import {SlippyTilesGrid} from "./grid/slippy.js";
import {GeohashGrid} from "./grid/geohash.js";
import {UberH3Grid} from "./grid/h3.js";
import {QuadTreeGrid} from "./grid/quadtree.js";

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

const gridSource = new VectorSource();
const selectedSource = new VectorSource();

const view = new View({
    center: [0,0],
    zoom: 2,
		projection: 'EPSG:3857',
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
	view: view,
});

// TODO: make state system
var gridSystem = new UberH3Grid(map);
var selected = [];

function drawGrid() {
	gridSource.clear();
	const polygons = gridSystem.gridPolygons();
	const features = polygons.map(polygon => new Feature(new Polygon(polygon)));
	features.forEach(feature => feature.setStyle(tileStyle));
	gridSource.addFeatures(features);
}

function logTile(coordinates) {
	console.log(gridSystem.getID(coordinates));
}

function resetSelected() { selected = []; }
function selectTile(coordinates) {
	selected.push(gridSystem.getID(coordinates));
	renderSelected();
}

function renderSelected() {
	selectedSource.clear();
	const polygons = selected.map(tile => gridSystem.getPolygon(tile));
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

map.on('pointermove', function (event) {
	logTile(event.coordinate);
});

map.on('click', (event) => {
	if(event.originalEvent.ctrlKey == false) resetSelected();
	selectTile(event.coordinate);
});
