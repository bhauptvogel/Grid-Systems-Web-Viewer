import {toLonLat, fromLonLat} from 'ol/proj.js';

import geohash from 'ngeohash';
const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export class GeohashGrid {
	constructor(map) { this.map = map };
	// # of characters of geohash (analogous to zoom)
	_precision() { return 1 + Math.floor(this.map.getView().getZoom()/3); }
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

		const view = this.map.getView();
		const viewExtent = view.calculateExtent(this.map.getSize());
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
	getPolygon(id) {
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
