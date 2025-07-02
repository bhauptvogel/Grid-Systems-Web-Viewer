import {fromLonLat} from 'ol/proj.js';
import {polygonToGeohashCells} from './utils/geohash-poly.js';

import geohash from 'ngeohash';

export class GeohashGrid {
	mapToPrecision(zoom) {
		const metresPerPixel = 156543.03392804097 / (2 ** zoom);
		const desired = metresPerPixel * 200;
		const sizes = [5009400, 626000, 78000, 19500, 2440, 610, 76, 19, 2.4]; 
		return sizes.findIndex(s => s < desired) + 1 || 9;
	}
	polygonToCells(precision, polygon) {
		return polygonToGeohashCells([polygon], precision); 
	}
	encode(precision, lat, lon) {
		return geohash.encode(lat, lon, precision);
	}
	decode(id) {
		const bbox = geohash.decode_bbox(id);
		return [[
				fromLonLat([bbox[1], bbox[0]]), // bottom-left
				fromLonLat([bbox[3], bbox[0]]), // top-left
				fromLonLat([bbox[3], bbox[2]]), // top-right
				fromLonLat([bbox[1], bbox[2]]), // bottom-right
				fromLonLat([bbox[1], bbox[0]]), // close the loop
			]];
	}
}
