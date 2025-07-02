import cover from '@mapbox/tile-cover';

// helper
function cornersToRectanglePolygon(minX, maxX, minY, maxY) { return [[[minX, minY],[minX,maxY],[maxX,maxY],[maxX,minY],[minX,minY]]] }

const worldRadius = 6378137;
const originShift = Math.PI * worldRadius;

export class SlippyTilesGrid {
	mapToPrecision(zoom) {
		return Math.max(3, Math.floor(zoom+0.5));
	}
	polygonToCells(precision, polygon) {
		const geo = { type: 'Polygon', coordinates: [polygon] };
		const cells = cover.tiles(geo, { min_zoom: precision, max_zoom: precision });
		return cells.filter(cell => cell[2]===precision).map(cell => `${cell[2]}/${cell[0]}/${cell[1]}`);
	}
	encode(precision, lat, lon) {
		// WARNING: GPT-generated
		const MAX_LAT = 85.05112878;

		// Guardrails & input validation — don't silently wrap bad values.
		if (!Number.isFinite(lat) || !Number.isFinite(lon))
			throw new TypeError('lat and lon must be finite numbers');
		if (!Number.isInteger(precision) || precision < 0)
			throw new RangeError('precision must be a non-negative integer');

		// Clamp latitude to the Web-Mercator max
		lat = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);

		// Convert
		const n = 2 ** precision;                    // tiles per axis at this zoom
		const x = Math.floor((lon + 180) / 360 * n);

		const latRad = lat * Math.PI / 180;     // degrees → radians
		const y = Math.floor(
			(1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
		);
		return `${precision}/${x}/${y}`;
	}
	decode(id) {
		if(!(/^(\d+)\/(\d+)\/(\d+)$/.test(id))) throw new Error(`ID ${id} does not match a slippy id!`);
		const [precision, x, y] = id.split("/").map(Number);
		const resolution = (2 * originShift) / Math.pow(2,precision);
		const minX = -originShift + x * resolution;
		const maxX = -originShift + (x + 1) * resolution;
		const maxY = originShift - y * resolution;
		const minY = originShift - (y + 1) * resolution;
		return cornersToRectanglePolygon(minX, maxX, minY, maxY);
	}
}
