import {SlippyTilesGrid} from "./grid/slippy.js";
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
