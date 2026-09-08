/**
 * Review a GPX trace and repair defects before corner detection.
 *
 * The converter files ship a two-point start/finish tick plus two complete
 * laps. The DEM-enriched files flatten that same content into one segment.
 * Either form will invent a hairpin at the join and put start/finish on the
 * wrong straight if it is handed to the corner pipeline as-is.
 *
 * This module fixes what it can and throws when a single closed lap cannot
 * be isolated. Testing-only; the app never reads it.
 */
export const MIN_LAP_POINTS = 20;
export const MAX_CLOSURE_M = 30;
export const MAX_LENGTH_ERROR = 0.03;
export const MIN_STUB_POINTS = 2;
export const MAX_STUB_POINTS = 6;
export const MIN_SF_STUB_M = 8;
export const MAX_SF_STUB_M = 80;
export const SF_NEAR_LAP_M = 8;
export const SF_PERPENDICULAR_DEG = 25;

const R = 6371000;
const rad = Math.PI / 180;

export function metres(a, b) {
  const dy = (b.lat - a.lat) * rad * R;
  const dx = (b.lon - a.lon) * rad * R * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(dx, dy);
}

function bearingDeg(a, b) {
  const dy = (b.lat - a.lat) * rad * R;
  const dx = (b.lon - a.lon) * rad * R * Math.cos(((a.lat + b.lat) / 2) * rad);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function wrap180(deg) {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function pathLength(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += metres(points[i - 1], points[i]);
  return n;
}

function midpoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
}

function nearestOn(points, target) {
  let best = { i: 0, d: Infinity };
  for (let i = 0; i < points.length; i++) {
    const d = metres(target, points[i]);
    if (d < best.d) best = { i, d };
  }
  return best;
}

export function parseAllSegments(gpxXml) {
  const segments = [];
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let segMatch;
  while ((segMatch = segRe.exec(gpxXml))) {
    const pts = [];
    const ptRe = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
    let ptMatch;
    while ((ptMatch = ptRe.exec(segMatch[1]))) {
      const lat = Number((/lat="([^"]+)"/i.exec(ptMatch[1]) || [])[1]);
      const lon = Number((/lon="([^"]+)"/i.exec(ptMatch[1]) || [])[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const body = ptMatch[2] || '';
      const ele = Number((/<ele>([^<]*)<\/ele>/i.exec(body) || [])[1]);
      const time = (/<time>([^<]*)<\/time>/i.exec(body) || [])[1] || null;
      pts.push({
        lat,
        lon,
        ele: Number.isFinite(ele) ? ele : 0,
        time,
      });
    }
    if (pts.length >= MIN_STUB_POINTS) segments.push(pts);
  }
  return segments;
}

export function parseWaypoints(gpxXml) {
  const items = [];
  const re = /<wpt\s+([^>]+)>([\s\S]*?)<\/wpt>/gi;
  let match;
  while ((match = re.exec(gpxXml))) {
    const lat = Number((/lat="([^"]+)"/i.exec(match[1]) || [])[1]);
    const lon = Number((/lon="([^"]+)"/i.exec(match[1]) || [])[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const body = match[2] || '';
    const name = (/<name>([^<]*)<\/name>/i.exec(body) || [])[1] || '';
    const cmt = (/<cmt>([^<]*)<\/cmt>/i.exec(body) || [])[1] || '';
    const desc = (/<desc>([^<]*)<\/desc>/i.exec(body) || [])[1] || '';
    items.push({
      lat,
      lon,
      name: name || cmt || desc || '',
      meta: [name, cmt, desc].filter(Boolean).join(' | '),
    });
  }
  return items;
}

export function parseTrackName(gpxXml) {
  const trk = /<trk>([\s\S]*?)<\/trk>/i.exec(gpxXml);
  if (!trk) return '';
  return (/<name>([^<]*)<\/name>/i.exec(trk[1]) || [])[1] || '';
}

function measure(points) {
  return {
    points,
    lengthM: pathLength(points),
    closureM: metres(points[0], points[points.length - 1]),
  };
}

/**
 * Split a flattened multi-lap run at returns to the start.
 *
 * The first crossing is often still approaching, so the closest point in
 * that cluster becomes the join.
 */
export function splitAtReturns(points) {
  const start = points[0];
  const laps = [];
  let from = 0;
  for (let i = MIN_LAP_POINTS; i < points.length; i++) {
    if (metres(start, points[i]) >= MAX_CLOSURE_M || i - from < MIN_LAP_POINTS) continue;
    let best = i;
    let bestD = metres(start, points[i]);
    for (let j = i + 1; j < points.length && j - i <= 8; j++) {
      const d = metres(start, points[j]);
      if (d >= MAX_CLOSURE_M) break;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    laps.push(points.slice(from, best + 1));
    from = best;
    i = best;
  }
  if (points.length - from >= MIN_LAP_POINTS) laps.push(points.slice(from));
  return laps.length > 1 ? laps : [points];
}

function dropDuplicateClose(points) {
  if (points.length < 3) return points;
  if (metres(points[0], points[points.length - 1]) < 1) return points.slice(0, -1);
  return points;
}

function isStartFinishStub(stub, lap) {
  if (stub.length < MIN_STUB_POINTS || stub.length > MAX_STUB_POINTS) return false;
  const len = pathLength(stub);
  if (len < MIN_SF_STUB_M || len > MAX_SF_STUB_M) return false;
  const mid = midpoint(stub[0], stub[stub.length - 1]);
  const near = nearestOn(lap, mid);
  if (near.d > SF_NEAR_LAP_M) return false;
  // Converter files draw the tick on the lap seam. Mid-trace stubs are
  // kinks and cut-throughs, not start/finish lines.
  const onSeam = near.i <= 3 || near.i >= lap.length - 4;
  if (!onSeam) return false;
  const i0 = Math.max(0, near.i - 1);
  const i1 = Math.min(lap.length - 1, near.i + 1);
  if (i0 === i1) return false;
  const stubH = bearingDeg(stub[0], stub[stub.length - 1]);
  const lapH = bearingDeg(lap[i0], lap[i1]);
  const perp = Math.abs(Math.abs(wrap180(stubH - lapH)) - 90);
  return perp <= SF_PERPENDICULAR_DEG;
}

function pickLap(candidates, expectedLengthM) {
  const scored = candidates.map(measure).map((lap) => ({
    ...lap,
    lengthError: expectedLengthM
      ? Math.abs(lap.lengthM / expectedLengthM - 1)
      : 0,
  }));
  const closed = scored.filter((lap) => lap.closureM <= MAX_CLOSURE_M);
  if (!closed.length) return { chosen: null, scored };
  const onLength = closed.filter((lap) => lap.lengthError <= MAX_LENGTH_ERROR);
  const pool = [...(onLength.length ? onLength : closed)].sort(
    (a, b) => b.points.length - a.points.length
  );
  return { chosen: pool[0], scored, offLength: onLength.length === 0 };
}

/**
 * Repair a GPX document into one closed lap plus any start/finish waypoint.
 *
 * `expectedLengthM` is optional. When present it only breaks ties between
 * otherwise closed laps; it is never required for the detector to run.
 */
export function reviewAndRepairGpx(gpxXml, options = {}) {
  const expectedLengthM = Number.isFinite(options.expectedLengthM)
    ? options.expectedLengthM
    : null;
  const xml = String(gpxXml || '').replace(/^\uFEFF/, '');
  const fixes = [];
  const warnings = [];

  const segments = parseAllSegments(xml);
  if (!segments.length) {
    throw new Error('GPX review found no <trkseg> trackpoints');
  }

  const laps = segments.filter((s) => s.length >= MIN_LAP_POINTS);
  const stubs = segments.filter((s) => s.length < MIN_LAP_POINTS);
  const waypoints = parseWaypoints(xml);
  const trackName = parseTrackName(xml);

  const referenceLap = laps.reduce((a, b) => (b.length > a.length ? b : a), laps[0] || []);
  const sfStubs = referenceLap.length
    ? stubs.filter((stub) => isStartFinishStub(stub, referenceLap))
    : [];
  for (const stub of sfStubs) {
    const mark = midpoint(stub[0], stub[stub.length - 1]);
    waypoints.push({
      lat: mark.lat,
      lon: mark.lon,
      name: 'start/finish',
      meta: 'extracted from perpendicular GPX stub',
    });
    fixes.push(
      `promoted a ${pathLength(stub).toFixed(0)}m perpendicular stub to a start/finish waypoint`
    );
  }
  const droppedStubs = stubs.length - sfStubs.length;
  if (droppedStubs) fixes.push(`dropped ${droppedStubs} non-lap stub segment(s)`);

  let candidates;
  let source;
  if (laps.length > 1) {
    candidates = laps;
    source = 'segments';
    fixes.push(`chose one lap from ${laps.length} track segments`);
  } else if (laps.length === 1) {
    const split = splitAtReturns(laps[0]);
    candidates = split;
    source = split.length > 1 ? 'split at returns' : 'single lap';
    if (split.length > 1) fixes.push(`split a flattened ${laps[0].length}-point trace into ${split.length} laps`);
  } else {
    throw new Error(
      `GPX review found only stub segments (${stubs.map((s) => s.length).join(', ')} points); no lap`
    );
  }

  let { chosen, scored, offLength } = pickLap(candidates, expectedLengthM);
  if (!chosen) {
    chosen = [...scored].sort((a, b) => b.lengthM - a.lengthM)[0];
    warnings.push(
      `no lap closes within ${MAX_CLOSURE_M}m; using the longest trace ` +
        `(${chosen.points.length}pts, ${(chosen.lengthM / 1000).toFixed(2)}km, ` +
        `closure ${chosen.closureM.toFixed(0)}m)`
    );
  }
  if (offLength && expectedLengthM) {
    warnings.push(
      `chosen lap is ${(chosen.lengthError * 100).toFixed(1)}% off the expected ` +
        `${(expectedLengthM / 1000).toFixed(2)}km`
    );
  }

  let points = dropDuplicateClose(chosen.points);
  if (points.length !== chosen.points.length) {
    fixes.push('dropped a duplicated closing trackpoint');
  }
  if (points.length < MIN_LAP_POINTS) {
    throw new Error(`GPX review left only ${points.length} points after repair`);
  }

  const alreadyClean = !fixes.length;
  if (alreadyClean) fixes.push('trace is already a single closed lap');

  return {
    points,
    waypoints,
    trackName,
    fixes,
    warnings,
    review: {
      source,
      segmentCount: segments.length,
      stubCount: stubs.length,
      lapCandidates: candidates.length,
      chosenPoints: points.length,
      chosenLengthM: Math.round(pathLength(points) * 10) / 10,
      closureM: Math.round(metres(points[0], points[points.length - 1]) * 10) / 10,
      startFinishWaypoints: waypoints.filter((w) =>
        /\b(start|finish|start\/finish|s\/f)\b/i.test(`${w.name} ${w.meta}`)
      ).length,
    },
  };
}
