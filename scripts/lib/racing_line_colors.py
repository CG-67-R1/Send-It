"""Colour ramp for the racing line overlay.

The only definition of the ramp in the repo. Colours are baked into the racing
line JSON as a palette plus a band index per point, so the app renders what it
is given and never computes a colour itself.

Bands come from longitudinal acceleration along the solved line, so the ramp
lands where the model brakes and drives rather than where a guess would put it.
It is an aesthetic guide, not telemetry, and no lap time is implied by it.
"""

from __future__ import annotations

from .quasi_steady_line import Bike, _ax_remaining, _smooth

# u is longitudinal acceleration as a fraction of what the bike still has
# available at that speed and lean: -1 is threshold braking, 0 is neutral, +1 is
# full drive. Blue sits just below neutral (brake coming off) and green just
# above (throttle picking up), which puts the ramp in the order a rider works
# through: brake, release, pick up the throttle, then pin it.
STOPS: list[tuple[float, tuple[int, int, int]]] = [
    (-1.00, (0xDC, 0x26, 0x26)),  # hard braking
    (-0.25, (0x25, 0x63, 0xEB)),  # brake released
    (0.20, (0x16, 0xA3, 0x4A)),  # throttle applied
    (1.00, (0xFA, 0xCC, 0x15)),  # full throttle
]

# Enough steps to read as a gradient, few enough that the app draws one path per
# colour instead of one per run.
BAND_COUNT = 8

# A minimum-time solution is close to bang-bang: at the brake limit or the drive
# limit almost everywhere, swapping between them over a few metres. Smoothing
# over ~15 points (points sit <=5 m apart, so roughly 60-70 m on any track)
# spreads that swap into a sweep you can read. Wider than this and the braking
# zones stop being recognisably red.
_SMOOTH_WIN = 15

# Near an apex the friction ellipse leaves almost no longitudinal grip, and
# dividing by that would turn rounding noise into colour. a_x is ~0 there
# anyway, so a floor keeps the apex neutral instead of random.
_AVAIL_FLOOR = 0.5


def _color_at(u: float) -> tuple[int, int, int]:
    """Piecewise-linear RGB interpolation across the stop table."""
    if u <= STOPS[0][0]:
        return STOPS[0][1]
    if u >= STOPS[-1][0]:
        return STOPS[-1][1]
    for (u0, c0), (u1, c1) in zip(STOPS, STOPS[1:]):
        if u0 <= u <= u1:
            f = (u - u0) / (u1 - u0)
            return (
                round(c0[0] + (c1[0] - c0[0]) * f),
                round(c0[1] + (c1[1] - c0[1]) * f),
                round(c0[2] + (c1[2] - c0[2]) * f),
            )
    return STOPS[-1][1]


def band_index(u: float) -> int:
    t = (max(-1.0, min(1.0, u)) + 1.0) * 0.5
    return max(0, min(BAND_COUNT - 1, round(t * (BAND_COUNT - 1))))


def band_u(band: int) -> float:
    """The u a band stands for — the inverse of band_index."""
    return -1.0 + 2.0 * band / (BAND_COUNT - 1)


def palette() -> list[str]:
    """Hex colour per band, sampled at the u each band represents."""
    return ["#{:02x}{:02x}{:02x}".format(*_color_at(band_u(b))) for b in range(BAND_COUNT)]


def band_rgba(band: int) -> tuple[int, int, int, int]:
    """Same colour as the palette, in the form PIL wants for previews."""
    r, g, b = _color_at(band_u(band))
    return (r, g, b, 255)


def bands_for(v: list[float], ds: list[float], kappa: list[float], bike: Bike) -> list[int]:
    """Band per point of a closed line, from a_x = d(v^2/2)/ds.

    Measuring a_x against what is still available, rather than against the
    zero-speed peak, is what makes the ramp read as throttle and brake rather
    than as raw g. Drag eats most of the drive at the end of a straight, so
    full throttle there is only about 40% of the standing-start figure and
    would otherwise never reach yellow.
    """
    n = len(v)
    u = []
    for i in range(n):
        ax = (v[(i + 1) % n] ** 2 - v[i] ** 2) / (2.0 * max(ds[i], 1e-4))
        ay = v[i] ** 2 * abs(kappa[i])
        if ax < 0:
            avail = _ax_remaining(bike.ax_brake, ay, bike.ay_max)
        else:
            drive = max(0.15, bike.ax_accel0 - bike.k_drag * v[i] ** 2)
            avail = _ax_remaining(drive, ay, bike.ay_max)
        u.append(max(-1.0, min(1.0, ax / max(avail, _AVAIL_FLOOR))))
    return [band_index(x) for x in _smooth(u, _SMOOTH_WIN)]
