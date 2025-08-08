import {fromLonLat} from 'ol/proj.js';
import geohash from 'ngeohash';

export class GeohashGrid {
	mapToPrecision(zoom) {
		const metresPerPixel = 156543.03392804097 / (2 ** (zoom+0.5));
		const desired = metresPerPixel * 200;
		const sizes = [5009400, 626000, 78000, 19500, 2440, 610, 76, 19, 2.4]; 
		return sizes.findIndex(s => s < desired) + 1 || 9;
	}
	polygonToCells(precision, polygon) {
		if(precision == 0) return [];
    // Compute bounding box of the polygon (min/max lon and lat)
    let minLon = Infinity, minLat = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity;
    for (const [lon, lat] of polygon) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    // Get all geohash candidates within the bounding box at the given precision
    const candidates = geohash.bboxes(minLat, minLon, maxLat, maxLon, precision);

    // Helper function: Ray-casting algorithm for point-in-polygon test
    function pointInPolygon(lon, lat, poly) {
      let inside = false;
      // If polygon is closed (first point == last point), ignore the duplicate last vertex
      let n = poly.length;
      if (n === 0) return false;
      if (poly[0][0] === poly[n-1][0] && poly[0][1] === poly[n-1][1]) {
        n -= 1;
      }
      // Loop through each edge of the polygon
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        const intersects = ((yi > lat) !== (yj > lat)) 
                        && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersects) inside = !inside;
      }
      return inside;
    }

    // Check each candidate geohash's center point against the polygon
    const result = [];
    for (const hash of candidates) {
      const { latitude, longitude } = geohash.decode(hash);
      if (pointInPolygon(longitude, latitude, polygon)) {
        result.push(hash);
      }
    }
    return result;
  }
	encode(precision, lat, lon) {
		return geohash.encode(lat, lon, precision);
	}
	decode(id) {
		if(!(/^[0-9bcdefghjkmnpqrstuvwxyz]{1,12}$/.test(id))) throw new Error(`ID ${id} does not match a geohash!`);
		const bbox = geohash.decode_bbox(id);
		return [[
				fromLonLat([bbox[1], bbox[0]]),
				fromLonLat([bbox[3], bbox[0]]),
				fromLonLat([bbox[3], bbox[2]]),
				fromLonLat([bbox[1], bbox[2]]),
				fromLonLat([bbox[1], bbox[0]]),
			]];
	}
}
