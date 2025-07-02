import {latLngToCell, polygonToCells, cellToBoundary} from "h3-js";
import {fromLonLat} from 'ol/proj';
import {isWiderThan180, splitWidePolygon} from './utils/antimeridian-split.js';

export class UberH3Grid {
	mapToPrecision(zoom) {
		const z = Math.floor(zoom);
		if (z < 3) return 0;
		if (z >= 23) return 15;
		return Math.floor((z - 2) * 0.75);
	}
	polygonToCells(precision, polygon) {
		if(!isWiderThan180(polygon)) return polygonToCells(polygon, precision, true);
		else {
			const rings = splitWidePolygon(polygon);
			return polygonToCells(rings[0], precision, true).concat(polygonToCells(rings[1], precision, true)); 
		}
	}
	encode(precision, lat, lon) {
		return latLngToCell(lat, lon, precision);
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

