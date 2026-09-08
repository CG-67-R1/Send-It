import fs from 'node:fs';
import path from 'node:path';

import { reviewAndRepairGpx } from './gpx-trace-review.mjs';
import { longestStraight, turnEvents, turnRate } from './track-geometry.mjs';

/**
 * Frozen after the last-pass confirmation on 2026-09-08.
 * Do not change detection, refinement, numbering, or review without an explicit unlock.
 */
export const GPX_CORNER_DETECTOR_LOCKED = Object.freeze({
  frozen: true,
  frozenAt: '2026-09-08',
  reason: 'Last-pass confirmation after Mallala SVG rebuild and GPX preflight.',
});

const DEG_PER_RAD = 180 / Math.PI;
const EARTH_RADIUS_M = 6371000;

/**
 * When a rotation of the numbering explains this much more of the curated hands,
 * the numbering origin is wrong rather than the hands.
 *
 * A share rather than a count, because hand sequences repeat: a small absolute
 * gain on a short verified set is usually a coincidental match, not an offset.
 */
export const MISALIGNED_NUMBERING_GAIN_SHARE = 0.4;
/** Curated hands needed before an alignment verdict means anything. */
export const MIN_VERIFIED_HANDS_FOR_ALIGNMENT = 3;
/**
 * Straight needed ahead of Turn 1 before a curated offset is believable.
 *
 * A start/finish line sits on the main straight, so an offset that names a Turn 1
 * running out of the previous corner is describing a lap that cannot exist. Mac
 * Park's hand-derived offset scored a perfect 10/10 and put start/finish in a
 * sub-60m infield gap, so gap length is the check that catches what hands cannot.
 */
export const MIN_START_STRAIGHT_M = 60;

export const RIDER_PROFILE = Object.freeze({
  id: 'rider',
  spacingM: 2,
  smoothWindowM: 16,
  turnWindowM: 12,
  rateFloorDegPerM: 0.1,
  mergeGapM: 10,
  minSweptDeg: 12,
  minCornerLengthM: 10,
  minHeadingDeg: 14,
  artifactRadiusM: 12,
  weakEventDegMax: 20,
  weakEventLenM: 28,
  weakEventGapM: 12,
  spikeOppDegMax: 28,
  spikeOppLenM: 36,
  spikeGapM: 10,
  sameHandMergeGapM: 6,
  oppositePairDegMax: 75,
  oppositePairLenM: 30,
  oppositePairGapM: 6,
  seamSpikeLenM: 30,
  seamSpikeDegMin: 220,
  seamMergeGapM: 40,
  underSegDensityMaxPerKm: 3.5,
  underSegLargeEventMin: 3,
  underSegTinyEventMax: 1,
  compoundSplitMinDeg: 170,
  compoundSplitMaxLenM: 320,
  compoundSplitPartsMax: 3,
  compoundSplitPartMinLenM: 55,
  enrichRateFloorScale: 0.82,
  enrichMinDegScale: 0.72,
  enrichMergeGapScale: 0.8,
  enrichMinEventDeg: 24,
  enrichMinSeparationM: 60,
  constrainMinSideM: 25,
  chicaneGapM: 40,
  kinkMaxAngleDeg: 26,
  kinkMinRadiusM: 110,
  hairpinMinAngleDeg: 145,
  hairpinMaxRadiusM: 70,
  sweeperMinLengthM: 180,
  sweeperMinRadiusM: 90,
});

