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
import {toLonLat, fromLonLat} from 'ol/proj.js';
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

function drawGrid() {
	gridSource.clear();

	const polygons = [];
	const viewExtent = map.getView().calculateExtent(map.getSize());

	const [minLon, minLat] = toLonLat([viewExtent[0],viewExtent[1]]);
	const [maxLon, maxLat] = toLonLat([viewExtent[2],viewExtent[3]]);

	const addPolygons = (minLat, minLon, maxLat, maxLon) => {
		const extentPolygon = [
			[minLon, minLat],
			[maxLon, minLat],
			[maxLon, maxLat],
			[minLon, maxLat],
			[minLon, minLat],
		];
		gridSystem.polygonToCells(extentPolygon).forEach(h => polygons.push(gridSystem.decode(h)));
	}

	const EPS = 1e-9;
	if(Math.abs(minLon - maxLon) < EPS) {
		addPolygons(minLat, 0, maxLat, 180-EPS);
		addPolygons(minLat, -180+EPS, maxLat, 0);
	} else if(minLon >= maxLon) {
		addPolygons(minLat, minLon, maxLat, 180-EPS);
		addPolygons(minLat, -180+EPS, maxLat, maxLon);
	} else {
		addPolygons(minLat, minLon, maxLat, maxLon);
	}

	const features = polygons.map(polygon => new Feature(new Polygon(polygon)));
	features.forEach(feature => feature.setStyle(tileStyle));
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
