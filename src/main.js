import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js'
import VectorSource from 'ol/source/Vector.js';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';

const tileStyle = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 2,
  }),
});

const vectorSource = new VectorSource();

const vectorLayer = new VectorLayer({
  source: vectorSource,
});

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
		vectorLayer,
  ],
	view: view,
});

const worldRadius = 6378137;
const originShift = Math.PI * worldRadius;

function coordinatesToSlippyTile(zoom, x, y) {
	const tileCount = Math.pow(2,zoom);
	const resolution = (originShift * 2) / tileCount;

	const xTile = Math.floor((x + originShift) / resolution);
	const yTile = Math.floor((originShift - y) / resolution);

	return { xTile, yTile };
}

function drawCurrentSlippyTiles() {
	const view = map.getView();
	const zoom = Math.floor(view.getZoom());
	const tileCount = Math.pow(2,zoom);
	const viewExtent = view.calculateExtent(map.getSize());
	
	function tileBounds(x, y) {
		// TODO Refactor: use coordinatesToSlippyTile function
		const resolution = (2 * originShift) / tileCount;

		const minX = -originShift + x * resolution;
		const maxX = -originShift + (x + 1) * resolution;

		const maxY = originShift - y * resolution;
		const minY = originShift - (y + 1) * resolution;

		return [[
			[minX, minY],
			[minX, maxY],
			[maxX, maxY],
			[maxX, minY],
			[minX, minY]
		]];
	}

	const tilesToDraw = [];
	 
	const min = coordinatesToSlippyTile(zoom, viewExtent[0], viewExtent[3], zoom); // Top-left corner
	const max = coordinatesToSlippyTile(zoom, viewExtent[2], viewExtent[1], zoom); // Bottom-right corner
	for (let x = min.xTile; x < max.xTile+1; x++) {
		for (let y = min.yTile; y < max.yTile+1; y++) {
			const f = new Feature(new Polygon(tileBounds(x, y)));
			f.setStyle(tileStyle);
			tilesToDraw.push(f);
		}
	}
	vectorSource.clear();
	vectorSource.addFeatures(tilesToDraw);
}

function getSlippyTileID(coordinates) {
	const zoom = Math.floor(view.getZoom());
	const tileCoordinates = coordinatesToSlippyTile(zoom, coordinates[0], coordinates[1]);
	console.log(`ID: ${zoom}/${tileCoordinates.xTile}/${tileCoordinates.yTile}`);
}

// initial draw
drawCurrentSlippyTiles();

// zoom change
map.getView().on('change:resolution', () => {
	drawCurrentSlippyTiles();
});

// map moving
// TODO: not just on move end
map.on('moveend', () => {
	drawCurrentSlippyTiles();
});

map.on('pointermove', function (event) {
	getSlippyTileID(event.coordinate);
});
