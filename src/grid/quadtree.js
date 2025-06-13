import {SlippyTilesGrid} from "./slippy.js";

function slippyToQuadKey(z,x,y) {
		// WARNING: function AI-generated
		let quadKey = '';
		for (let i = z; i > 0; i--) {
			const mask = 1 << (i - 1);
			let digit = 0;
			if (x & mask) digit += 1;      //   +1 if the x-bit is set
			if (y & mask) digit += 2;      //   +2 if the y-bit is set
			quadKey += digit;              // digit is 0,1,2,3
		}
		return quadKey;
}

// Bing Maps
export class QuadTreeGrid extends SlippyTilesGrid {
	polygonToCells(polygon) {
		const slippyCells = super.polygonToCells(polygon);
		return slippyCells.map(cell => slippyToQuadKey(cell.split('/')[0], cell.split('/')[1], cell.split('/')[2]));
	}
	encode(lat, lon) {
		const slippyID = super.encode(lat, lon);
		const [zRaw, xRaw, yRaw] = slippyID.split('/');
		return slippyToQuadKey(Number(zRaw), Number(xRaw), Number(yRaw));
	}
	decode(id) {
		if (id.length === 0) throw new Error('QuadKey must not be empty.');

		let x = 0, y = 0;
		const z = id.length;  // each digit represents one zoom level

		for (let i = 0; i < z; i++) {
			const bit = z - i - 1;   // position of the bit we’re setting
			const mask = 1 << bit;
			const digit = id.charCodeAt(i) - 48; // '0' => 0, … '3' => 3

			if (digit < 0 || digit > 3) {
				throw new RangeError('QuadKey may contain only digits 0–3.');
			}

			if (digit & 1) x |= mask;
			if (digit & 2) y |= mask;
		}

		return super.decode(`${z}/${x}/${y}`);
	}
}

