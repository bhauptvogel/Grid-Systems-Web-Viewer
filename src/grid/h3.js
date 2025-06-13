import {getRes0Cells, latLngToCell, polygonToCells, cellToBoundary} from "h3-js";
import {toLonLat,fromLonLat} from 'ol/proj';
import {isWiderThan180, splitWidePolygon} from './utils/antimeridian-split.js';

export class UberH3Grid {
	constructor(map) { this.map = map };
	precision() {
		const z = Math.floor(this.map.getView().getZoom());
		if (z < 3) return 0;
		if (z >= 23) return 15;
		return Math.floor((z - 2) * 0.75);
	}
	polygonToCells(polygon) {
		if(!isWiderThan180(polygon)) return polygonToCells(polygon, this.precision(), true);
		else {
			const rings = splitWidePolygon(polygon);
			return polygonToCells(rings[0], this.precision(), true).concat(polygonToCells(rings[1], this.precision(), true)); 
		}
	}
	encode(lat, lon) {
		return latLngToCell(lat, lon, this.precision());
	}
	_unwrapRing(ring) {
		const res = [ring[0].slice()];
		let offset = 0;

		for (let i = 1; i < ring.length; ++i) {
			const [lonPrev] = res[i - 1];
			let [lon, lat] = ring[i];
			let diff = lon - lonPrev + offset;

			if (diff > 180)   offset -= 360;
			if (diff < -180)  offset += 360;

			res.push([lon + offset, lat]);
		}
		return res;
	}
	decode(id) {
		const ring = this._unwrapRing(cellToBoundary(id, true)); // lat/lon order → lon/lat below
		const mercator = ring.map(([lon, lat]) => fromLonLat([lon, lat]));
		return [mercator];
	}
}

