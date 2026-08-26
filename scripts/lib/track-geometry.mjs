/**
 * Shared geometry for Track Memory baking and auditing.
 *
 * Turn hands are never derived here for storage — they come from the catalog and
 * app/src/data/track_turn_verification.json. Geometry only decides *where* a
 * known corner sits, by matching the verified hand sequence to the turns the
 * path actually makes.
 */

/** Bearing grows clockwise, so a positive delta is a right-hand turn. */
export function bearing(a, b) {
  return Math.atan2(b.x - a.x, b.y - a.y);
}

export function angDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export const toDeg = (r) => (r * 180) / Math.PI;

export function meanSpacing(points) {
  const n = points.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum / n;
}

/** Signed turn rate per index in degrees per metre. Negative left, positive right. */
export function turnRate(points, windowM = 12) {
  const n = points.length;
  const step = Math.max(1, Math.round(windowM / meanSpacing(points)));
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const prev = points[(i - step + n) % n];
    const here = points[i];
    const next = points[(i + step) % n];
    const arc =
      Math.hypot(here.x - prev.x, here.y - prev.y) + Math.hypot(next.x - here.x, next.y - here.y);
    out[i] = arc > 0.01 ? toDeg(angDelta(bearing(prev, here), bearing(here, next))) / (arc / 2) : 0;
  }
  return out;
}

/**
 * |deg/m| above this counts as cornering rather than a straight.
 *
 * Deliberately low: a fast large-radius sweeper (Phillip Island's Doohan) never
 * exceeds the rate of a hairpin, so a high floor finds hairpins and silently
 * drops half a circuit. Corners are separated by *total swept angle* instead.
 */
export const CORNER_DEG_PER_M = 0.12;
/** Total swept angle below this is a kink in a straight, not a corner. */
export const EVENT_MIN_DEG = 20;
/** Same-hand cornering split by less straight than this is one corner. */
const MERGE_GAP_M = 32;

/**
 * Turns the path actually makes, around the closed lap.
 *
 * Each event's station is the *middle* of the corner by swept angle, which is
 * where the apex is and where a corner board or coaching cue belongs — not the
 * point of peak curvature, which drifts to the tightest part of the exit.
 */
export function turnEvents(points, lengthM, opts = {}) {
  const minDeg = opts.minDeg ?? EVENT_MIN_DEG;
  const n = points.length;
  const rate = turnRate(points, opts.windowM ?? 15);
  const perPoint = lengthM / n;
  const floor = opts.rateFloor ?? CORNER_DEG_PER_M;

  const handOf = (i) => (rate[i] <= -floor ? 'left' : rate[i] >= floor ? 'right' : null);

  // Start the scan on a straight so no corner is split across index 0
  let origin = 0;
  while (origin < n && handOf(origin) !== null) origin++;
  if (origin >= n) origin = 0;

  /** Raw alternating runs of left / right / straight. */
  const runs = [];
  for (let k = 0; k < n; k++) {
    const i = (origin + k) % n;
    const hand = handOf(i);
    const last = runs[runs.length - 1];
    if (last && last.hand === hand) {
      last.idx.push(i);
    } else {
      runs.push({ hand, idx: [i] });
    }
  }

  // A brief straight inside a corner (camera noise, double-apex) is not an exit
  for (let i = 1; i < runs.length - 1; ) {
    const gap = runs[i];
    const before = runs[i - 1];
    const after = runs[i + 1];
    if (
      gap.hand === null &&
      before.hand &&
      before.hand === after.hand &&
      gap.idx.length * perPoint < MERGE_GAP_M
    ) {
      before.idx.push(...gap.idx, ...after.idx);
      runs.splice(i, 2);
      continue;
    }
    i++;
  }

  const events = [];
  for (const run of runs) {
    if (!run.hand) continue;
    const sweep = run.idx.reduce((sum, i) => sum + Math.abs(rate[i]) * perPoint, 0);
    if (sweep < minDeg) continue;
    // Station at half the swept angle — the geometric middle of the corner
    let acc = 0;
    let midI = run.idx[0];
    for (const i of run.idx) {
      acc += Math.abs(rate[i]) * perPoint;
      if (acc >= sweep / 2) {
        midI = i;
        break;
      }
    }
    events.push({
      hand: run.hand,
      startI: run.idx[0],
      endI: run.idx[run.idx.length - 1],
      midI,
      sNorm: midI / n,
      lengthM: Math.round(run.idx.length * perPoint),
      totalDeg: Math.round(sweep),
    });
  }

  return events.sort((a, b) => a.sNorm - b.sNorm);
}

