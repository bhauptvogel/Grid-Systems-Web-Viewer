import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js'
import {toLonLat, fromLonLat} from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import geohash from 'ngeohash';
import {latLngToCell, polygonToCells, cellToBoundary} from "h3-js";

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

function cornersToRectanglePolygon(minX, maxX, minY, maxY) { return [[[minX, minY],[minX,maxY],[maxX,maxY],[maxX,minY],[minX,minY]]] }

const worldRadius = 6378137;
const originShift = Math.PI * worldRadius;

class SlippyTilesGrid {
	_zoom() {
		return Math.max(3, Math.floor(map.getView().getZoom()+0.5));
	}
	_getTile(coordinates) {
		const tileCount = Math.pow(2,this._zoom());
		const resolution = (originShift * 2) / tileCount;

		const xTile = Math.floor((coordinates[0] + originShift) / resolution);
		const yTile = Math.floor((originShift - coordinates[1]) / resolution);

		return { xTile, yTile };
	}
	gridPolygons() {
		const polygons = [];

		const view = map.getView();
		const viewExtent = view.calculateExtent(map.getSize());
		const tileCount = Math.pow(2,this._zoom());
		const resolution = (2 * originShift) / tileCount;
		 
		// slippy tile definition: Northwest = [0,0]
		const nwCoords = this._getTile([viewExtent[0], viewExtent[3]]);
		const seCoords = this._getTile([viewExtent[2], viewExtent[1]]);
		for (let x = nwCoords.xTile; x < seCoords.xTile+1; x++) {
			for (let y = nwCoords.yTile; y < seCoords.yTile+1; y++) {
				const minX = -originShift + x * resolution;
				const maxX = -originShift + (x + 1) * resolution;
				const maxY = originShift - y * resolution;
				const minY = originShift - (y + 1) * resolution;
				polygons.push(cornersToRectanglePolygon(minX, maxX, minY, maxY));
			}
		}
		return polygons;
	}
	getID(coordinates) {
		const tile = this._getTile(coordinates);
		return `${this._zoom()}/${tile.xTile}/${tile.yTile}`;
	}
}

const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

class GeohashGrid {
	// # of characters of geohash (analogous to zoom)
	_precision() { return 1 + Math.floor(map.getView().getZoom()/3); }
	_charToPos(char, isEven) {
		// AI generated (TODO check correctness!)
		const idx = base32.indexOf(char);
		if (idx === -1) throw new Error(`Invalid geohash character: ${char}`);
		
		let row = 0;
		let col = 0;
		for (const mask of [16, 8, 4, 2, 1]) {
			const bit = (idx & mask) ? 1 : 0;
			if (isEven) col = (col << 1) | bit;
			else row = (row << 1) | bit;
			isEven = !isEven;
		}

		return [col, row];
	}
	_innerPolygons(hash, differentIdx) {
		const polygons = [];
		for (let i = 1; i < base32.length; i++) {
			const innerTileHash = hash + base32[i];
			const bbox = geohash.decode_bbox(innerTileHash);
			polygons.push([[
				fromLonLat([bbox[1], bbox[0]]), // bottom-left
				fromLonLat([bbox[3], bbox[0]]), // top-left
				fromLonLat([bbox[3], bbox[2]]), // top-right
				fromLonLat([bbox[1], bbox[2]]), // bottom-right
				fromLonLat([bbox[1], bbox[0]]), // close the loop
			]]);
			if (this._precision() > differentIdx + 1) polygons.push(...this._innerPolygons(innerTileHash, differentIdx + 1));
		}
		return polygons;
	}
	gridPolygons() {
		// TODO: rewrite algorithm: only render innermost tiles (highest zoom)
		const polygons = [];

		const view = map.getView();
		const viewExtent = view.calculateExtent(map.getSize());
		const precision = this._precision();

		const [swLon, swLat] = toLonLat([viewExtent[0],viewExtent[1]]);
		const swHash = geohash.encode(swLat, swLon, precision);
		const [neLon, neLat] = toLonLat([viewExtent[2],viewExtent[3]]);
		const neHash = geohash.encode(neLat, neLon, precision);

	  // # get geohash tiles
		// first character that is different between sw and ne
		let index = 0;
		while (index < swHash.length && swHash[index] === neHash[index]) index++;
		const firstDifferentIdx = index;

		// draw *visible* tiles of inner layers
		const swPos = this._charToPos(swHash.charAt(firstDifferentIdx), firstDifferentIdx % 2 == 1);
		const nePos = this._charToPos(neHash.charAt(firstDifferentIdx), firstDifferentIdx % 2 == 1);
		
		for (let x = 0; x < (nePos[0]-swPos[0]) + 1; x++) {
			for (let y = 0; y < (nePos[1]-swPos[1]) + 1; y++) {
				const tileHash = geohash.neighbor(swHash.slice(0,firstDifferentIdx+1), [x, y]);
				const bbox = geohash.decode_bbox(tileHash);
				polygons.push([[
					fromLonLat([bbox[1], bbox[0]]), // bottom-left
					fromLonLat([bbox[3], bbox[0]]), // top-left
					fromLonLat([bbox[3], bbox[2]]), // top-right
					fromLonLat([bbox[1], bbox[2]]), // bottom-right
					fromLonLat([bbox[1], bbox[0]]), // close the loop
				]]);
				if (precision > firstDifferentIdx+1) polygons.push(...this._innerPolygons(tileHash, firstDifferentIdx+1));
			}
		}
		return polygons;
	}
	getID(coordinates) {
		return geohash.encode(toLonLat(coordinates)[1], toLonLat(coordinates)[0], this._precision());
	}
}

