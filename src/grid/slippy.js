
// helper
function cornersToRectanglePolygon(minX, maxX, minY, maxY) { return [[[minX, minY],[minX,maxY],[maxX,maxY],[maxX,minY],[minX,minY]]] }

const worldRadius = 6378137;
const originShift = Math.PI * worldRadius;

export class SlippyTilesGrid {
	constructor(map) { this.map = map };
	_zoom() {
		return Math.max(3, Math.floor(this.map.getView().getZoom()+0.5));
	}
	_getTile(coordinates) {
		const tileCount = Math.pow(2,this._zoom());
		const resolution = (originShift * 2) / tileCount;

		const xTile = Math.floor((coordinates[0] + originShift) / resolution);
		const yTile = Math.floor((originShift - coordinates[1]) / resolution);

		return { xTile, yTile };
	}
	gridPolygons() {
		const polygons = [];

		const view = this.map.getView();
		const viewExtent = view.calculateExtent(this.map.getSize());
		const tileCount = Math.pow(2,this._zoom());
		const resolution = (2 * originShift) / tileCount;
		 
		// slippy tile definition: Northwest = [0,0]
		const nwCoords = this._getTile([viewExtent[0], viewExtent[3]]);
		const seCoords = this._getTile([viewExtent[2], viewExtent[1]]);
		for (let x = nwCoords.xTile; x < seCoords.xTile+1; x++) {
			for (let y = nwCoords.yTile; y < seCoords.yTile+1; y++) {
				const minX = -originShift + x * resolution;
				const maxX = -originShift + (x + 1) * resolution;
				const maxY = originShift - y * resolution;
				const minY = originShift - (y + 1) * resolution;
				polygons.push(cornersToRectanglePolygon(minX, maxX, minY, maxY));
			}
		}
		return polygons;
	}
	getID(coordinates) {
		const tile = this._getTile(coordinates);
		return `${this._zoom()}/${tile.xTile}/${tile.yTile}`;
	}
	getPolygon(id) {
		const [zoom, x, y] = id.split("/").map(Number);
		const resolution = (2 * originShift) / Math.pow(2,zoom);
		const minX = -originShift + x * resolution;
		const maxX = -originShift + (x + 1) * resolution;
		const maxY = originShift - y * resolution;
		const minY = originShift - (y + 1) * resolution;
		return cornersToRectanglePolygon(minX, maxX, minY, maxY);
	}
}