/** Sharp heading breaks — loop-closure seams and other geometry faults. */
export function findKinks(points, kinkDeg = 12) {
  const n = points.length;
  const step = Math.max(1, Math.round(4 / meanSpacing(points)));
  const raw = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - step + n) % n];
    const here = points[i];
    const next = points[(i + step) % n];
    const d = Math.abs(toDeg(angDelta(bearing(prev, here), bearing(here, next))));
    if (d >= kinkDeg) raw.push({ i, sNorm: i / n, deg: d });
  }
  const merged = [];
  for (const k of raw) {
    const last = merged[merged.length - 1];
    if (last && k.i - last.i <= step * 3) {
      if (k.deg > last.deg) merged[merged.length - 1] = k;
      continue;
    }
    merged.push(k);
  }
  return merged;
}

/** Averaged |deg/m| at a station that reads as cornering rather than a straight. */
export const AUDIT_DEG_PER_M = 0.25;

export function avgTurnRateAt(points, lengthM, sNorm, rateCache) {
  const n = points.length;
  const rate = rateCache ?? turnRate(points, 15);
  const half = Math.max(1, Math.round((18 / lengthM) * n));
  const i0 = ((Math.round(sNorm * n) % n) + n) % n;
  let sum = 0;
  for (let k = -half; k <= half; k++) sum += rate[(((i0 + k) % n) + n) % n];
  return sum / (half * 2 + 1);
}

export function handFromRate(avg, floor = AUDIT_DEG_PER_M) {
  if (avg <= -floor) return 'left';
  if (avg >= floor) return 'right';
  return 'straight';
}

/** Hand the geometry turns at a station, averaged over a corner-scale window. */
export function handAt(points, lengthM, sNorm, rateCache) {
  return handFromRate(avgTurnRateAt(points, lengthM, sNorm, rateCache));
}

/**
 * Slide each verified left|right station to the strongest matching-hand sample
 * strictly between its neighbours. Does not invent a turn — if the window has
 * no matching geometry the original station is kept.
 */
export function snapStationsToVerifiedHands(playable, sNorms, points, lengthM, verifiedHands) {
  const rate = turnRate(points, 15);
  const out = sNorms.slice();
  for (let i = 0; i < playable.length; i++) {
    const want = verifiedHands[String(playable[i].number)] ?? playable[i].direction;
    if (want !== 'left' && want !== 'right') continue;
    const lo = (i === 0 ? 0 : out[i - 1]) + 0.008;
    const hi = (i === playable.length - 1 ? 0.999 : out[i + 1]) - 0.008;
    if (!(hi > lo)) continue;
    let bestS = null;
    let bestMag = -1;
    const steps = Math.max(32, Math.round((hi - lo) * 250));
    for (let k = 0; k <= steps; k++) {
      const s = lo + ((hi - lo) * k) / steps;
      const avg = avgTurnRateAt(points, lengthM, s, rate);
      if (handFromRate(avg) !== want) continue;
      const mag = Math.abs(avg);
      if (mag > bestMag) {
        bestMag = mag;
        bestS = s;
      }
    }
    if (bestS != null) out[i] = bestS;
  }
  return out;
}

/**
 * Expand catalog corners into one slot per real turn.
 *
 * Catalog entries cover ranges ("Turns 7-10 esses"), so the gap to the next
 * turn number tells us how many turns an entry spans. Only the first slot of an
 * entry carries the label — that is where the corner board and cue belong.
 */
export function expandCornerSlots(catalogCorners, verifiedHands = {}) {
  const playable = catalogCorners
    .filter((c) => !c.isFinish && c.number != null)
    .sort((a, b) => a.number - b.number);

  const slots = [];
  for (let i = 0; i < playable.length; i++) {
    const c = playable[i];
    const next = playable[i + 1];
    const span = next ? Math.max(1, next.number - c.number) : labelledSpan(c.label);
    const hand = verifiedHands[String(c.number)] ?? c.direction;
    for (let k = 0; k < span; k++) {
      slots.push({
        cornerIndex: i,
        primary: k === 0,
        // Only the entry's own turn number has a verified hand; the turns it
        // absorbs are unconstrained.
        hand: k === 0 && (hand === 'left' || hand === 'right') ? hand : null,
      });
    }
  }
  return { playable, slots };
}

/** "Turns 15-16" / "Turns 1 & 2" / "Turn 4 ... + Turn 5" cover more than one turn. */
function labelledSpan(label) {
  const text = String(label || '');
  const range = text.match(/Turns?\s+(\d+)\s*(?:-|–|&|and|to)\s*(\d+)/i);
  if (range) return Math.max(1, Number(range[2]) - Number(range[1]) + 1);
  const plus = text.match(/Turn\s+(\d+)[^\d]+Turn\s+(\d+)/i);
  if (plus) return Math.max(1, Number(plus[2]) - Number(plus[1]) + 1);
  return 1;
}