export class GateFailure extends Error {
  constructor(stage, message, report = []) {
    super(message);
    this.name = 'GateFailure';
    this.stage = stage;
    this.report = report;
  }
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function assert(condition, stage, message) {
  if (!condition) throw new GateFailure(stage, message);
}

function runGate(report, stage, fn, detailsFromValue) {
  const started = Date.now();
  try {
    const value = fn();
    const gate = {
      stage,
      status: 'pass',
      elapsedMs: Date.now() - started,
    };
    if (detailsFromValue) gate.details = detailsFromValue(value);
    report.push(gate);
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const gate = {
      stage,
      status: 'fail',
      elapsedMs: Date.now() - started,
      error: message,
    };
    report.push(gate);
    throw new GateFailure(stage, message, [...report]);
  }
}

function parseAttr(text, attr) {
  const match = new RegExp(`${attr}="([^"]+)"`, 'i').exec(text);
  return match ? match[1] : null;
}

function parseBodyTag(text, tagName) {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i').exec(text);
  return match ? String(match[1]).trim() : '';
}

function parseWaypoints(gpxXml) {
  const items = [];
  const re = /<wpt\s+([^>]+)>([\s\S]*?)<\/wpt>/gi;
  let match;
  while ((match = re.exec(gpxXml))) {
    const lat = Number(parseAttr(match[1], 'lat'));
    const lon = Number(parseAttr(match[1], 'lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const body = match[2] || '';
    const name = parseBodyTag(body, 'name');
    const cmt = parseBodyTag(body, 'cmt');
    const desc = parseBodyTag(body, 'desc');
    items.push({
      lat,
      lon,
      name: name || cmt || desc || '',
      meta: [name, cmt, desc].filter(Boolean).join(' | '),
    });
  }
  return items;
}

function parseTrackName(gpxXml) {
  const trkMatch = /<trk>([\s\S]*?)<\/trk>/i.exec(gpxXml);
  if (!trkMatch) return '';
  return parseBodyTag(trkMatch[1], 'name');
}

function parseTrackSegments(gpxXml) {
  const segments = [];
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let segMatch;
  while ((segMatch = segRe.exec(gpxXml))) {
    const pts = [];
    const ptRe = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
    let ptMatch;
    while ((ptMatch = ptRe.exec(segMatch[1]))) {
      const lat = Number(parseAttr(ptMatch[1], 'lat'));
      const lon = Number(parseAttr(ptMatch[1], 'lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const body = ptMatch[2] || '';
      const eleText = parseBodyTag(body, 'ele');
      const timeText = parseBodyTag(body, 'time');
      const ele = Number(eleText);
      pts.push({
        lat,
        lon,
        ele: Number.isFinite(ele) ? ele : 0,
        time: timeText || null,
      });
    }
    if (pts.length >= 8) segments.push(pts);
  }
  return segments;
}

function haversineM(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(aa));
}

function pickBestSegment(segments) {
  let best = segments[0];
  let bestScore = -Infinity;
  for (const segment of segments) {
    const first = segment[0];
    const last = segment[segment.length - 1];
    const closeM = haversineM(first, last);
    const closedBonus = closeM < 80 ? 600000 : 0;
    const score = closedBonus + segment.length - closeM * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = segment;
    }
  }
  return best;
}

function projectToLocalMeters(points, origin = points[0]) {
  const cosLat = Math.cos(toRad(origin.lat));
  return points.map((p) => ({
    x: toRad(p.lon - origin.lon) * EARTH_RADIUS_M * cosLat,
    y: toRad(p.lat - origin.lat) * EARTH_RADIUS_M,
    z: Number.isFinite(p.ele) ? p.ele : 0,
  }));
}

function projectWaypointToLocalMeters(wpt, origin) {
  const cosLat = Math.cos(toRad(origin.lat));
  return {
    x: toRad(wpt.lon - origin.lon) * EARTH_RADIUS_M * cosLat,
    y: toRad(wpt.lat - origin.lat) * EARTH_RADIUS_M,
    name: wpt.name,
    meta: wpt.meta,
  };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function heading(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function cumulativeDistance(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + distance(points[i - 1], points[i]));
  }
  return out;
}

function openPathLength(points) {
  if (points.length < 2) return 0;
  const cum = cumulativeDistance(points);
  return cum[cum.length - 1];
}

function closedPathLength(points) {
  if (points.length < 2) return 0;
  return openPathLength(points) + distance(points[points.length - 1], points[0]);
}

function bodyMedianStep(points) {
  const steps = [];
  for (let i = 1; i < points.length; i++) steps.push(distance(points[i - 1], points[i]));
  if (!steps.length) return 10;
  const sorted = [...steps].sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor(sorted.length * 0.85));
  return median(sorted.slice(0, cut)) || 10;
}

function dropFarEndJumps(points) {
  if (points.length < 12) return points;
  if (distance(points[0], points[points.length - 1]) < 20) return points;
  let out = points.slice();
  for (let guard = 0; guard < 8 && out.length > 24; guard++) {
    const limit = Math.max(100, bodyMedianStep(out) * 8);
    const tail = distance(out[out.length - 2], out[out.length - 1]);
    let changed = false;
    if (tail > limit) {
      out = out.slice(0, -1);
      changed = true;
    }
    if (out.length > 24 && distance(out[0], out[1]) > limit) {
      out = out.slice(1);
      changed = true;
    } else if (
      out.length > 26 &&
      distance(out[0], out[1]) < 50 &&
      distance(out[1], out[2]) > limit
    ) {
      out = out.slice(1);
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

function findReturnToStart(points) {
  const cum = cumulativeDistance(points);
  const n = points.length;
  const total = cum[cum.length - 1];
  if (n < 32 || total < 1200) return null;

  const closureGapLimit = Math.min(130, Math.max(55, total * 0.02));
  const startHeading = heading(points[0], points[Math.min(n - 1, 4)]);
  let best = null;
  for (let end = 24; end < n - 4; end++) {
    const travel = cum[end];
    if (travel < Math.max(700, total * 0.42)) continue;
    if (travel > total * 0.88) break;
    const gap = distance(points[0], points[end]);
    if (gap > closureGapLimit) continue;
    const endHeading = heading(points[Math.max(0, end - 4)], points[end]);
    const hDiff = Math.abs(angleDelta(startHeading, endHeading));
    if (hDiff > 1.35) continue;

    // A real lap return should continue with a similar path shape for a few
    // points; a random crossover usually will not.
    if (end + 6 >= n) continue;
    let alignSum = 0;
    let alignCount = 0;
    for (let k = 0; k < 6; k++) {
      alignSum += distance(points[k], points[end + k]);
      alignCount += 1;
    }
    const align = alignCount ? alignSum / alignCount : Infinity;
    if (align > Math.max(45, gap * 1.8)) continue;

    const score = gap + hDiff * 10 + align * 0.3 + travel * 0.0002;
    if (!best || score < best.score) best = { start: 0, end, travel, gap, score };
  }
  return best;
}

function findAutonomousLapSlice(points) {
  const cum = cumulativeDistance(points);
  const n = points.length;
  const total = cum[cum.length - 1];
  if (n < 32 || total < 1000) return null;

  const stride = Math.max(1, Math.floor(n / 120));
  const minTravel = Math.max(700, total * 0.43);
  const maxGap = Math.min(140, Math.max(85, total * 0.025));
  let best = null;

  for (let start = 0; start < n * 0.65; start += stride) {
    const startHeading = heading(points[start], points[Math.min(n - 1, start + 4)]);
    for (let end = start + 20; end < n; end++) {
      const travel = cum[end] - cum[start];
      if (travel < minTravel) continue;
      if (travel > total * 0.99) break;
      const gap = distance(points[start], points[end]);
      if (gap > maxGap) continue;
      const endHeading = heading(points[Math.max(start, end - 4)], points[end]);
      const hDiff = Math.abs(angleDelta(startHeading, endHeading));
      if (hDiff > 1.35) continue;
      const quality = gap + hDiff * 15;
      if (
        !best ||
        travel < best.travel - 25 ||
        (Math.abs(travel - best.travel) <= 25 && quality < best.quality)
      ) {
        best = { start, end, travel, gap, quality };
      }
    }
  }
  return best;
}

function trackSpan(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

function findRepeatedLapSlice(points) {
  const n = points.length;
  if (n < 120) return null;
  const span = trackSpan(points);
  if (!Number.isFinite(span) || span < 60) return null;

  const lagMin = Math.max(40, Math.floor(n * 0.35));
  const lagMax = Math.min(n - 30, Math.floor(n * 0.7));
  const lagStep = Math.max(1, Math.floor(n / 180));
  let bestLag = null;

  for (let lag = lagMin; lag <= lagMax; lag += lagStep) {
    const count = Math.min(90, n - lag, lag);
    if (count < 24) continue;
    const dists = [];
    for (let i = 0; i < count; i++) {
      dists.push(distance(points[i], points[i + lag]));
    }
    const med = median(dists);
    if (!bestLag || med < bestLag.med) bestLag = { lag, med };
  }

  if (!bestLag) return null;
  const similarityThreshold = Math.max(12, span * 0.03);
  if (bestLag.med > similarityThreshold) return null;

  const cum = cumulativeDistance(points);
  const startHeading = heading(points[0], points[Math.min(n - 1, 4)]);
  const window = Math.max(8, Math.floor(n * 0.08));
  const lo = Math.max(24, bestLag.lag - window);
  const hi = Math.min(n - 6, bestLag.lag + window);
  const gapLimit = Math.max(80, span * 0.06);

  let best = null;
  for (let end = lo; end <= hi; end++) {
    const gap = distance(points[0], points[end]);
    if (gap > gapLimit) continue;
    const endHeading = heading(points[Math.max(0, end - 4)], points[end]);
    const hDiff = Math.abs(angleDelta(startHeading, endHeading));
    if (hDiff > 1.4) continue;
    const travel = cum[end];
    const score = gap + hDiff * 10 + Math.abs(end - bestLag.lag) * 0.08;
    if (!best || score < best.score) best = { start: 0, end, travel, gap, score };
  }

  return best;
}

/** Direction of travel over roughly spanM of path either side of an index. */
function headingOverSpan(points, index, spanM, forward) {
  let acc = 0;
  let j = index;
  while (acc < spanM) {
    const k = forward ? j + 1 : j - 1;
    if (k < 0 || k >= points.length) break;
    acc += distance(points[j], points[k]);
    j = k;
  }
  if (j === index) return null;
  return forward ? heading(points[index], points[j]) : heading(points[j], points[index]);
}

/**
 * How sharply a slice kinks where it closes back on itself.
 *
 * A slice can end within a few metres of its start yet be pointing somewhere
 * else entirely — an overshoot past the line, or a pit lane. Closing that into
 * a ring inserts a spike the corner scan then reports as one or two turns the
 * circuit does not have, so closure direction has to be scored, not just the
 * endpoint gap.
 */
const CLOSURE_HEADING_SPAN_M = 25;
const MAX_CLOSURE_KINK_RAD = 0.5;

function searchLapSlice(points, expectedLengthM, options, maxKinkRad) {
  const maxGapM = options.maxGapM ?? 70;
  const minTravelM = options.minTravelM ?? 500;
  const cum = cumulativeDistance(points);
  const n = points.length;
  const minTravel = Math.max(minTravelM, expectedLengthM * (options.minRatio ?? 0.82));
  const maxTravel = Math.max(minTravel + 1, expectedLengthM * (options.maxRatio ?? 1.18));
  const stride = Math.max(1, Math.floor(n / 120));

  let best = null;
  for (let start = 0; start < n * 0.5; start += stride) {
    const outbound = headingOverSpan(points, start, CLOSURE_HEADING_SPAN_M, true);
    for (let end = start + 20; end < n; end++) {
      const travel = cum[end] - cum[start];
      if (travel < minTravel) continue;
      if (travel > maxTravel) break;
      const gap = distance(points[start], points[end]);
      if (gap > maxGapM) continue;
      const inbound = headingOverSpan(points, end, CLOSURE_HEADING_SPAN_M, false);
      const kink =
        outbound === null || inbound === null ? 0 : Math.abs(angleDelta(inbound, outbound));
      if (kink > maxKinkRad) continue;
      const score = gap + kink * 40 + Math.abs(travel - expectedLengthM) * 0.12;
      if (!best || score < best.score) best = { start, end, travel, gap, score };
    }
  }
  return best;
}

function findBestLapSlice(points, expectedLengthM, options = {}) {
  return (
    searchLapSlice(points, expectedLengthM, options, MAX_CLOSURE_KINK_RAD) ||
    searchLapSlice(points, expectedLengthM, options, Math.PI)
  );
}

function asLapCandidate(method, candidate, points) {
  if (!candidate) return null;
  const start = Math.max(0, Math.min(points.length - 2, Math.round(candidate.start ?? 0)));
  const end = Math.max(start + 1, Math.min(points.length - 1, Math.round(candidate.end ?? points.length - 1)));
  const travel = Number.isFinite(candidate.travel)
    ? candidate.travel
    : openPathLength(points.slice(start, end + 1));
  const gap = Number.isFinite(candidate.gap) ? candidate.gap : distance(points[start], points[end]);
  const score = Number.isFinite(candidate.score)
    ? candidate.score
    : Number.isFinite(candidate.quality)
      ? candidate.quality
      : gap;
  return {
    method,
    start,
    end,
    travel,
    gap,
    score,
  };
}

function sameCandidate(a, b) {
  return a.start === b.start && a.end === b.end && a.method === b.method;
}

function summarizeCandidate(c) {
  return `${c.method}:${Math.round(c.travel)}m(gap=${round(c.gap, 1)}m)`;
}

function assessAutonomousAmbiguity(candidates, selected, tracedM, startEndGapM) {
  if (!selected || !candidates.length) return { ambiguous: false, reason: '' };
  const alternatives = candidates.filter((c) => !sameCandidate(c, selected));
  if (!alternatives.length) return { ambiguous: false, reason: '' };

  const trustedMethods = new Set(['start_return', 'periodic_overlap']);
  const trustedShorter = alternatives
    .filter((c) => trustedMethods.has(c.method) && c.gap <= 130 && c.travel >= 700)
    .sort((a, b) => a.travel - b.travel);
  if (
    selected.method === 'full_trace' &&
    trustedShorter.length &&
    trustedShorter[0].travel <= selected.travel * 0.85
  ) {
    const alt = trustedShorter[0];
    return {
      ambiguous: true,
      reason:
        `full trace selected (${Math.round(selected.travel)}m) but ${alt.method} ` +
        `suggests ${Math.round(alt.travel)}m`,
      alternative: alt,
    };
  }

  const plausible = alternatives
    .filter((c) => c.travel >= 700 && c.gap <= 140)
    .sort((a, b) => a.travel - b.travel);
  if (selected.method === 'full_trace' && plausible.length) {
    const shortest = plausible[0];
    if (shortest.travel <= selected.travel * 0.72 && tracedM > shortest.travel * 1.08) {
      return {
        ambiguous: true,
        reason:
          `multiple plausible lap lengths (${Math.round(shortest.travel)}m vs ${Math.round(selected.travel)}m)`,
        alternative: shortest,
      };
    }
  }

  if (
    selected.method === 'auto_slice' &&
    startEndGapM > 300 &&
    tracedM > selected.travel * 1.22
  ) {
    return {
      ambiguous: true,
      reason:
        `open trace with large start/end gap (${Math.round(startEndGapM)}m) and only auto-slice candidate ` +
        `(${Math.round(selected.travel)}m of ${Math.round(tracedM)}m traced)`,
    };
  }

  return { ambiguous: false, reason: '' };
}

function isolateSingleLap(points, expectedLengthM = null, opts = {}) {
  const strictLapIsolation = Boolean(opts.strictLapIsolation);
  if (points.length < 24) {
    throw new Error(`need at least 24 points for lap isolation, got ${points.length}`);
  }

  const cleaned = dropFarEndJumps(points);
  const tracedM = openPathLength(cleaned);
  const endGapM = distance(cleaned[0], cleaned[cleaned.length - 1]);

  const baseMeta = {
    strictLapIsolation,
    tracedM: round(tracedM, 1),
    startEndGapM: round(endGapM, 1),
  };

  const finish = (candidate, candidates = []) => {
    const picked = candidate || asLapCandidate('full_trace', { start: 0, end: cleaned.length - 1, travel: tracedM, gap: endGapM, score: endGapM }, cleaned);
    const slice = cleaned.slice(picked.start, picked.end + 1);
    const closeGapM = slice.length > 1 ? distance(slice[0], slice[slice.length - 1]) : 0;
    const ambiguity = expectedLengthM
      ? { ambiguous: false, reason: '' }
      : assessAutonomousAmbiguity(candidates, picked, tracedM, endGapM);
    if (strictLapIsolation && ambiguity.ambiguous) {
      const all = [picked, ...candidates.filter((c) => !sameCandidate(c, picked))]
        .slice(0, 6)
        .map(summarizeCandidate)
        .join(', ');
      throw new Error(`lap isolation ambiguous: ${ambiguity.reason}. candidates=[${all}]`);
    }
    return {
      points: slice,
      meta: {
        ...baseMeta,
        method: picked.method,
        selectedTravelM: round(picked.travel, 1),
        selectedGapM: round(picked.gap, 1),
        outputCloseGapM: round(closeGapM, 1),
        candidateCount: candidates.length || 1,
        candidateSummary: candidates.slice(0, 6).map(summarizeCandidate),
        ambiguity,
      },
    };
  };

  if (!expectedLengthM) {
    const candidates = [
      asLapCandidate('start_return', findReturnToStart(cleaned), cleaned),
      asLapCandidate('periodic_overlap', findRepeatedLapSlice(cleaned), cleaned),
      asLapCandidate('auto_slice', findAutonomousLapSlice(cleaned), cleaned),
      asLapCandidate(
        'full_trace',
        { start: 0, end: cleaned.length - 1, travel: tracedM, gap: endGapM, score: endGapM * 0.4 },
        cleaned
      ),
    ].filter(Boolean);
    candidates.sort((a, b) => a.travel - b.travel);
    const shortest = candidates[0];
    if (
      shortest &&
      shortest.method !== 'full_trace' &&
      tracedM > shortest.travel * 1.1
    ) {
      return finish(shortest, candidates);
    }
  }

  if (expectedLengthM && tracedM > expectedLengthM * 1.22) {
    const bestRaw = findBestLapSlice(cleaned, expectedLengthM, {
      minRatio: 0.82,
      maxRatio: 1.18,
      maxGapM: 90,
      minTravelM: 700,
    });
    if (!bestRaw) {
      throw new Error(
        `trace is ${Math.round(tracedM)}m vs expected ${Math.round(expectedLengthM)}m, no clean single-lap slice found`
      );
    }
    const best = asLapCandidate('expected_length_slice', bestRaw, cleaned);
    return finish(best, [best]);
  }

  if (endGapM <= 80) {
    const auto = asLapCandidate('auto_slice', findAutonomousLapSlice(cleaned), cleaned);
    if (auto && tracedM > auto.travel * 1.18) {
      return finish(auto, [auto]);
    }
    const full = asLapCandidate(
      'full_trace',
      { start: 0, end: cleaned.length - 1, travel: tracedM, gap: endGapM, score: endGapM * 0.4 },
      cleaned
    );
    const candidates = [full];
    if (auto) candidates.unshift(auto);
    return finish(full, candidates);
  }

  if (expectedLengthM) {
    const bestRaw = findBestLapSlice(cleaned, expectedLengthM, {
      minRatio: 0.7,
      maxRatio: 1.3,
      maxGapM: 120,
      minTravelM: 600,
    });
    if (bestRaw) {
      const best = asLapCandidate('expected_length_slice', bestRaw, cleaned);
      return finish(best, [best]);
    }
  }

  const auto = asLapCandidate('auto_slice', findAutonomousLapSlice(cleaned), cleaned);
  if (auto) {
    return finish(auto, [auto]);
  }

  throw new Error(
    `lap does not close (start/end gap ${round(endGapM, 1)}m) and no expected length provided to isolate a single lap`
  );
}

/**
 * Pull an open lap slice onto its own start before it becomes a ring.
 *
 * Isolation lands within a few metres of the start, not exactly on it, and the
 * raw chord across that gap turns as hard as a 10m-radius hairpin. Spreading
 * the offset back along the final stretch closes the loop with a bend far too
 * gentle to be read as a corner.
 */
const CLOSURE_RAMP_MIN_M = 60;

function closeRingForResample(points) {
  const ring = points.map((p) => ({ ...p }));
  const last = ring.length - 1;
  const dx = ring[0].x - ring[last].x;
  const dy = ring[0].y - ring[last].y;
  const gap = Math.hypot(dx, dy);
  if (gap > 1e-6) {
    const rampM = Math.max(CLOSURE_RAMP_MIN_M, gap * 8);
    let acc = 0;
    for (let i = last; i > 0 && acc <= rampM; i--) {
      const w = 1 - acc / rampM;
      ring[i].x += dx * w;
      ring[i].y += dy * w;
      acc += distance(points[i - 1], points[i]);
    }
  }
  ring.pop();
  return ring;
}

function resampleClosed(points, spacingM) {
  const ring = closeRingForResample(points);
  if (ring.length < 12) {
    throw new Error(`cannot resample ring with fewer than 12 points (got ${ring.length})`);
  }

  const closed = [...ring, ring[0]];
  const segLen = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const len = distance(closed[i - 1], closed[i]);
    segLen.push(len);
    total += len;
  }
  if (total < 500) throw new Error(`closed lap length too short (${round(total, 1)}m)`);

  const targetCount = Math.max(500, Math.min(7000, Math.round(total / spacingM)));
  const sampled = [];
  for (let i = 0; i < targetCount; i++) {
    const target = (i / targetCount) * total;
    let acc = 0;
    for (let s = 0; s < segLen.length; s++) {
      if (acc + segLen[s] >= target || s === segLen.length - 1) {
        const t = segLen[s] <= 1e-9 ? 0 : (target - acc) / segLen[s];
        const a = closed[s];
        const b = closed[s + 1];
        sampled.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
        });
        break;
      }
      acc += segLen[s];
    }
  }

  return { points: sampled, lengthM: total };
}

function smoothCircular(points, lengthM, windowM) {
  const n = points.length;
  const half = Math.max(1, Math.round((windowM / lengthM) * n * 0.5));
  const out = points.map((p) => ({ ...p }));
  for (let i = 0; i < n; i++) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let wsum = 0;
    for (let k = -half; k <= half; k++) {
      const idx = (((i + k) % n) + n) % n;
      const w = 1 - Math.abs(k) / (half + 1);
      sx += points[idx].x * w;
      sy += points[idx].y * w;
      sz += (points[idx].z ?? 0) * w;
      wsum += w;
    }
    out[i].x = sx / wsum;
    out[i].y = sy / wsum;
    out[i].z = sz / wsum;
  }
  return out;
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function inferDirection(points) {
  const area = signedArea(points);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const boxArea = Math.max(1, (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)));
  const normalized = Math.min(1, Math.abs(area) / (boxArea * 0.35));
  const confidence = round(0.5 + normalized * 0.49, 3);
  if (Math.abs(area) < 1e-6) return { direction: 'unknown', confidence };
  return {
    direction: area < 0 ? 'clockwise' : 'anticlockwise',
    confidence,
  };
}

const START_MARKER_RE = /\b(start|finish|start\/finish|s\/f|timing|line)\b/i;

function nearestIndex(points, target) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = distance(points[i], target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { index: bestIdx, distM: bestDist };
}

function eventContainsIndex(event, idx, n) {
  if (event.startI <= event.endI) return idx >= event.startI && idx <= event.endI;
  return idx >= event.startI || idx <= event.endI;
}

function walkClosedRange(startI, endI, n) {
  const out = [];
  let i = startI;
  out.push(i);
  while (i !== endI) {
    i = (i + 1) % n;
    out.push(i);
    if (out.length > n + 1) break;
  }
  return out;
}

function isInsideAnyEvent(events, idx, n) {
  for (const ev of events) {
    if (eventContainsIndex(ev, idx, n)) return true;
  }
  return false;
}

function pickStartFromLongestStraight(points, lengthM, events) {
  const n = points.length;
  const straight = longestStraight(points, lengthM, 0.22);
  if (!straight || straight.lenM < 90) return null;
  const run = walkClosedRange(straight.startI, straight.endI, n);
  const rate = turnRate(points, 12);
  const center = (run.length - 1) / 2;

  let best = null;
  for (let pos = 0; pos < run.length; pos++) {
    const idx = run[pos];
    if (isInsideAnyEvent(events, idx, n)) continue;
    const score = Math.abs(rate[idx]) + (Math.abs(pos - center) / Math.max(1, run.length)) * 0.25;
    if (!best || score < best.score) best = { idx, score };
  }

  if (!best) {
    for (let idx = 0; idx < n; idx++) {
      if (isInsideAnyEvent(events, idx, n)) continue;
      if (Math.abs(rate[idx]) > 0.22) continue;
      const score = Math.abs(rate[idx]);
      if (!best || score < best.score) best = { idx, score };
    }
  }

  if (!best) return null;
  const confidence = round(Math.min(0.9, Math.max(0.58, straight.lenM / 550)), 3);
  return {
    index: best.idx,
    source: 'longest_straight',
    confidence,
    straightLengthM: round(straight.lenM, 1),
  };
}

function resolveStartFinishIndex(points, lengthM, waypointsLocal, events) {
  for (const wpt of waypointsLocal) {
    const label = `${wpt.name} ${wpt.meta}`.trim();
    if (!START_MARKER_RE.test(label)) continue;
    const snapped = nearestIndex(points, wpt);
    if (snapped.distM > 40) continue;
    for (const ev of events) {
      if (eventContainsIndex(ev, snapped.index, points.length)) {
        throw new Error(
          `start marker "${wpt.name || 'unnamed'}" snaps inside a corner event; provide a marker on a straight`
        );
      }
    }
    return {
      index: snapped.index,
      source: `waypoint:${wpt.name || 'unnamed'}`,
      confidence: 0.97,
      snapDistanceM: round(snapped.distM, 2),
    };
  }

  const inferred = pickStartFromLongestStraight(points, lengthM, events);
  if (!inferred) {
    throw new Error('no reliable straight found for start/finish inference');
  }
  return inferred;
}

function wrappedPointDistance(startIdx, endIdx, pointCount, perPointM) {
  const delta = ((endIdx - startIdx) % pointCount + pointCount) % pointCount;
  return delta * perPointM;
}

function unwrapEventDistances(startIndex, event, pointCount, perPointM, lapLengthM) {
  let entryM = wrappedPointDistance(startIndex, event.startI, pointCount, perPointM);
  let apexM = wrappedPointDistance(startIndex, event.midI, pointCount, perPointM);
  let exitM = wrappedPointDistance(startIndex, event.endI, pointCount, perPointM);
  if (apexM < entryM) apexM += lapLengthM;
  if (exitM < apexM) exitM += lapLengthM;
  return { entryM, apexM, exitM };
}

function eventIndices(event, n) {
  const idx = [];
  let i = event.startI;
  idx.push(i);
  while (i !== event.endI) {
    i = (i + 1) % n;
    idx.push(i);
    if (idx.length > n + 1) break;
  }
  return idx;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function countProminentPeaks(values) {
  if (values.length < 5) return 0;
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const floor = minV + (maxV - minV) * 0.55;
  let peaks = 0;
  let lastPeak = -99;
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < floor) continue;
    if (values[i] < values[i - 1] || values[i] < values[i + 1]) continue;
    if (i - lastPeak < 6) continue;
    peaks += 1;
    lastPeak = i;
  }
  return peaks;
}

function classifyCornerShape(absRates, profile) {
  const third = Math.max(1, Math.floor(absRates.length / 3));
  const entry = median(absRates.slice(0, third));
  const exit = median(absRates.slice(absRates.length - third));
  if (exit > entry * 1.25) return 'tightening';
  if (exit < entry * 0.75) return 'opening';
  return 'constant_radius';
}

function confidenceFromMetrics(metric) {
  const angleScore = Math.min(1, metric.headingChangeDeg / 105);
  const lengthScore = Math.min(1, metric.lengthM / 95);
  const radiusScore =
    metric.minimumRadiusM <= 0 ? 0 : Math.min(1, Math.max(0, (180 - metric.minimumRadiusM) / 150));
  return round(0.4 + (angleScore * 0.45 + lengthScore * 0.25 + radiusScore * 0.3) * 0.55, 3);
}

function primaryClassification(metric, shape, profile, isChicane, peakCount) {
  if (isChicane) return 'chicane_element';
  if (
    metric.headingChangeDeg >= profile.hairpinMinAngleDeg &&
    metric.minimumRadiusM <= profile.hairpinMaxRadiusM
  ) {
    return 'hairpin';
  }
  if (metric.headingChangeDeg <= profile.kinkMaxAngleDeg && metric.minimumRadiusM >= profile.kinkMinRadiusM) {
    return 'kink';
  }
  if (peakCount >= 3) return 'triple_apex';
  if (peakCount === 2) return 'double_apex';
  if (metric.lengthM >= profile.sweeperMinLengthM && metric.minimumRadiusM >= profile.sweeperMinRadiusM) {
    return 'sweeper';
  }
  return shape;
}

function formatShortDescription(corner) {
  const type = corner.classification.replaceAll('_', ' ');
  return `T${corner.number}: ${type} ${corner.direction}, ${Math.round(corner.headingChangeDeg)} deg, ~${Math.round(corner.minimumRadiusM)}m min radius`;
}

function formatLongDescription(corner) {
  const type = corner.classification.replaceAll('_', ' ');
  const direction = corner.direction === 'left' ? 'left-hander' : 'right-hander';
  const before = Math.max(0, corner.entryDistanceM - corner.previousStraightM);
  return (
    `Turn ${corner.number} is a ${type} ${direction}. ` +
    `It starts around ${Math.round(corner.entryDistanceM)}m, peaks near ${Math.round(corner.apexDistanceM)}m, and exits near ${Math.round(corner.exitDistanceM)}m. ` +
    `Estimated heading change is ${Math.round(corner.headingChangeDeg)} deg with minimum radius about ${Math.round(corner.minimumRadiusM)}m. ` +
    `The lead-in straight is about ${Math.round(corner.previousStraightM)}m from ${Math.round(before)}m.`
  );
}

function buildCorners(events, rate, points, lapLengthM, startInfo, profile) {
  const n = points.length;
  const perPointM = lapLengthM / n;

  const enriched = events.map((event) => {
    const idx = eventIndices(event, n);
    const absRates = idx.map((i) => Math.abs(rate[i]));
    const maxRate = Math.max(...absRates);
    const minRadiusM = maxRate > 1e-9 ? DEG_PER_RAD / maxRate : Infinity;
    const shape = classifyCornerShape(absRates, profile);
    const peakCount = countProminentPeaks(absRates);
    const unwrapped = unwrapEventDistances(startInfo.index, event, n, perPointM, lapLengthM);
    const headingChangeDeg = Math.abs(event.totalDeg);
    const lengthM = idx.length * perPointM;
    return {
      ...event,
      ...unwrapped,
      headingChangeDeg,
      lengthM,
      minimumRadiusM: minRadiusM,
      maxCurvatureDegPerM: maxRate,
      shape,
      peakCount,
      confidence: confidenceFromMetrics({
        headingChangeDeg,
        lengthM,
        minimumRadiusM: minRadiusM,
      }),
    };
  });

  for (const event of enriched) {
    if (event.lengthM < profile.minCornerLengthM) {
      throw new Error(
        `detected corner event below minimum length (${round(event.lengthM, 1)}m < ${profile.minCornerLengthM}m)`
      );
    }
    if (event.headingChangeDeg < profile.minHeadingDeg) {
      throw new Error(
        `detected corner event below minimum heading change (${round(event.headingChangeDeg, 1)} deg < ${profile.minHeadingDeg} deg)`
      );
    }
  }

  const sorted = enriched
    .map((event) => ({
      ...event,
      apexWrappedM: ((event.apexM % lapLengthM) + lapLengthM) % lapLengthM,
      entryWrappedM: ((event.entryM % lapLengthM) + lapLengthM) % lapLengthM,
      exitWrappedM: ((event.exitM % lapLengthM) + lapLengthM) % lapLengthM,
    }))
    .sort((a, b) => a.apexWrappedM - b.apexWrappedM);

  const corners = sorted.map((event, i) => {
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    // Circular gap, so numbering can start at any corner in the lap.
    const rawGap = event.entryWrappedM - prev.exitWrappedM;
    const previousStraightM = rawGap >= 0 ? rawGap : rawGap + lapLengthM;
    const isChicane = prev.hand !== event.hand && previousStraightM <= profile.chicaneGapM;
    const classification = primaryClassification(event, event.shape, profile, isChicane, event.peakCount);
    const corner = {
      number: i + 1,
      direction: event.hand,
      entryDistanceM: round(event.entryWrappedM, 1),
      apexDistanceM: round(event.apexWrappedM, 1),
      exitDistanceM: round(event.exitWrappedM, 1),
      headingChangeDeg: round(event.headingChangeDeg, 1),
      minimumRadiusM: round(event.minimumRadiusM, 1),
      lengthM: round(event.lengthM, 1),
      maxCurvatureDegPerM: round(event.maxCurvatureDegPerM, 3),
      shape: event.shape,
      classification,
      apexCount: event.peakCount,
      previousStraightM: round(previousStraightM, 1),
      confidence: event.confidence,
      sourceEvent: {
        startIndex: event.startI,
        apexIndex: event.midI,
        endIndex: event.endI,
      },
    };
    corner.shortDescription = formatShortDescription(corner);
    corner.description = formatLongDescription(corner);
    return corner;
  });

  return corners;
}

function filterEventsForProfile(events, rate, pointCount, lapLengthM, profile) {
  const perPointM = lapLengthM / pointCount;
  const kept = [];
  const dropped = [];
  for (const event of events) {
    const idx = eventIndices(event, pointCount);
    const lengthM = idx.length * perPointM;
    const headingDeg = Math.abs(event.totalDeg);
    if (lengthM < profile.minCornerLengthM || headingDeg < profile.minHeadingDeg) {
      dropped.push({
        hand: event.hand,
        lengthM: round(lengthM, 2),
        headingDeg: round(headingDeg, 2),
      });
      continue;
    }
    // A turn tighter than any circuit is built with, swinging through two
    // separate apexes, is a wobble in the trace rather than a corner. However
    // tight a real hairpin gets it still holds one sustained apex.
    const absRates = idx.map((i) => Math.abs(rate[i]));
    const maxRate = Math.max(...absRates);
    const minRadiusM = maxRate > 1e-9 ? DEG_PER_RAD / maxRate : Infinity;
    if (minRadiusM < profile.artifactRadiusM && countProminentPeaks(absRates) >= 2) {
      dropped.push({
        hand: event.hand,
        lengthM: round(lengthM, 2),
        headingDeg: round(headingDeg, 2),
        minRadiusM: round(minRadiusM, 2),
      });
      continue;
    }
    kept.push(event);
  }
  return { kept, dropped };
}

function circularIndexDistance(a, b, pointCount) {
  const d = Math.abs(a - b);
  return Math.min(d, pointCount - d);
}

function eventGapM(a, b, pointCount, perPointM) {
  const raw = ((b.startI - a.endI + pointCount) % pointCount) - 1;
  const pts = raw < 0 ? 0 : raw;
  return pts * perPointM;
}

function eventStats(event, rate, pointCount, perPointM) {
  const idx = eventIndices(event, pointCount);
  const handSign = event.hand === 'right' ? 1 : -1;
  const absRates = idx.map((i) => Math.abs(rate[i]));
  const absDeg = absRates.reduce((sum, v) => sum + v * perPointM, 0);
  const handRates = idx.map((i) => Math.max(0, rate[i] * handSign));
  let handDeg = handRates.reduce((sum, v) => sum + v * perPointM, 0);
  if (handDeg < 1e-6) handDeg = absDeg;
  let midI = idx[0];
  const target = handDeg / 2;
  let acc = 0;
  for (let k = 0; k < idx.length; k++) {
    const add = (handRates[k] > 1e-6 ? handRates[k] : absRates[k]) * perPointM;
    acc += add;
    if (acc >= target) {
      midI = idx[k];
      break;
    }
  }
  return {
    idx,
    midI,
    lengthM: idx.length * perPointM,
    totalDeg: handDeg,
    absRates,
    peakCount: countProminentPeaks(absRates),
  };
}

function buildEventFromRange(hand, startI, endI, rate, pointCount, perPointM) {
  const event = { hand, startI, endI };
  const stats = eventStats(event, rate, pointCount, perPointM);
  return {
    hand,
    startI,
    endI,
    midI: stats.midI,
    sNorm: stats.midI / pointCount,
    lengthM: Math.round(stats.lengthM),
    totalDeg: Math.round(stats.totalDeg),
  };
}

function normalizeEvent(event, rate, pointCount, perPointM) {
  const built = buildEventFromRange(event.hand, event.startI, event.endI, rate, pointCount, perPointM);
  return {
    hand: built.hand,
    startI: built.startI,
    endI: built.endI,
    midI: built.midI,
    sNorm: built.sNorm,
    lengthM: built.lengthM,
    totalDeg: built.totalDeg,
  };
}

function rotateEventsByLargestGap(events, pointCount, perPointM) {
  if (events.length < 2) return events.slice();
  let bestIdx = 0;
  let bestGap = -1;
  for (let i = 0; i < events.length; i++) {
    const next = events[(i + 1) % events.length];
    const gap = eventGapM(events[i], next, pointCount, perPointM);
    if (gap > bestGap) {
      bestGap = gap;
      bestIdx = i;
    }
  }
  return [...events.slice(bestIdx + 1), ...events.slice(0, bestIdx + 1)];
}

function rotateStart(items, startIndex) {
  if (!items.length) return [];
  const n = items.length;
  const start = ((startIndex % n) + n) % n;
  if (start === 0) return items.slice();
  return [...items.slice(start), ...items.slice(0, start)];
}

function mergeNoiseEvents(events, rate, pointCount, lapLengthM, profile) {
  if (!events.length) return { events: [], merges: 0, drops: 0 };
  const perPointM = lapLengthM / pointCount;
  let line = rotateEventsByLargestGap(
    events.map((e) => normalizeEvent(e, rate, pointCount, perPointM)),
    pointCount,
    perPointM
  );

  let merges = 0;
  let drops = 0;
  let changed = true;
  while (changed) {
    changed = false;

    if (line.length >= 3) {
      // A seam artifact can show up as a tiny segment with a huge angle swing.
      // Prefer absorbing it into an adjacent same-hand event.
      for (let i = 0; i < line.length; i++) {
        const aIdx = (i - 1 + line.length) % line.length;
        const cIdx = (i + 1) % line.length;
        const a = line[aIdx];
        const b = line[i];
        const c = line[cIdx];
        const seamLike =
          b.lengthM <= profile.seamSpikeLenM && b.totalDeg >= profile.seamSpikeDegMin;
        if (!seamLike) continue;

        const gapAB = eventGapM(a, b, pointCount, perPointM);
        const gapBC = eventGapM(b, c, pointCount, perPointM);
        if (a.hand === b.hand && gapAB <= profile.seamMergeGapM) {
          const merged = normalizeEvent(
            buildEventFromRange(a.hand, a.startI, b.endI, rate, pointCount, perPointM),
            rate,
            pointCount,
            perPointM
          );
          const rotated = rotateStart(line, aIdx);
          rotated.splice(0, 2, merged);
          line = rotated;
          merges += 1;
          changed = true;
          break;
        }
        if (c.hand === b.hand && gapBC <= profile.seamMergeGapM) {
          const merged = normalizeEvent(
            buildEventFromRange(b.hand, b.startI, c.endI, rate, pointCount, perPointM),
            rate,
            pointCount,
            perPointM
          );
          const rotated = rotateStart(line, i);
          rotated.splice(0, 2, merged);
          line = rotated;
          merges += 1;
          changed = true;
          break;
        }
        if (gapAB <= profile.seamMergeGapM && gapBC <= profile.seamMergeGapM) {
          const winner = a.totalDeg >= c.totalDeg ? a.hand : c.hand;
          const merged = normalizeEvent(
            buildEventFromRange(winner, a.startI, c.endI, rate, pointCount, perPointM),
            rate,
            pointCount,
            perPointM
          );
          const rotated = rotateStart(line, aIdx);
          rotated.splice(0, 3, merged);
          line = rotated;
          merges += 1;
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;

    if (line.length >= 2) {
      // Very short left-right or right-left wiggles are usually one cornering
      // action in official numbering.
      for (let i = 0; i < line.length; i++) {
        const a = line[i];
        const b = line[(i + 1) % line.length];
        if (
          a.hand === b.hand ||
          a.totalDeg > profile.oppositePairDegMax ||
          b.totalDeg > profile.oppositePairDegMax ||
          a.lengthM > profile.oppositePairLenM ||
          b.lengthM > profile.oppositePairLenM ||
          eventGapM(a, b, pointCount, perPointM) > profile.oppositePairGapM
        ) {
          continue;
        }
        const winner = a.totalDeg >= b.totalDeg ? a.hand : b.hand;
        const merged = normalizeEvent(
          buildEventFromRange(winner, a.startI, b.endI, rate, pointCount, perPointM),
          rate,
          pointCount,
          perPointM
        );
        const rotated = rotateStart(line, i);
        rotated.splice(0, 2, merged);
        line = rotated;
        merges += 1;
        changed = true;
        break;
      }
    }
    if (changed) continue;

    if (line.length >= 3) {
      for (let i = 0; i < line.length; i++) {
        const a = line[i];
        const b = line[(i + 1) % line.length];
        const c = line[(i + 2) % line.length];
        const weakB = b.totalDeg <= profile.spikeOppDegMax || b.lengthM <= profile.spikeOppLenM;
        if (
          a.hand === c.hand &&
          b.hand !== a.hand &&
          weakB &&
          eventGapM(a, b, pointCount, perPointM) <= profile.spikeGapM &&
          eventGapM(b, c, pointCount, perPointM) <= profile.spikeGapM
        ) {
          const merged = normalizeEvent(
            buildEventFromRange(a.hand, a.startI, c.endI, rate, pointCount, perPointM),
            rate,
            pointCount,
            perPointM
          );
          const rotated = rotateStart(line, i);
          rotated.splice(0, 3, merged);
          line = rotated;
          merges += 1;
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;

    if (line.length >= 2) {
      for (let i = 0; i < line.length; i++) {
        const a = line[i];
        const b = line[(i + 1) % line.length];
        if (
          a.hand === b.hand &&
          eventGapM(a, b, pointCount, perPointM) <= profile.sameHandMergeGapM
        ) {
          const merged = normalizeEvent(
            buildEventFromRange(a.hand, a.startI, b.endI, rate, pointCount, perPointM),
            rate,
            pointCount,
            perPointM
          );
          const rotated = rotateStart(line, i);
          rotated.splice(0, 2, merged);
          line = rotated;
          merges += 1;
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;

    if (line.length >= 3) {
      for (let i = 0; i < line.length; i++) {
        const aIdx = (i - 1 + line.length) % line.length;
        const cIdx = (i + 1) % line.length;
        const a = line[aIdx];
        const b = line[i];
        const c = line[cIdx];
        const weak = b.totalDeg <= profile.weakEventDegMax && b.lengthM <= profile.weakEventLenM;
        if (
          !weak ||
          eventGapM(a, b, pointCount, perPointM) > profile.weakEventGapM ||
          eventGapM(b, c, pointCount, perPointM) > profile.weakEventGapM
        ) {
          continue;
        }
        if (a.hand === c.hand) {
          const merged = normalizeEvent(
            buildEventFromRange(a.hand, a.startI, c.endI, rate, pointCount, perPointM),
            rate,
            pointCount,
            perPointM
          );
          const rotated = rotateStart(line, aIdx);
          rotated.splice(0, 3, merged);
          line = rotated;
          merges += 1;
        } else {
          const rotated = rotateStart(line, i);
          rotated.splice(0, 1);
          line = rotated;
          drops += 1;
        }
        changed = true;
        break;
      }
    }
  }

  return {
    events: line
      .map((e) => normalizeEvent(e, rate, pointCount, perPointM))
      .sort((a, b) => a.sNorm - b.sNorm),
    merges,
    drops,
  };
}

function likelyUnderSegmented(events, lapLengthM, profile) {
  const km = Math.max(0.1, lapLengthM / 1000);
  const density = events.length / km;
  const large = events.filter(
    (e) => e.totalDeg >= profile.compoundSplitMinDeg && e.lengthM <= profile.compoundSplitMaxLenM
  ).length;
  const tiny = events.filter((e) => e.totalDeg <= profile.weakEventDegMax || e.lengthM <= profile.weakEventLenM).length;
  return {
    density,
    large,
    tiny,
    ok:
      density <= profile.underSegDensityMaxPerKm &&
      large >= profile.underSegLargeEventMin &&
      tiny <= profile.underSegTinyEventMax,
  };
}

function splitCompoundEvents(events, rate, pointCount, lapLengthM, profile) {
  if (!events.length) return { events: [], splits: 0 };
  const perPointM = lapLengthM / pointCount;
  const out = [];
  let splits = 0;

  for (const event of events) {
    const stats = eventStats(event, rate, pointCount, perPointM);
    if (
      stats.peakCount < 2 ||
      stats.totalDeg < profile.compoundSplitMinDeg ||
      stats.lengthM > profile.compoundSplitMaxLenM
    ) {
      out.push(normalizeEvent(event, rate, pointCount, perPointM));
      continue;
    }

    let parts = 2;
    if (stats.totalDeg >= profile.compoundSplitMinDeg * 1.55 && stats.peakCount >= 4) {
      parts = 3;
    }
    parts = Math.min(parts, profile.compoundSplitPartsMax);
    if (parts < 2) {
      out.push(normalizeEvent(event, rate, pointCount, perPointM));
      continue;
    }

    const handSign = event.hand === 'right' ? 1 : -1;
    const contrib = stats.idx.map((i) => Math.max(0, rate[i] * handSign));
    const total = contrib.reduce((sum, v) => sum + v * perPointM, 0);
    if (total <= profile.compoundSplitMinDeg * 0.8) {
      out.push(normalizeEvent(event, rate, pointCount, perPointM));
      continue;
    }

    const minPts = Math.max(4, Math.round(profile.compoundSplitPartMinLenM / perPointM));
    const cuts = [];
    let acc = 0;
    for (let k = 0; k < contrib.length; k++) {
      acc += contrib[k] * perPointM;
      for (let p = cuts.length + 1; p < parts; p++) {
        const threshold = (total * p) / parts;
        if (acc >= threshold) {
          cuts.push(k);
        }
      }
    }
    cuts.sort((a, b) => a - b);
    if (cuts.length !== parts - 1) {
      out.push(normalizeEvent(event, rate, pointCount, perPointM));
      continue;
    }

    const bounds = [0, ...cuts, stats.idx.length - 1];
    let valid = true;
    for (let b = 1; b < bounds.length; b++) {
      const pts = bounds[b] - bounds[b - 1] + 1;
      if (pts < minPts) {
        valid = false;
        break;
      }
    }
    if (!valid) {
      out.push(normalizeEvent(event, rate, pointCount, perPointM));
      continue;
    }

    const partsOut = [];
    for (let b = 1; b < bounds.length; b++) {
      const startPos = bounds[b - 1];
      const endPos = bounds[b];
      const startI = stats.idx[startPos];
      const endI = stats.idx[endPos];
      const piece = normalizeEvent(
        buildEventFromRange(event.hand, startI, endI, rate, pointCount, perPointM),
        rate,
        pointCount,
        perPointM
      );
      if (piece.totalDeg < profile.minHeadingDeg || piece.lengthM < profile.minCornerLengthM) {
        valid = false;
        break;
      }
      partsOut.push(piece);
    }

    if (!valid || partsOut.length < 2) {
      out.push(normalizeEvent(event, rate, pointCount, perPointM));
      continue;
    }

    splits += partsOut.length - 1;
    out.push(...partsOut);
  }

  return { events: out.sort((a, b) => a.sNorm - b.sNorm), splits };
}

function enrichUnderSegmentedEvents(events, rate, points, lapLengthM, profile, opts = {}) {
  if (!events.length) return { events, added: 0 };
  const pointCount = points.length;
  const perPointM = lapLengthM / pointCount;
  const context = likelyUnderSegmented(events, lapLengthM, profile);
  const forced = Boolean(opts.force);
  if (!forced && !context.ok) {
    return { events, added: 0, context };
  }

  const relaxed = turnEvents(points, lapLengthM, {
    windowM: Math.max(8, profile.turnWindowM - 2),
    minDeg: Math.max(8, profile.minSweptDeg * profile.enrichMinDegScale),
    rateFloor: Math.max(0.06, profile.rateFloorDegPerM * profile.enrichRateFloorScale),
    mergeGapM: Math.max(6, profile.mergeGapM * profile.enrichMergeGapScale),
  });
  const filtered = filterEventsForProfile(relaxed, rate, pointCount, lapLengthM, profile).kept.map((e) =>
    normalizeEvent(e, rate, pointCount, perPointM)
  );

  const out = events.map((e) => normalizeEvent(e, rate, pointCount, perPointM));
  let added = 0;
  for (const cand of filtered) {
    if (cand.totalDeg < profile.enrichMinEventDeg) continue;
    let nearest = Infinity;
    for (const have of out) {
      const dPts = circularIndexDistance(cand.midI, have.midI, pointCount);
      nearest = Math.min(nearest, dPts * perPointM);
    }
    if (nearest < profile.enrichMinSeparationM) continue;
    out.push(cand);
    added += 1;
  }

  return { events: out.sort((a, b) => a.sNorm - b.sNorm), added, context };
}

function refineEventsForProfile(rawEvents, rate, pointCount, lapLengthM, points, profile) {
  const first = filterEventsForProfile(rawEvents, rate, pointCount, lapLengthM, profile);
  const baseUnderSeg = likelyUnderSegmented(first.kept, lapLengthM, profile);
  const merged = baseUnderSeg.ok
    ? { events: first.kept, merges: 0, drops: 0 }
    : mergeNoiseEvents(first.kept, rate, pointCount, lapLengthM, profile);
  const split = baseUnderSeg.ok
    ? splitCompoundEvents(merged.events, rate, pointCount, lapLengthM, profile)
    : { events: merged.events, splits: 0 };
  const enriched = enrichUnderSegmentedEvents(split.events, rate, points, lapLengthM, profile, {
    force: baseUnderSeg.ok,
  });
  const mergedAgain = baseUnderSeg.ok
    ? { events: enriched.events, merges: 0, drops: 0 }
    : mergeNoiseEvents(enriched.events, rate, pointCount, lapLengthM, profile);
  const finalFiltered = filterEventsForProfile(
    mergedAgain.events,
    rate,
    pointCount,
    lapLengthM,
    profile
  );
  return {
    kept: finalFiltered.kept,
    dropped: [...first.dropped, ...finalFiltered.dropped],
    stats: {
      rawCount: rawEvents.length,
      filteredCount: first.kept.length,
      mergeCount: merged.merges + mergedAgain.merges,
      dropCount: merged.drops + mergedAgain.drops,
      splitCount: split.splits,
      enrichAdded: enriched.added || 0,
      underSegmentedLikely: baseUnderSeg.ok,
      underSegmentedDensity: round(baseUnderSeg.density, 2),
      underSegmentedLargeEvents: baseUnderSeg.large,
      underSegmentedTinyEvents: baseUnderSeg.tiny,
    },
  };
}

/** Events in the order `buildCorners` will number them for a given start index. */
function eventsInNumberingOrder(events, startIndex, pointCount, perPointM, lapLengthM) {
  return events
    .map((event) => ({
      event,
      apexWrappedM:
        ((wrappedPointDistance(startIndex, event.midI, pointCount, perPointM) % lapLengthM) +
          lapLengthM) %
        lapLengthM,
    }))
    .sort((a, b) => a.apexWrappedM - b.apexWrappedM)
    .map((entry) => entry.event);
}

/**
 * Move start/finish so numbering begins at the corner a curated offset names.
 *
 * No GPX in this catalog carries a start/finish waypoint, so the geometric
 * fallback picks the longest straight — which is not always the main straight.
 * That misnumbers the whole lap while still placing every corner correctly, so
 * the fix is to relocate start/finish rather than to touch the geometry.
 *
 * Start/finish moves or the offset is rejected; numbering is never rotated away
 * from it. Rotating alone produced maps with Turn 1 behind the start line.
 */
function alignNumbering(points, events, startInfo, shift, lapLengthM) {
  const n = points.length;
  const perPointM = lapLengthM / n;
  const ordered = eventsInNumberingOrder(events, startInfo.index, n, perPointM, lapLengthM);
  const count = ordered.length;
  if (!count) throw new Error('cannot align numbering without corner events');

  const at = (i) => ordered[((i % count) + count) % count];
  const target = at(shift);
  const previous = at(shift - 1);
  const gapPoints = (((target.startI - previous.endI) % n) + n) % n;
  const gapM = round(gapPoints * perPointM, 1);

  if (gapM < MIN_START_STRAIGHT_M) {
    throw new Error(
      `corner shift ${shift} names a Turn 1 with only ${gapM}m of straight before it ` +
        `(need ${MIN_START_STRAIGHT_M}m for a start/finish line), so the offset is wrong`
    );
  }

  return {
    index: (previous.endI + Math.floor(gapPoints / 2)) % n,
    source: 'aligned_corner_shift',
    confidence: 0.9,
    cornerShift: shift,
    geometricIndex: startInfo.index,
    geometricSource: startInfo.source,
    gapM,
  };
}

/**
 * Compare numbered corner hands against curated `verifiedHands`.
 *
 * A systematic offset means the numbering origin is wrong, not the geometry, so
 * that is reported separately from individual hands that simply disagree.
 */
function verifyTurnHands(corners, verifiedHands) {
  const count = corners.length;
  const wanted = Object.entries(verifiedHands)
    .map(([number, hand]) => ({ number: Number(number), hand }))
    .filter((entry) => Number.isInteger(entry.number) && entry.number >= 1 && entry.number <= count);

  if (!wanted.length) {
    return { checked: 0, agreed: 0, bestShift: 0, bestAgreed: 0, mismatches: [] };
  }

  const handAt = (i) => corners[((i % count) + count) % count].direction;
  const scoreAt = (shift) => wanted.filter((e) => handAt(e.number - 1 + shift) === e.hand).length;

  const agreed = scoreAt(0);
  let bestShift = 0;
  let bestAgreed = agreed;
  const span = Math.floor(count / 2);
  for (let shift = -span; shift <= span; shift++) {
    const score = scoreAt(shift);
    // Smallest rotation wins a tie, so the reported offset matches calibration.
    if (score > bestAgreed || (score === bestAgreed && Math.abs(shift) < Math.abs(bestShift))) {
      bestAgreed = score;
      bestShift = shift;
    }
  }

  return {
    checked: wanted.length,
    agreed,
    bestShift,
    bestAgreed,
    mismatches: wanted
      .filter((e) => handAt(e.number - 1) !== e.hand)
      .map((e) => ({ number: e.number, verified: e.hand, detected: handAt(e.number - 1) })),
  };
}

function radiusFromRate(rateDegPerM) {
  return rateDegPerM > 1e-9 ? DEG_PER_RAD / rateDegPerM : Infinity;
}

/**
 * Best single breakpoint of a piecewise-constant fit over a curvature series.
 *
 * A radius step is not on its own evidence that two official corners exist: at
 * a 1.5 radius ratio it fires on 72 events across layouts whose counts are
 * already correct. It is used only to rank *where* a split belongs once the
 * corner count is known from elsewhere.
 */
function bestPlateauBreak(series, minPts) {
  const n = series.length;
  if (n < minPts * 2) return null;

  const sum = new Float64Array(n + 1);
  const sumSq = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    sum[i + 1] = sum[i] + series[i];
    sumSq[i + 1] = sumSq[i] + series[i] * series[i];
  }
  const sse = (from, to) => {
    const count = to - from;
    if (count <= 0) return 0;
    const s = sum[to] - sum[from];
    return Math.max(0, sumSq[to] - sumSq[from] - (s * s) / count);
  };
  const mean = (from, to) => (to > from ? (sum[to] - sum[from]) / (to - from) : 0);

  const total = sse(0, n);
  let best = null;
  for (let cut = minPts; cut <= n - minPts; cut++) {
    const score = sse(0, cut) + sse(cut, n);
    if (!best || score < best.score) {
      best = { cut, score, leftRate: mean(0, cut), rightRate: mean(cut, n) };
    }
  }
  if (!best) return null;
  return { ...best, reduction: total > 1e-12 ? 1 - best.score / total : 0 };
}

function splitCandidateFor(event, rate, pointCount, perPointM, profile) {
  const stats = eventStats(event, rate, pointCount, perPointM);
  const minPts = Math.max(3, Math.round(profile.constrainMinSideM / perPointM));
  const split = bestPlateauBreak(stats.absRates, minPts);
  if (!split || split.cut < 1 || split.cut >= stats.idx.length) return null;

  const left = normalizeEvent(
    buildEventFromRange(event.hand, event.startI, stats.idx[split.cut - 1], rate, pointCount, perPointM),
    rate,
    pointCount,
    perPointM
  );
  const right = normalizeEvent(
    buildEventFromRange(event.hand, stats.idx[split.cut], event.endI, rate, pointCount, perPointM),
    rate,
    pointCount,
    perPointM
  );

  const leftRadiusM = radiusFromRate(split.leftRate);
  const rightRadiusM = radiusFromRate(split.rightRate);
  const ratio =
    Math.max(leftRadiusM, rightRadiusM) / Math.max(1e-9, Math.min(leftRadiusM, rightRadiusM));

  return {
    hand: event.hand,
    left,
    right,
    leftRadiusM,
    rightRadiusM,
    ratio,
    reduction: split.reduction,
    lengthM: stats.lengthM,
    peaks: stats.peakCount,
    viable: [left, right].every(
      (piece) =>
        piece.totalDeg >= profile.minHeadingDeg && piece.lengthM >= profile.minCornerLengthM
    ),
    support: (Number.isFinite(ratio) ? Math.min(ratio, 8) : 8) * split.reduction,
  };
}

/**
 * Move the event count onto a target supplied from outside the trace.
 *
 * Corner numbering is partly conventional: across this catalog no curvature
 * threshold separates one official corner from two joined ones, so a count
 * that has been confirmed elsewhere is treated as the authority and the
 * geometry only decides where the boundaries fall.
 *
 * Merges are restricted to same-hand neighbours. Turn direction is P0 and must
 * never be invented, so an unreachable target fails the gate instead.
 */
function constrainEventCount(events, rate, pointCount, lapLengthM, profile, target) {
  const perPointM = lapLengthM / pointCount;
  let current = events.map((event) => normalizeEvent(event, rate, pointCount, perPointM));
  const actions = [];

  while (current.length < target) {
    let best = null;
    for (let i = 0; i < current.length; i++) {
      const candidate = splitCandidateFor(current[i], rate, pointCount, perPointM, profile);
      if (!candidate || !candidate.viable) continue;
      if (!best || candidate.support > best.candidate.support) best = { i, candidate };
    }
    if (!best) break;

    const { i, candidate } = best;
    current = [...current.slice(0, i), candidate.left, candidate.right, ...current.slice(i + 1)].sort(
      (a, b) => a.sNorm - b.sNorm
    );
    actions.push({
      type: 'split',
      hand: candidate.hand,
      fromLengthM: round(candidate.lengthM, 1),
      intoRadiiM: [round(candidate.leftRadiusM, 1), round(candidate.rightRadiusM, 1)],
      radiusRatio: round(candidate.ratio, 2),
      varianceGain: round(candidate.reduction, 3),
    });
  }

  while (current.length > target) {
    let best = null;
    for (let i = 0; i < current.length; i++) {
      const a = current[i];
      const b = current[(i + 1) % current.length];
      if (a.hand !== b.hand) continue;
      const gapM = eventGapM(a, b, pointCount, perPointM);
      const cost = gapM + Math.min(a.totalDeg, b.totalDeg) * 0.5;
      if (!best || cost < best.cost) best = { i, a, b, gapM, cost };
    }
    if (!best) break;

    const merged = normalizeEvent(
      buildEventFromRange(best.a.hand, best.a.startI, best.b.endI, rate, pointCount, perPointM),
      rate,
      pointCount,
      perPointM
    );
    const rotated = rotateStart(current, best.i);
    rotated.splice(0, 2, merged);
    current = rotated.sort((a, b) => a.sNorm - b.sNorm);
    actions.push({
      type: 'merge',
      hand: merged.hand,
      acrossGapM: round(best.gapM, 1),
      intoLengthM: round(merged.lengthM, 1),
    });
  }

  return { events: current, actions, reached: current.length === target };
}

/** Diagnostics for `scripts/probe-gpx-corner-plateaus.mjs`. Report only. */
export function plateauSplitReport(geometry, profile = RIDER_PROFILE) {
  const { lapLengthM, pointCount, turnRateDegPerM, events } = geometry;
  const perPointM = lapLengthM / pointCount;
  return events
    .map((event) => splitCandidateFor(event, turnRateDegPerM, pointCount, perPointM, profile))
    .filter(Boolean)
    .map((candidate) => ({
      hand: candidate.hand,
      lengthM: round(candidate.lengthM, 1),
      leftLenM: candidate.left.lengthM,
      rightLenM: candidate.right.lengthM,
      leftRadiusM: round(candidate.leftRadiusM, 1),
      rightRadiusM: round(candidate.rightRadiusM, 1),
      ratio: round(candidate.ratio, 2),
      reduction: round(candidate.reduction, 3),
      peaks: candidate.peaks,
      viable: candidate.viable,
    }));
}

function finalGateChecks(result) {
  const numbers = result.corners.map((c) => c.number);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) throw new Error('corner numbering is not sequential');
  }
  for (const corner of result.corners) {
    if (!Number.isFinite(corner.entryDistanceM)) throw new Error(`T${corner.number} entry distance is not finite`);
    if (!Number.isFinite(corner.apexDistanceM)) throw new Error(`T${corner.number} apex distance is not finite`);
    if (!Number.isFinite(corner.exitDistanceM)) throw new Error(`T${corner.number} exit distance is not finite`);
    if (!corner.classification) throw new Error(`T${corner.number} missing classification`);
  }
}

function summarizeProfile(profile) {
  return {
    id: profile.id,
    spacingM: profile.spacingM,
    smoothWindowM: profile.smoothWindowM,
    turnWindowM: profile.turnWindowM,
    rateFloorDegPerM: profile.rateFloorDegPerM,
    mergeGapM: profile.mergeGapM,
    minSweptDeg: profile.minSweptDeg,
    minCornerLengthM: profile.minCornerLengthM,
    minHeadingDeg: profile.minHeadingDeg,
    weakEventDegMax: profile.weakEventDegMax,
    weakEventLenM: profile.weakEventLenM,
    compoundSplitMinDeg: profile.compoundSplitMinDeg,
    underSegDensityMaxPerKm: profile.underSegDensityMaxPerKm,
  };
}

export function runGatedCornerDetection(options) {
  const profile = options.profile || RIDER_PROFILE;
  const expectedLengthM = Number.isFinite(options.expectedLengthM) ? options.expectedLengthM : null;
  const strictLapIsolation = Boolean(options.strictLapIsolation);
  const targetCornerCount =
    Number.isFinite(options.targetCornerCount) && options.targetCornerCount > 0
      ? Math.round(options.targetCornerCount)
      : null;
  const cornerShift = Number.isInteger(options.startFinishCornerShift)
    ? options.startFinishCornerShift
    : 0;
  const verifiedHands =
    options.verifiedHands && typeof options.verifiedHands === 'object' ? options.verifiedHands : null;
  const report = [];

  const parsed = runGate(
    report,
    'parse_gpx',
    () => {
      const gpxXml = String(options.gpxXml || '');
      const trackName = parseTrackName(gpxXml);
      assert(/<trkpt\b/i.test(gpxXml), 'parse_gpx', 'no GPX <trkpt> data found');
      return { gpxXml, trackName };
    },
    () => ({})
  );

  const repaired = runGate(
    report,
    'review_gpx',
    () => {
      const result = reviewAndRepairGpx(parsed.gpxXml, { expectedLengthM });
      assert(result.points.length >= 24, 'review_gpx', `repaired trace is too short (${result.points.length} points)`);
      return result;
    },
    (value) => ({
      points: value.review.chosenPoints,
      lengthM: value.review.chosenLengthM,
      closureM: value.review.closureM,
      laps: value.review.lapCandidates,
      stubs: value.review.stubCount,
      startFinishWaypoints: value.review.startFinishWaypoints,
      fixes: value.fixes,
    })
  );

  const projected = runGate(
    report,
    'project_track',
    () => {
      const origin = repaired.points[0];
      const points = projectToLocalMeters(repaired.points, origin);
      const waypoints = repaired.waypoints.map((wpt) => projectWaypointToLocalMeters(wpt, origin));
      assert(points.length >= 24, 'project_track', `not enough projected points (${points.length})`);
      return { points, waypoints, origin };
    },
    (value) => ({ points: value.points.length })
  );

  const singleLap = runGate(
    report,
    'isolate_single_lap',
    () => {
      // Review already reduced the file to one lap. A second hunt would
      // reopen a closed ring (dropFarEndJumps on a clean join).
      const points = projected.points;
      const tracedM = openPathLength(points);
      const closeGapM = distance(points[0], points[points.length - 1]);
      // Last-to-first is the closing segment of a ring, not a defect. A main
      // straight often sits on that seam (Hidden Valley 529m, Broadford 167m).
      return {
        points,
        meta: {
          strictLapIsolation,
          tracedM: round(tracedM, 1),
          startEndGapM: round(closeGapM, 1),
          method: 'gpx_review',
          selectedTravelM: round(tracedM, 1),
          selectedGapM: round(closeGapM, 1),
          outputCloseGapM: round(closeGapM, 1),
          candidateCount: repaired.review.lapCandidates,
          candidateSummary: [`gpx_review:${Math.round(tracedM)}m(gap=${round(closeGapM, 1)}m)`],
          ambiguity: { ambiguous: false, reason: '' },
        },
      };
    },
    (value) => ({
      points: value.points.length,
      tracedM: value.meta.tracedM,
      closeGapM: value.meta.outputCloseGapM,
      method: value.meta.method,
      candidateCount: value.meta.candidateCount,
      ambiguityFlag: false,
    })
  );

  const resampled = runGate(
    report,
    'resample',
    () => resampleClosed(singleLap.points, profile.spacingM),
    (value) => ({ points: value.points.length, lapLengthM: round(value.lengthM, 1) })
  );

  const smoothed = runGate(
    report,
    'smooth',
    () => smoothCircular(resampled.points, resampled.lengthM, profile.smoothWindowM),
    (value) => ({ points: value.length, windowM: profile.smoothWindowM })
  );

  const direction = runGate(
    report,
    'direction',
    () => inferDirection(smoothed),
    (value) => value
  );

  const rates = runGate(
    report,
    'turn_rate',
    () => {
      const values = turnRate(smoothed, profile.turnWindowM);
      assert(values.every((v) => Number.isFinite(v)), 'turn_rate', 'turn-rate contains non-finite values');
      return values;
    },
    (value) => ({ sampleCount: value.length })
  );

  const events = runGate(
    report,
    'turn_events',
    () => {
      const raw = turnEvents(smoothed, resampled.lengthM, {
        windowM: profile.turnWindowM,
        minDeg: profile.minSweptDeg,
        rateFloor: profile.rateFloorDegPerM,
        mergeGapM: profile.mergeGapM,
      });
      const refined = refineEventsForProfile(
        raw,
        rates,
        smoothed.length,
        resampled.lengthM,
        smoothed,
        profile
      );
      assert(refined.kept.length > 0, 'turn_events', 'no corner events detected with rider profile');
      return refined;
    },
    (value) => ({
      eventCount: value.kept.length,
      droppedSubThreshold: value.dropped.length,
      rawCount: value.stats.rawCount,
      merges: value.stats.mergeCount,
      drops: value.stats.dropCount,
      splits: value.stats.splitCount,
      enrichAdded: value.stats.enrichAdded,
      underSegmentedLikely: value.stats.underSegmentedLikely,
    })
  );

  const constrained =
    targetCornerCount == null
      ? null
      : runGate(
          report,
          'constrain_corner_count',
          () => {
            const result = constrainEventCount(
              events.kept,
              rates,
              smoothed.length,
              resampled.lengthM,
              profile,
              targetCornerCount
            );
            assert(
              result.reached,
              'constrain_corner_count',
              `cannot reach target of ${targetCornerCount} corners from ${events.kept.length} detected ` +
                `(stopped at ${result.events.length}); no further same-hand split or merge is supportable`
            );
            return result;
          },
          (value) => ({
            target: targetCornerCount,
            eventCount: value.events.length,
            splits: value.actions.filter((a) => a.type === 'split').length,
            merges: value.actions.filter((a) => a.type === 'merge').length,
          })
        );

  const activeEvents = constrained ? constrained.events : events.kept;

  const startFinish = runGate(
    report,
    'start_finish',
    () => resolveStartFinishIndex(smoothed, resampled.lengthM, projected.waypoints, activeEvents),
    (value) => value
  );

  const alignedStart =
    cornerShift === 0
      ? startFinish
      : runGate(
          report,
          'align_numbering',
          () => alignNumbering(smoothed, activeEvents, startFinish, cornerShift, resampled.lengthM),
          (value) => ({ cornerShift, index: value.index, startStraightM: value.gapM })
        );

  const corners = runGate(
    report,
    'number_and_describe',
    () =>
      buildCorners(activeEvents, rates, smoothed, resampled.lengthM, alignedStart, profile),
    (value) => ({ cornerCount: value.length })
  );

  const handCheck = verifiedHands
    ? runGate(
        report,
        'verify_turn_hands',
        () => {
          const check = verifyTurnHands(corners, verifiedHands);
          const gainShare = check.checked
            ? (check.bestAgreed - check.agreed) / check.checked
            : 0;
          assert(
            check.checked < MIN_VERIFIED_HANDS_FOR_ALIGNMENT ||
              check.bestShift === 0 ||
              gainShare < MISALIGNED_NUMBERING_GAIN_SHARE,
            'verify_turn_hands',
            `corner numbering looks misaligned: ${check.agreed}/${check.checked} verified hands agree ` +
              `as numbered, but ${check.bestAgreed}/${check.checked} agree with a shift of ${check.bestShift}. ` +
              `Set the curated alignment for this layout (scripts/calibrate-gpx-start-finish.mjs)`
          );
          return check;
        },
        (value) => ({
          checked: value.checked,
          agreed: value.agreed,
          mismatches: value.mismatches.length,
        })
      )
    : null;

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    profile: summarizeProfile(profile),
    source: {
      file: options.sourceName || 'unknown.gpx',
      trackName: parsed.trackName || path.basename(options.sourceName || 'unknown.gpx', '.gpx'),
      expectedLengthM,
      ...(targetCornerCount == null ? {} : { targetCornerCount }),
    },
    gpxReview: {
      fixes: repaired.fixes,
      warnings: repaired.warnings,
      ...repaired.review,
    },
    lapIsolation: singleLap.meta,
    track: {
      closedLoop: true,
      direction: direction.direction,
      directionConfidence: direction.confidence,
      lengthM: round(resampled.lengthM, 1),
      sampledPointCount: smoothed.length,
      rawPointCount: repaired.points.length,
    },
    startFinish: {
      source: alignedStart.source,
      confidence: alignedStart.confidence,
      index: alignedStart.index,
      ...('straightLengthM' in alignedStart ? { straightLengthM: alignedStart.straightLengthM } : {}),
      ...('snapDistanceM' in alignedStart ? { snapDistanceM: alignedStart.snapDistanceM } : {}),
      ...(cornerShift === 0
        ? {}
        : {
            cornerShift,
            geometricSource: alignedStart.geometricSource,
            geometricIndex: alignedStart.geometricIndex,
          }),
    },
    ...(handCheck ? { turnHandCheck: handCheck } : {}),
    cornerDetection: {
      count: corners.length,
      profile: profile.id,
      countSource: constrained ? 'constrained_to_target' : 'autonomous',
      refinement: events.stats,
      ...(constrained
        ? {
            countConstraint: {
              target: targetCornerCount,
              autonomousCount: events.kept.length,
              actions: constrained.actions,
            },
          }
        : {}),
      confidence: round(
        corners.reduce((sum, c) => sum + c.confidence, 0) / Math.max(1, corners.length),
        3
      ),
    },
    corners,
    gateReport: report,
  };

  // Opt-in so diagnostics can read the curvature the corners were cut from
  // without re-deriving the pipeline and drifting from it.
  if (options.includeGeometry) {
    output.geometry = {
      lapLengthM: resampled.lengthM,
      pointCount: smoothed.length,
      points: smoothed.map((point) => [round(point.x, 2), round(point.y, 2)]),
      turnRateDegPerM: rates,
      events: activeEvents.map((event) => ({
        hand: event.hand,
        startI: event.startI,
        midI: event.midI,
        endI: event.endI,
      })),
    };
  }

  runGate(report, 'final_checks', () => finalGateChecks(output), () => ({
    cornerCount: output.corners.length,
  }));

  return output;
}

export function detectCornersFromGpxFile(filePath, options = {}) {
  const gpxXml = readUtf8(filePath);
  return runGatedCornerDetection({
    ...options,
    gpxXml,
    sourceName: options.sourceName || path.basename(filePath),
  });
}
