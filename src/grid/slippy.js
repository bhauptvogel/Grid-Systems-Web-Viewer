// helper
function ring(minX, maxX, minY, maxY) { return [[[minX, minY],[minX,maxY],[maxX,maxY],[maxX,minY],[minX,minY]]] }

const worldRadius = 6378137;
const originShift = Math.PI * worldRadius;

export class SlippyTilesGrid {
	mapToPrecision(zoom) {
		return Math.max(3, Math.floor(zoom+0.5));
	}
	polygonToCells(precision, polygon) {
		const results = [];
		// 1. Compute bounding box of the polygon
		let minLon = Infinity, maxLon = -Infinity;
		let minLat = Infinity, maxLat = -Infinity;
		for (const [lon, lat] of polygon) {
			if (lon < minLon) minLon = lon;
			if (lon > maxLon) maxLon = lon;
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
		}

		// 2. Determine tile index range for the bounding box
		const n = 2 ** precision;  // number of tiles horizontally at this zoom
		const minX = Math.floor(((minLon + 180) / 360) * n);
		const maxX = Math.floor(((maxLon + 180) / 360) * n);
		const minY = Math.floor(((1 - Math.log(Math.tan(maxLat * Math.PI/180) 
												+ 1/Math.cos(maxLat * Math.PI/180)) / Math.PI) / 2) * n);
		const maxY = Math.floor(((1 - Math.log(Math.tan(minLat * Math.PI/180) 
												+ 1/Math.cos(minLat * Math.PI/180)) / Math.PI) / 2) * n);

		// 3. Loop through candidate tiles in the range
		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				// 3a. Compute tile center coordinates (lon, lat)
				const lonCenter = (x + 0.5) / n * 360 - 180;
				const latCenterRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / n)));
				const latCenter = latCenterRad * 180 / Math.PI;

				// 4. Test if center point is inside the polygon
				if (pointInPolygon(lonCenter, latCenter, polygon)) {
					results.push(`${precision}/${x}/${y}`);
				}
			}
		}
		return results;

		// Helper: point-in-polygon test (even–odd ray-casting algorithm)
		function pointInPolygon(lon, lat, coords) {
			let inside = false;
			for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
				const xi = coords[i][0], yi = coords[i][1];
				const xj = coords[j][0], yj = coords[j][1];
				const intersects = ((yi > lat) !== (yj > lat)) &&
													 (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
				if (intersects) inside = !inside;
			}
			return inside;
		}
	}

	encode(precision, lat, lon) {
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
		return ring(minX, maxX, minY, maxY);
	}
}
