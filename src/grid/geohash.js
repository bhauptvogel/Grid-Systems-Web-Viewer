import {toLonLat, fromLonLat} from 'ol/proj.js';
import {polygonToGeohashCells} from './utils/geohash-poly.js';

import geohash from 'ngeohash';

export class GeohashGrid {
	constructor(map) { this.map = map };
	// prior implementation
	// precision() { return 1 + Math.floor(this.map.getView().getZoom()/3); }
	// # of characters of geohash (analogous to zoom)
	precision() {
		const metresPerPixel = this.map.getView().getResolution();      // 3857 metres/px
		const desired = metresPerPixel * 200;                       // metres we allow
		const sizes = [5009400, 626000, 78000, 19500, 2440, 610, 76, 19, 2.4]; 
		return sizes.findIndex(s => s < desired) + 1 || 9;
	}
	polygonToCells(polygon) {
		return polygonToGeohashCells([polygon], this.precision()); 
	}
	encode(lat, lon) {
		return geohash.encode(lat, lon, this.precision());
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
