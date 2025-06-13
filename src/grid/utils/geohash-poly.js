// WARNING: AI-generated
import geohash from 'ngeohash';
import {
  bbox as turfBbox,
  booleanPointInPolygon,
  booleanPointOnLine,
  centroid as turfCentroid,
  intersect,
  lineString as turfLineString,
  point,
  polygon as turfPolygon,
  multiPolygon as turfMultiPolygon
} from '@turf/turf';

/* ----------  helpers  ---------- */

/** Accepts a bare ring, polygon array, or multipolygon array and returns a
 *  proper GeoJSON Polygon / MultiPolygon feature. */
function coordsToGeoJSON(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new TypeError('coords must be a non-empty array');
  }
  // ring  = [ [lon,lat], … ]
  if (typeof raw[0][0] === 'number') {
    const ring = raw.slice();
    const first = ring[0], last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]); // close ring
    return turfPolygon([ring]);
  }
  // polygon = [ ring, … ]
  if (typeof raw[0][0][0] === 'number') return turfPolygon(raw);
  // multipolygon
  return turfMultiPolygon(raw);
}

/* ----------  main  ---------- */

/** Return every geohash (precision `p`) whose centre lies inside *or* whose
 *  bbox intersects/touches the supplied polygon.
 *
 *  @param {Array}  coords     ring | polygon | multipolygon coordinates
 *  @param {number} p          geohash precision (1–12, default 6)
 *  @returns {string[]}        unique geohash list
 */
export function polygonToGeohashCells(coords, p = 6) {
  const geo = coordsToGeoJSON(coords);

  /* global bbox   [minLon, minLat, maxLon, maxLat] */
  const [minLon, minLat, maxLon, maxLat] = turfBbox(geo);

  /* seed cell = one that contains the polygon centroid */
  const { geometry: { coordinates: [cLon, cLat] } } = turfCentroid(geo);
  const seed = geohash.encode(cLat, cLon, p);

  const queue   = [seed];
  const visited = new Set();
  const hits    = new Set();

  const DIRS = [ [ 1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1] ];

  while (queue.length) {
    const h = queue.pop();
    if (visited.has(h)) continue;
    visited.add(h);

    const [minLatH, minLonH, maxLatH, maxLonH] = geohash.decode_bbox(h);

    /* reject cells wholly outside the global bbox */
    if (maxLatH < minLat || minLatH > maxLat || maxLonH < minLon || minLonH > maxLon) {
      continue;
    }

    /* ---------------  tests --------------- */

    const centre = geohash.decode(h);
    const pt     = point([centre.longitude, centre.latitude]);

    let keep =
      booleanPointInPolygon(pt, geo) ||             // centre in poly
      booleanPointOnLine(pt, turfLineString(coords.flat(2))) // centre touches edge
      ;

    if (!keep) {                                    // heavy test: bbox ∩ poly
      const cellPoly = turfPolygon([[
        [minLonH, maxLatH],
        [maxLonH, maxLatH],
        [maxLonH, minLatH],
        [minLonH, minLatH],
        [minLonH, maxLatH]
      ]]);
      try { keep = Boolean(intersect(cellPoly, geo)); }
      // Turf may still throw on degenerate geometries
      catch { keep = false; }
    }

    if (keep) hits.add(h);

    /* always expand neighbours *if they touch the global bbox* */
    for (const d of DIRS) {
      const n = geohash.neighbor(h, d);
      if (!n || visited.has(n)) continue;
      const [mnLat, mnLon, mxLat, mxLon] = geohash.decode_bbox(n);
      const overlaps =
        !(mxLat < minLat || mnLat > maxLat || mxLon < minLon || mnLon > maxLon);
      if (overlaps) queue.push(n);
    }
  }

  return [...hits];
}

