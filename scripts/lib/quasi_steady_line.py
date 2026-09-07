"""2D quasi-steady motorcycle min-lap line on a frozen centreline + width.

The GPX / map centreline is read-only. This module only chooses a lateral
offset d(s) between explicit left/right limits. It never rewrites the road.

Theoretical model line, not a claim that a rider must use it.
d>0 is left of travel.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


G = 9.81

# A control point has to land inside the shortest corner, or no offset profile
# can reach its apex: Mallala Turn 1 is 26 m of arc, and at the old 54 m spacing
# the line crossed the centreline exactly at the apex. 16 m is roughly a third
# of a hairpin's arc, so every corner gets a control regardless of lap length.
CONTROL_SPACING_M = 16.0

# Rounding passes applied to the drawn line. The centreline is a polygon, so
# without this the line inherits every sparse GPX vertex as a hard kink.
LINE_ROUND_PASSES = 4


@dataclass(frozen=True)
class Bike:
    name: str
    ay_max: float
    ax_brake: float
    ax_accel0: float
    k_drag: float
    v_max: float
    margin_m: float = 0.4


# Mid envelope: between a momentum 250 and a drive-heavy superbike.
BIKES = {
    "250": Bike("250", ay_max=9.4, ax_brake=8.5, ax_accel0=4.2, k_drag=0.0016, v_max=58.0),
    "mid": Bike("mid", ay_max=10.6, ax_brake=10.8, ax_accel0=7.2, k_drag=0.00115, v_max=72.0),
    "superbike": Bike("superbike", ay_max=11.2, ax_brake=12.2, ax_accel0=10.4, k_drag=0.00095, v_max=86.0),
}


def closed_ring(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if len(pts) < 3:
        return pts
    if math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) < 1e-6:
        return pts[:-1]
    return pts


def resample(pts: list[tuple[float, float]], n: int) -> list[tuple[float, float]]:
    ring = closed_ring(pts)
    acc = [0.0]
    for i in range(1, len(ring) + 1):
        a = ring[i - 1]
        b = ring[i % len(ring)]
        acc.append(acc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = acc[-1] or 1.0
    out = []
    j = 0
    for k in range(n):
        target = total * k / n
        while j + 1 < len(acc) and acc[j + 1] < target:
            j += 1
        a = ring[j % len(ring)]
        b = ring[(j + 1) % len(ring)]
        span = acc[j + 1] - acc[j] or 1.0
        t = (target - acc[j]) / span
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def densify_closed(pts: list[tuple[float, float]], max_step_m: float = 5.0) -> list[tuple[float, float]]:
    """Densify while preserving every original segment and vertex.

    Unlike global equal-arc resampling, this cannot shortcut across tight bends.
    """
    ring = closed_ring(pts)
    if len(ring) < 3:
        return ring
    step = max(0.5, max_step_m)
    out: list[tuple[float, float]] = [ring[0]]
    for i in range(len(ring)):
        a = ring[i]
        b = ring[(i + 1) % len(ring)]
        seg = math.hypot(b[0] - a[0], b[1] - a[1])
        parts = max(1, int(math.ceil(seg / step)))
        for k in range(1, parts + 1):
            t = k / parts
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out[:-1]


def arc_and_ds(pts: list[tuple[float, float]]) -> tuple[list[float], list[float]]:
    n = len(pts)
    ds = []
    acc = [0.0]
    for i in range(n):
        a = pts[i]
        b = pts[(i + 1) % n]
        step = math.hypot(b[0] - a[0], b[1] - a[1])
        ds.append(max(step, 1e-4))
        acc.append(acc[-1] + ds[-1])
    return acc[:-1], ds


def headings_normals(pts: list[tuple[float, float]]):
    n = len(pts)
    heads = []
    for i in range(n):
        a = pts[(i - 1) % n]
        b = pts[(i + 1) % n]
        hx, hy = b[0] - a[0], b[1] - a[1]
        mag = math.hypot(hx, hy) or 1.0
        heads.append((hx / mag, hy / mag))
    normals = [(-hy, hx) for hx, hy in heads]
    return heads, normals


def _wrap_pi(value: float) -> float:
    while value > math.pi:
        value -= 2.0 * math.pi
    while value < -math.pi:
        value += 2.0 * math.pi
    return value


def curvature(pts: list[tuple[float, float]], ds: list[float]) -> list[float]:
    """Local wrapped heading deltas avoid fake S/F hairpins."""
    n = len(pts)
    heads, _ = headings_normals(pts)
    angs = [math.atan2(hy, hx) for hx, hy in heads]
    kappa = []
    for i in range(n):
        dpsi = _wrap_pi(angs[(i + 1) % n] - angs[(i - 1) % n])
        span = ds[(i - 1) % n] + ds[i]
        kappa.append(dpsi / max(span, 1e-4))
    return _smooth(kappa, 5)


def _smooth(values: list[float], win: int) -> list[float]:
    if win < 2:
        return values
    half = win // 2
    n = len(values)
    out = []
    for i in range(n):
        sl = [values[(i + k) % n] for k in range(-half, half + 1)]
        out.append(sum(sl) / len(sl))
    return out


def line_from_offsets(
    centre: list[tuple[float, float]],
    normals: list[tuple[float, float]],
    d: list[float],
) -> list[tuple[float, float]]:
    return [
        (c[0] + n[0] * off, c[1] + n[1] * off)
        for c, n, off in zip(centre, normals, d)
    ]


def round_corners(pts: list[tuple[float, float]], passes: int) -> list[tuple[float, float]]:
    """Take the hard vertices out of the line.

    The centreline is a polygon, so line_from_offsets inherits a sharp vertex
    wherever the GPX sampled a corner in one step. No lateral offset can undo
    that, and a bike cannot change heading instantly, so the overlay is rounded
    directly. The road itself is never touched.
    """
    if passes < 1:
        return pts
    n = len(pts)
    for _ in range(passes):
        nxt = []
        for i in range(n):
            a = pts[(i - 1) % n]
            b = pts[i]
            c = pts[(i + 1) % n]
            nxt.append(((a[0] + 2.0 * b[0] + c[0]) * 0.25, (a[1] + 2.0 * b[1] + c[1]) * 0.25))
        pts = nxt
    return pts


def hold_inside(
    pts: list[tuple[float, float]],
    centre: list[tuple[float, float]],
    lim: float,
    span: int = 3,
) -> list[tuple[float, float]]:
    """Pull anything rounding pushed past the edge back onto the limit.

    Distance is measured to the centreline polyline, not to the point of equal
    index, because rounding slides points along the road as well as across it.
    That distance is also the right test for a round-joined stroke: the drawn
    ribbon is every point within half the width of the polyline.
    """
    n = len(centre)
    out = []
    for i, p in enumerate(pts):
        best_d2 = float("inf")
        foot = centre[i % n]
        for o in range(-span, span + 1):
            a = centre[(i + o) % n]
            b = centre[(i + o + 1) % n]
            abx, aby = b[0] - a[0], b[1] - a[1]
            len2 = abx * abx + aby * aby
            t = 0.0
            if len2 > 1e-12:
                t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2
                t = max(0.0, min(1.0, t))
            fx, fy = a[0] + abx * t, a[1] + aby * t
            d2 = (p[0] - fx) ** 2 + (p[1] - fy) ** 2
            if d2 < best_d2:
                best_d2 = d2
                foot = (fx, fy)
        dist = math.sqrt(best_d2)
        if dist <= lim or dist <= 1e-9:
            out.append(p)
            continue
        k = lim / dist
        out.append((foot[0] + (p[0] - foot[0]) * k, foot[1] + (p[1] - foot[1]) * k))
    return out


def signed_offsets(
    line: list[tuple[float, float]],
    centre: list[tuple[float, float]],
    normals: list[tuple[float, float]],
) -> list[float]:
    return [
        (p[0] - c[0]) * nrm[0] + (p[1] - c[1]) * nrm[1]
        for p, c, nrm in zip(line, centre, normals)
    ]


def interpolate_controls(s: list[float], total: float, controls: list[float]) -> list[float]:
    n = len(controls)
    out = []
    for si in s:
        t = ((si / total) * n) % n
        i0 = int(t) % n
        f = t - math.floor(t)
        f = 0.5 - 0.5 * math.cos(math.pi * f)
        out.append(controls[i0] + (controls[(i0 + 1) % n] - controls[i0]) * f)
    return _smooth(out, 7)


def clamp_offsets(d: list[float], half_w: float, margin: float) -> list[float]:
    lim = max(0.2, half_w - margin)
    return [max(-lim, min(lim, v)) for v in d]


def _ax_remaining(ax_peak: float, ay: float, ay_max: float) -> float:
    frac = max(0.0, 1.0 - (ay / max(ay_max, 1e-6)) ** 2)
    return ax_peak * math.sqrt(frac)


def speed_profile(kappa: list[float], ds: list[float], bike: Bike) -> list[float]:
    n = len(kappa)
    v = []
    for k in kappa:
        v_lat = math.sqrt(bike.ay_max / max(abs(k), 1e-5))
        v.append(min(bike.v_max, v_lat))
    for _ in range(2):
        for i in range(n - 1, -1, -1):
            j = (i + 1) % n
            ay = min(bike.ay_max * 0.98, v[j] * v[j] * abs(kappa[i]))
            a = _ax_remaining(bike.ax_brake, ay, bike.ay_max)
            v[i] = min(v[i], math.sqrt(max(0.0, v[j] * v[j] + 2.0 * a * ds[i])))
        for i in range(n):
            j = (i + 1) % n
            ay = min(bike.ay_max * 0.98, v[i] * v[i] * abs(kappa[i]))
            a_peak = max(0.15, bike.ax_accel0 - bike.k_drag * v[i] * v[i])
            a = _ax_remaining(a_peak, ay, bike.ay_max)
            v[j] = min(v[j], math.sqrt(v[i] * v[i] + 2.0 * a * ds[i]))
    return v


def lap_time(ds: list[float], v: list[float]) -> float:
    return sum(step / max(speed, 0.5) for step, speed in zip(ds, v))


def smoothness(kappa: list[float], ds: list[float]) -> float:
    n = len(kappa)
    cost = 0.0
    for i in range(n):
        dk = kappa[(i + 1) % n] - kappa[i]
        cost += (dk * dk) / max(ds[i], 1e-4)
    return cost


def _seg_intersect(
    a1: tuple[float, float],
    a2: tuple[float, float],
    b1: tuple[float, float],
    b2: tuple[float, float],
) -> bool:
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    o1 = orient(a1, a2, b1)
    o2 = orient(a1, a2, b2)
    o3 = orient(b1, b2, a1)
    o4 = orient(b1, b2, a2)
    return (o1 * o2 < 0) and (o3 * o4 < 0)


def count_self_intersections(path: list[tuple[float, float]]) -> int:
    n = len(path)
    if n < 4:
        return 0
    total = 0
    for i in range(n):
        a1 = path[i]
        a2 = path[(i + 1) % n]
        for j in range(i + 2, n):
            if (i + 1) % n == j:
                continue
            if (j + 1) % n == i:
                continue
            b1 = path[j]
            b2 = path[(j + 1) % n]
            if _seg_intersect(a1, a2, b1, b2):
                total += 1
    return total


def evaluate(
    centre: list[tuple[float, float]],
    normals: list[tuple[float, float]],
    s: list[float],
    half_w: float,
    controls: list[float],
    bike: Bike,
    enforce_apex: list[int] | None = None,
    kappa_ref: list[float] | None = None,
    round_passes: int = 0,
) -> dict:
    total = s[-1] + math.hypot(centre[0][0] - centre[-1][0], centre[0][1] - centre[-1][1])
    if total <= 0:
        total = 1.0
    d = clamp_offsets(interpolate_controls(s, total, controls), half_w, bike.margin_m)
    line = line_from_offsets(centre, normals, d)
    if round_passes > 0:
        # Round the drawn line inside the search, so the time and smoothness the
        # optimiser reads belong to the line that ships.
        line = hold_inside(round_corners(line, round_passes), centre, max(0.2, half_w - bike.margin_m))
        d = signed_offsets(line, centre, normals)
    _, ds = arc_and_ds(line)
    kappa = curvature(line, ds)
    v = speed_profile(kappa, ds, bike)
    t = lap_time(ds, v)
    j_smooth = smoothness(kappa, ds)
    j_wrong_side = 0.0
    if enforce_apex and kappa_ref:
        for i in enforce_apex:
            if d[i] * kappa_ref[i] < 0:
                j_wrong_side += abs(d[i]) + 0.2
    return {
        "d": d,
        "line": line,
        "ds": ds,
        "kappa": kappa,
        "v": v,
        "time": t,
        "cost": t + 0.012 * j_smooth + 220.0 * j_wrong_side,
        "max_lean_deg": max(math.degrees(math.atan(min(2.5, speed * speed * abs(k) / G))) for speed, k in zip(v, kappa)),
    }


def geometric_seed(
    centre: list[tuple[float, float]],
    kappa: list[float],
    half_w: float,
    n_ctrl: int,
) -> tuple[list[float], list[int]]:
    """Inside at curvature peaks, outside on the approaches — a 250-ish start."""
    n = len(centre)
    usable = half_w * 0.82
    k_abs = [abs(k) for k in kappa]
    k_ref = sorted(k_abs)[int(n * 0.70)] or 0.01
    s, ds = arc_and_ds(centre)
    total = sum(ds)
    d = []
    apexes: list[int] = []
    base_thresh = k_ref * 0.22
    seam_strict = max(base_thresh * 2.6, 0.012)
    seam_window_m = 45.0
    for i, k in enumerate(kappa):
        near_seam = min(s[i], total - s[i]) <= seam_window_m
        is_turn = abs(k) > base_thresh and (not near_seam or abs(k) >= seam_strict)
        tight = min(1.0, abs(k) / (k_ref * 1.35))
        d.append(math.copysign(usable * tight, k) if is_turn else 0.0)
        is_apex = is_turn and abs(k) >= abs(kappa[(i - 1) % n]) and abs(k) >= abs(kappa[(i + 1) % n])
        if is_apex:
            apexes.append(i)
    apexes.sort(key=lambda i: s[i])
    deduped: list[int] = []
    for i in apexes:
        if deduped:
            prev = deduped[-1]
            if (s[i] - s[prev]) < 28.0:
                if abs(kappa[i]) > abs(kappa[prev]):
                    deduped[-1] = i
                continue
        deduped.append(i)
    if len(deduped) > 1:
        first = deduped[0]
        last = deduped[-1]
        wrap_gap = (s[first] + total) - s[last]
        if wrap_gap < 28.0:
            keep = first if abs(kappa[first]) >= abs(kappa[last]) else last
            deduped = [i for i in deduped if i not in (first, last)] + [keep]
            deduped.sort(key=lambda i: s[i])
    apexes = deduped
    d = _smooth(d, 11)
    controls = []
    for c in range(n_ctrl):
        target = total * c / n_ctrl
        best_i = min(range(n), key=lambda i: abs(s[i] - target))
        controls.append(d[best_i])
    return controls, apexes


def optimize(
    centre: list[tuple[float, float]],
    half_w: float,
    bike: Bike,
    n_ctrl: int | None = None,
    rounds: int = 8,
    round_passes: int = LINE_ROUND_PASSES,
) -> dict:
    _, ds0 = arc_and_ds(centre)
    s, _ = arc_and_ds(centre)
    if n_ctrl is None:
        n_ctrl = max(48, min(260, int(round(sum(ds0) / CONTROL_SPACING_M))))
    kappa0 = curvature(centre, ds0)
    _, normals = headings_normals(centre)
    seed_controls, apexes = geometric_seed(centre, kappa0, half_w, n_ctrl)
    enforce_apex = [i for i in apexes if abs(kappa0[i]) >= 0.03]

    controls = seed_controls[:]
    best = evaluate(centre, normals, s, half_w, controls, bike, enforce_apex, kappa0, round_passes)
    step = half_w * 0.35
    for _ in range(rounds):
        improved = False
        for i in range(n_ctrl):
            for delta in (step, -step):
                trial = controls[:]
                trial[i] = max(-half_w, min(half_w, trial[i] + delta))
                ev = evaluate(centre, normals, s, half_w, trial, bike, enforce_apex, kappa0, round_passes)
                if ev["cost"] < best["cost"] - 1e-4:
                    best = ev
                    controls = trial
                    improved = True
        if not improved:
            step *= 0.45
        else:
            step *= 0.72
        if step < 0.06:
            break

    best["controls"] = controls
    best["apexes"] = apexes
    best["kappa0"] = kappa0
    best["s"] = s
    best["total"] = sum(ds0)
    best["n_ctrl"] = n_ctrl
    best["self_crossings"] = count_self_intersections(best["line"])
    return best
