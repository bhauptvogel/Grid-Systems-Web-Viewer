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
	 
	const min = coordinatesToSlippyTile(zoom, viewExtent[0], viewExtent[3]); // Top-left corner
	const max = coordinatesToSlippyTile(zoom, viewExtent[2], viewExtent[1]); // Bottom-right corner
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

const base32 = '0145hjnp2367km1r89destwxbcfguvyz'; // (geohash-specific) Base32 map

function getGeoHashTiles(sw, ne, precision) {

  const lastBitSW = sw.charAt(sw.length-1);
	const lastBitNE = ne.charAt(ne.length-1);

	const evenBit = sw % 2 == 1;
	const divider = evenBit ? 4 : 8;

	const swIdx = base32.indexOf(lastBitSW);
	const neIdx = base32.indexOf(lastBitNE);
	const swPos = [Math.floor(swIdx/divider),swIdx%divider];
	const nePos = [Math.floor(neIdx/divider),neIdx%divider];
	const diff = [nePos[0]-swPos[0],nePos[1]-swPos[1]];

	const tiles = [];
	for (let x = 0; x < diff[0] + 1; x++) {
		for (let y = 0; y < diff[1] + 1; y++) {
			let [boxMinLat, boxMinLon, boxMaxLat, boxMaxLon] = geohash.decode_bbox(geohash.neighbor(sw,[x,y]));

			let bottomLeft = fromLonLat([boxMinLon, boxMinLat]);
			let bottomRight = fromLonLat([boxMaxLon, boxMinLat]);
			let topRight = fromLonLat([boxMaxLon, boxMaxLat]);
			let topLeft = fromLonLat([boxMinLon, boxMaxLat]);

			tiles.push([
				bottomLeft,
				bottomRight,
				topRight,
				topLeft,
				bottomLeft, // close ring
			])
		}
	}
  return tiles;
}


function drawCurrentGeohashTiles() {

	vectorSource.clear();

	const viewExtent = view.calculateExtent(map.getSize());
	let sw = toLonLat([viewExtent[0], viewExtent[1]]);
	sw = geohash.encode(sw[1], sw[0], 12);
	let ne = toLonLat([viewExtent[2], viewExtent[3]]);
	ne = geohash.encode(ne[1], ne[0], 12);
	let index = 0;
	while (index < sw.length && sw[index] === ne[index]) index++;
	sw = sw.slice(0, index+1);
	ne = ne.slice(0, index+1);
	const precision = index + 1;
	const tiles = getGeoHashTiles(sw, ne, precision);
	const features = tiles.map(tile => new Feature(new Polygon([tile])));
	features.forEach(feature => feature.setStyle(tileStyle));

	vectorSource.addFeatures(features);
}


const drawMode = 'Slippy';


// zoom change
map.getView().on('change:resolution', () => {
	if (drawMode == 'GeoHash') drawCurrentGeohashTiles();
	else if(drawMode == 'Slippy') drawCurrentSlippyTiles();
});

// map moving
// TODO: not just on move end (but all the time when moving, continuous)
map.on('moveend', () => {
	if (drawMode == 'GeoHash') drawCurrentGeohashTiles();
	else if(drawMode == 'Slippy') drawCurrentSlippyTiles();
});

map.on('pointermove', function (event) {
	if (drawMode == 'GeoHash') console.log(geohash.encode(toLonLat(event.coordinate)[1], toLonLat(event.coordinate)[0], 1));
	else if(drawMode == 'Slippy') getSlippyTileID(event.coordinate);
});
