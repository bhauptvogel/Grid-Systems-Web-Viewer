import {SlippyTilesGrid} from "./slippy.js";


// Bing Maps
export class QuadTreeGrid extends SlippyTilesGrid {
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
	getPolygon(id) {
		const q = id;
		let x = 0, y = 0;
		for (const c of q) {                 // c is '0'‒'3'
			const d = c - 0;                   // fast toNumber
			x = (x << 1) |  (d & 1);           // bit-0 → X
			y = (y << 1) | ((d >> 1) & 1);     // bit-1 → Y
		}
		return super.getPolygon(`${q.length}/${x}/${y}`);
	}
}