// Bing Maps
class QuadTreeGrid extends SlippyTilesGrid {
	getID(coordinates) {
		const tile = this._getTile(coordinates);
		const level = this._zoom(coordinates);
		let quadKey = '';
    for (let i = level; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((tile.xTile & mask) !== 0) {
            digit += 1;
        }
        if ((tile.yTile & mask) !== 0) {
            digit += 2;
        }
        quadKey += digit.toString();
    }
    return quadKey;
	}
}

function getCurrentExtentPolygon(extent) {
  const bottomLeft = toLonLat([extent[0], extent[1]]);
  const bottomRight = toLonLat([extent[2], extent[1]]);
  const topRight = toLonLat([extent[2], extent[3]]);
  const topLeft = toLonLat([extent[0], extent[3]]);

  return [[
    [bottomLeft[0], bottomLeft[1]],
    [bottomRight[0], bottomRight[1]],
    [topRight[0], topRight[1]],
    [topLeft[0], topLeft[1]],
    [bottomLeft[0], bottomLeft[1]] 
  ]];
}

// use h3-js
class UberH3Grid {
	_resolution() {
		const z = Math.floor(map.getView().getZoom());
		if (z < 3) return 0;
		if (z >= 23) return 15;
		return Math.floor((z - 2) * 0.75);
	}
	gridPolygons() {
		// TODO: Bug - at far zoom - not or wrongly shown grid
		// TODO: Bug - at edges - grid wrongly shown
		const view = map.getView();
		const viewExtent = view.calculateExtent(map.getSize());
		const polygonExtent = getCurrentExtentPolygon(viewExtent);
		const resolution = this._resolution();

		const cells = polygonToCells(polygonExtent, resolution, true);
		const polygons = cells.map(h3Index => cellToBoundary(h3Index, true));
		const convertedPolygons = polygons.map(poly => [poly.map(bound => fromLonLat(bound))]);
		return convertedPolygons;
	}
	getID(coordinates) {
		return latLngToCell(toLonLat(coordinates)[1], toLonLat(coordinates)[0], this._resolution());
	}
	getPolygon(id) {
		const boundary = cellToBoundary(id, true);
		return [cellToBoundary(id, true).map(bound=>fromLonLat(bound))];
	}
}


// TODO: make state system
var gridSystem = new SlippyTilesGrid();
var selected = [];

function drawGrid() {
	gridSource.clear();
	const polygons = gridSystem.gridPolygons();
	const features = polygons.map(polygon => new Feature(new Polygon(polygon)));
	features.forEach(feature => feature.setStyle(tileStyle));
	gridSource.addFeatures(features);
}

function logCoordinates(coordinates) {
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
	logCoordinates(event.coordinate);
});

map.on('click', (event) => {
	if(event.originalEvent.ctrlKey == false) resetSelected();
	selectTile(event.coordinate);
});
