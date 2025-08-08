// antimeridian-split.js
// --------------------------------------------------------------
//  Pure-JS utilities to (a) detect >180° width, (b) split the
//  ring in two at the mid-longitude
//

/* ---------- helpers --------------------------------------------------- */

// normalise into canonical −180 … +180 range
function normLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

// quick sanity: ring must be closed and have ≥ 3 vertices
function assertRing(ring) {
  if (ring.length < 4) throw new Error('ring must have ≥3 vertices + closure');
  const a = ring[0], b = ring[ring.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) throw new Error('ring must be closed (first === last)');
}

/* ---------- width test ------------------------------------------------ */

export function isWiderThan180(ring) {
  assertRing(ring);
  const lons = ring.map(p => normLon(p[0]));
  const span = Math.max(...lons) - Math.min(...lons);   // raw box width
  return span > 180;
}

/* ---------- split at mid-longitude ----------------------------------- */

function sideOfCut(lon, cutLon) {
  // returns -1 (west) or +1 (east) w.r.t. the vertical cut,
  // accounting for wrap-around so that side changes only once
  const delta = normLon(lon - cutLon);
  return delta >= 0 ? 1 : -1;
}

/**
 * Split a single closed ring that is known to be >180° wide.
 * Returns [westRing, eastRing] – both closed and within ±180°.
 */
export function splitWidePolygon(ring) {
  assertRing(ring);
  if (!isWiderThan180(ring)) return [ring];            // nothing to do

  // work with normalised longitudes
  const norm = ring.map(p => [normLon(p[0]), p[1]]);
  const lons  = norm.map(p => p[0]);
  const min   = Math.min(...lons);
  const max   = Math.max(...lons);
  const cut   = (min + max) / 2;                       // mid-longitude of raw span

  const west = [];
  const east = [];

  for (let i = 0; i < norm.length - 1; i++) {
    const p = norm[i], q = norm[i + 1];
    const sP = sideOfCut(p[0], cut);
    const sQ = sideOfCut(q[0], cut);

    // edge crosses the cut-line – find the intersection
    if (sP !== sQ) {
      // unwrap lon so the segment is monotonic
      let [lonP, latP] = p;
      let [lonQ, latQ] = q;
      if (lonQ - lonP > 180) lonQ -= 360;
      if (lonQ - lonP < -180) lonQ += 360;

      let c = cut;
      if (c - lonP > 180) c -= 360;
      if (c - lonP < -180) c += 360;

      const t   = (c - lonP) / (lonQ - lonP);
      const lat = latP + t * (latQ - latP);
      const ipt = [normLon(cut), lat];                 // intersection point

      west.push(ipt);
      east.push(ipt);
    }

    // push the true vertex onto its side
    (sQ < 0 ? west : east).push(q);
  }

  // close the two rings
  if (west[west.length - 1][0] !== west[0][0] ||
      west[west.length - 1][1] !== west[0][1]) west.push(west[0]);
  if (east[east.length - 1][0] !== east[0][0] ||
      east[east.length - 1][1] !== east[0][1]) east.push(east[0]);

  return [west, east];
}
