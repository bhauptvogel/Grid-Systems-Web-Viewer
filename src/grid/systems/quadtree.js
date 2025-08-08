import {SlippyTilesGrid} from "./slippy.js";

function slippyToQuadKey(z,x,y) {
		let quadKey = '';
		for (let i = z; i > 0; i--) {
			const mask = 1 << (i - 1);
			let digit = 0;
			if (x & mask) digit += 1;
			if (y & mask) digit += 2;
			quadKey += digit;
		}
		return quadKey;
}

export class QuadTreeGrid extends SlippyTilesGrid {
	polygonToCells(precision, polygon) {
		const slippyCells = super.polygonToCells(precision, polygon);
		return slippyCells.map(cell => slippyToQuadKey(cell.split('/')[0], cell.split('/')[1], cell.split('/')[2]));
	}
	encode(precision, lat, lon) {
		const slippyID = super.encode(precision, lat, lon);
		const [zRaw, xRaw, yRaw] = slippyID.split('/');
		return slippyToQuadKey(Number(zRaw), Number(xRaw), Number(yRaw));
	}
	decode(id) {
		if (id.length === 0) console.warn('QuadKey is empty');
		if(!(/^[0-3]{1,23}$/.test(id))) throw new Error(`ID ${id} does not match a QuadKey!`);

		let x = 0, y = 0;
		const z = id.length;
		for (let i = 0; i < z; i++) {
			const bit = z - i - 1;
			const mask = 1 << bit;
			const digit = id.charCodeAt(i) - 48;

			if (digit < 0 || digit > 3) {
				throw new RangeError('QuadKey may contain only digits 0–3.');
			}

			if (digit & 1) x |= mask;
			if (digit & 2) y |= mask;
		}

		return super.decode(`${z}/${x}/${y}`);
	}
}