const WRONG_HAND_COST = 6;
/**
 * Leaving a turn the catalog lists unmatched is normally cheap, but dropping a
 * *verified* corner must cost more than a hand mismatch — otherwise the matcher
 * hides every conflict by skipping, and the audit always reads clean.
 */
const SKIP_SLOT_COST = 1.6;
const SKIP_VERIFIED_SLOT_COST = 9;

const skipSlotCost = (slot) => (slot.hand ? SKIP_VERIFIED_SLOT_COST : SKIP_SLOT_COST);

/**
 * Monotonic alignment of catalog turn slots onto detected turn events.
 *
 * Turn 1 is the first turn after the start-finish line, so by default the event
 * list is *not* rotated: slots consume events in lap order from s=0. Letting the
 * rotation float instead gives the matcher enough freedom to satisfy any hand
 * sequence, which makes the result unverifiable.
 *
 * Cost punishes putting a verified left on a right-hand turn far harder than
 * leaving a turn unlabelled.
 */
export function alignCornersToEvents(slots, events, opts = {}) {
  if (!slots.length || !events.length) return null;
  const m = slots.length;
  const k = events.length;
  const rotations = opts.freeRotation ? k : 1;
  let best = null;

  for (let r = 0; r < rotations; r++) {
    const rotated = [];
    for (let j = 0; j < k; j++) rotated.push(events[(r + j) % k]);

    const INF = Infinity;
    const cost = Array.from({ length: m + 1 }, () => new Float64Array(k + 1).fill(INF));
    const from = Array.from({ length: m + 1 }, () => new Int8Array(k + 1));
    cost[0][0] = 0;
    for (let j = 1; j <= k; j++) {
      cost[0][j] = cost[0][j - 1] + skipEventCost(rotated[j - 1]);
      from[0][j] = 2;
    }
    for (let i = 1; i <= m; i++) {
      cost[i][0] = cost[i - 1][0] + skipSlotCost(slots[i - 1]);
      from[i][0] = 3;
      for (let j = 1; j <= k; j++) {
        const slot = slots[i - 1];
        const ev = rotated[j - 1];
        const match =
          cost[i - 1][j - 1] + (slot.hand && slot.hand !== ev.hand ? WRONG_HAND_COST : 0);
        const skipEv = cost[i][j - 1] + skipEventCost(ev);
        const skipSlot = cost[i - 1][j] + skipSlotCost(slot);
        let c = match;
        let f = 1;
        if (skipEv < c) {
          c = skipEv;
          f = 2;
        }
        if (skipSlot < c) {
          c = skipSlot;
          f = 3;
        }
        cost[i][j] = c;
        from[i][j] = f;
      }
    }

    if (best && cost[m][k] >= best.cost) continue;

    const pairs = new Map();
    let i = m;
    let j = k;
    while (i > 0 || j > 0) {
      const f = from[i][j];
      if (f === 1) {
        pairs.set(i - 1, rotated[j - 1]);
        i--;
        j--;
      } else if (f === 2) {
        j--;
      } else {
        i--;
      }
    }
    best = { cost: cost[m][k], rotation: r, pairs };
  }

  return best;
}

function skipEventCost(ev) {
  return 0.6 + ev.totalDeg / 180;
}

/**
 * How many verified hands the alignment satisfies — the pass/fail signal.
 * An unmatched verified corner counts against the score, not as "not checked".
 */
export function scoreAlignment(slots, pairs) {
  let checked = 0;
  let agreed = 0;
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].hand) continue;
    checked++;
    const ev = pairs.get(i);
    if (ev && ev.hand === slots[i].hand) agreed++;
  }
  return { checked, agreed };
}

/**
 * Longest run of near-straight path, as an index range on the closed ring.
 * Used to find the start-finish straight when nothing else pins the lap.
 */
export function longestStraight(points, lengthM, maxRate = 0.22) {
  const n = points.length;
  const rate = turnRate(points, 12);
  const perPoint = lengthM / n;
  let best = { startI: 0, endI: 0, lenM: 0 };
  let runStart = null;
  for (let k = 0; k < n * 2; k++) {
    const i = k % n;
    if (Math.abs(rate[i]) < maxRate) {
      if (runStart === null) runStart = k;
      const lenM = (k - runStart + 1) * perPoint;
      if (lenM > best.lenM && lenM < lengthM * 0.6) {
        best = { startI: runStart % n, endI: i, lenM };
      }
    } else {
      runStart = null;
    }
  }
  return best;
}
