
// helper
function cornersToRectanglePolygon(minX, maxX, minY, maxY) { return [[[minX, minY],[minX,maxY],[maxX,maxY],[maxX,minY],[minX,minY]]] }

const worldRadius = 6378137;
const originShift = Math.PI * worldRadius;

export class SlippyTilesGrid {
	constructor(map) { this.map = map };
	precision() {
		return Math.max(3, Math.floor(this.map.getView().getZoom()+0.5));
	}
	bboxes(minLat, minLon, maxLat, maxLon) {
		// TODO: render all tiles when precision <= 3
		const polygons = [];
		const swCoords = this.encode(minLat, minLon).split("/").map(Number);
		const neCoords = this.encode(maxLat, maxLon).split("/").map(Number);
		for (let x = swCoords[1]; x < neCoords[1]+1; x++) {
			for (let y = neCoords[2]; y < swCoords[2]+1; y++) {
				polygons.push(`${this.precision()}/${x}/${y}`);
			}
		}
		return polygons;
	}
	encode(lat, lon) {
		// WARNING: GPT-generated
		const zoom = this.precision();
		const MAX_LAT = 85.05112878;

		// Guardrails & input validation — don't silently wrap bad values.
		if (!Number.isFinite(lat) || !Number.isFinite(lon))
			throw new TypeError('lat and lon must be finite numbers');
		if (!Number.isInteger(zoom) || zoom < 0)
			throw new RangeError('zoom must be a non-negative integer');

		// Clamp latitude to the Web-Mercator max
		lat = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);

		// Convert
		const n = 2 ** zoom;                    // tiles per axis at this zoom
		const x = Math.floor((lon + 180) / 360 * n);

		const latRad = lat * Math.PI / 180;     // degrees → radians
		const y = Math.floor(
			(1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
		);
		return `${this.precision()}/${x}/${y}`;
	}
	decode(id) {
		const [zoom, x, y] = id.split("/").map(Number);
		const resolution = (2 * originShift) / Math.pow(2,zoom);
		const minX = -originShift + x * resolution;
		const maxX = -originShift + (x + 1) * resolution;
		const maxY = originShift - y * resolution;
		const minY = originShift - (y + 1) * resolution;
		return cornersToRectanglePolygon(minX, maxX, minY, maxY);
	}
}
