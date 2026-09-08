#!/usr/bin/env python3
"""Build the suggested racing line overlay for every Track Details layout.

The GPX map JSON is read-only. Track limits are the left/right offsets of the
drawn grey ribbon, so the line is always inside the road the app paints. The
solver only chooses a lateral offset inside those limits.

Output is a polyline in the same 0-100 space as the map, so the app can draw it
with the same SVG viewBox.

Usage:
  python scripts/build-racing-lines.py                        # every map
  python scripts/build-racing-lines.py --exclude wanneroo     # skip a layout
  python scripts/build-racing-lines.py mallala winton         # named subset
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.gpx_track_preview import GRASS, SIZE, SURFACE_WIDTH, draw_ribbon
from lib.quasi_steady_line import BIKES, densify_closed, optimize
from lib.racing_line_colors import band_rgba, bands_for, palette

MAPS_DIR = REPO / "app" / "src" / "data" / "gpxTrackMaps"
APP_OUT = REPO / "app" / "src" / "data" / "racingLines"
ANDROID_OUT = REPO / "android-app" / "src" / "data" / "racingLines"
CATALOG_PATH = REPO / "app" / "src" / "data" / "tracks.json"
PREVIEW_DIR = REPO / "tmp" / "racing-line-previews"


def catalog_tracks() -> dict[str, dict]:
    doc = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return {t["id"]: t for t in doc.get("tracks", [])}


def parse_length_m(length_km: str | None) -> float | None:
    if not length_km:
        return None
    digits = "".join(c for c in str(length_km) if c.isdigit() or c == ".")
    try:
        return float(digits) * 1000.0
    except ValueError:
        return None


def json_to_metres(
    polyline: list[list[float]], length_m: float
) -> tuple[list[tuple[float, float]], float]:
    """Map units to metres, flipping y so the solver works in a y-up frame."""
    pts = [(p[0], 100.0 - p[1]) for p in polyline]
    length = 0.0
    for i in range(1, len(pts)):
        length += math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) > 1e-6:
        length += math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1])
    scale = length_m / max(length, 1e-6)
    return [(x * scale, y * scale) for x, y in pts], scale


def metres_to_json(pts: list[tuple[float, float]], scale: float) -> list[list[float]]:
    return [[round(x / scale, 2), round(100.0 - y / scale, 2)] for x, y in pts]


def ribbon_half_width_m(scale: float, width_px: float) -> float:
    """Half-width of a preview stroke, in metres."""
    return (width_px / 2.0) / SIZE * 100.0 * scale


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
            if j == i or (j + 1) % n == i:
                continue
            if (i + 1) % n == j:
                continue
            b1 = path[j]
            b2 = path[(j + 1) % n]
            if _seg_intersect(a1, a2, b1, b2):
                total += 1
    return total


def max_distance_to_road(
    line: list[tuple[float, float]],
    centre: list[tuple[float, float]],
    span: int = 10,
) -> float:
    """Furthest the guide line strays from the centreline polyline.

    The ribbon is drawn as a round-joined stroke, so it covers exactly the
    points within half a width of that polyline; this is the containment test.
    """
    m = len(centre)
    worst = 0.0
    for i, p in enumerate(line):
        best = float("inf")
        for o in range(-span, span + 1):
            a = centre[(i + o) % m]
            b = centre[(i + o + 1) % m]
            abx, aby = b[0] - a[0], b[1] - a[1]
            len2 = abx * abx + aby * aby
            t = 0.0
            if len2 > 1e-12:
                t = max(0.0, min(1.0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2))
            fx, fy = a[0] + abx * t, a[1] + aby * t
            best = min(best, math.hypot(p[0] - fx, p[1] - fy))
        worst = max(worst, best)
    return worst


def write_preview(track_id: str, source: list[list[float]], json_line, bands) -> None:
    """Same palette the app draws, so the picture and the phone agree."""
    px = [(x / 100.0 * SIZE, y / 100.0 * SIZE) for x, y in json_line]
    img = Image.new("RGBA", (SIZE, SIZE), GRASS)
    draw = ImageDraw.Draw(img)
    draw_ribbon(draw, source)
    for i in range(len(px) - 1):
        draw.line([px[i], px[i + 1]], fill=band_rgba(bands[i]), width=3, joint="curve")
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    img.save(PREVIEW_DIR / f"{track_id}.png", "PNG")


def build_one(track_id: str, track: dict, bike) -> dict:
    length_m = parse_length_m(track.get("lengthKm"))
    if not length_m:
        raise RuntimeError(f"catalog has no usable lengthKm ({track.get('lengthKm')!r})")

    source = json.loads((MAPS_DIR / f"{track_id}.json").read_text(encoding="utf-8"))["polyline"]
    metres, scale = json_to_metres(source, length_m)
    half_w = ribbon_half_width_m(scale, SURFACE_WIDTH)
    # Densify along each original segment (no corner shortcuts).
    centre = densify_closed(metres, max_step_m=5.0)
    if count_self_intersections(metres) > 0 or count_self_intersections(centre) > 0:
        raise RuntimeError("map centreline crosses itself; fix the GPX before solving")

    result = optimize(centre, half_w, bike)

    # Offset along a point's own normal overstates the distance at a sharp
    # centreline vertex, so containment is measured against the road itself.
    off_road = max_distance_to_road(result["line"], centre)
    if off_road > half_w + 1e-6:
        raise RuntimeError(
            f"line reaches {off_road:.2f} m from the centreline but the asphalt is "
            f"only {half_w:.2f} m wide either side"
        )

    json_line = metres_to_json(result["line"], scale)
    # The line has to stay one loop in every space it is expressed in, or the
    # picture can disagree with the model it was solved from.
    model_crossings = count_self_intersections(result["line"])
    json_crossings = count_self_intersections([(x, y) for x, y in json_line])
    if model_crossings > 0:
        raise RuntimeError("racing line crosses itself")
    if json_crossings != model_crossings:
        raise RuntimeError("racing line topology changes when converted to map space")

    # Both arrays close the loop, so bands stays parallel to polyline.
    closed = json_line + [json_line[0]]
    bands = bands_for(result["v"], result["ds"], result["kappa"], bike)
    bands = bands + [bands[0]]
    write_preview(track_id, source, closed, bands)
    print(
        f"  {track_id:<24} pts {len(closed):>4}  road +/-{half_w:.1f} m  "
        f"model lap {result['time']:.1f} s  apexes {len(result['apexes'])}"
    )
    return {
        "trackId": track_id,
        "name": track.get("name") or track_id,
        "polyline": closed,
        "palette": palette(),
        "bands": bands,
    }


def write_index(out_dir: Path, lines: list[dict]) -> None:
    rows = []
    for line in lines:
        parts = line["trackId"].split("_")
        var = parts[0] + "".join(p.capitalize() for p in parts[1:])
        rows.append((line["trackId"], var))
    imports = "\n".join(f"import {var} from './{tid}.json';" for tid, var in rows)
    entries = "\n".join(f"  {tid}: {var} as RacingLine," for tid, var in rows)
    body = f"""{imports}
import type {{ RacingLine }} from './types';

const LINES: Record<string, RacingLine> = {{
{entries}
}};

export const RACING_LINE_IDS = Object.keys(LINES);

export function getRacingLine(trackId: string): RacingLine | undefined {{
  return LINES[trackId];
}}
"""
    (out_dir / "index.ts").write_text(body, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ids", nargs="*", help="track ids; default is every GPX map")
    parser.add_argument("--bike", choices=sorted(BIKES), default="mid")
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=[],
        help="track ids to skip, e.g. a layout whose GPX fails prove-track-maps",
    )
    args = parser.parse_args()
    bike = BIKES[args.bike]

    tracks = catalog_tracks()
    available = sorted(p.stem for p in MAPS_DIR.glob("*.json"))
    requested = args.ids or available
    ids = [t for t in requested if t not in set(args.exclude)]

    APP_OUT.mkdir(parents=True, exist_ok=True)
    ANDROID_OUT.mkdir(parents=True, exist_ok=True)

    print(f"Racing lines ({bike.name}) for {len(ids)} of {len(available)} layouts")
    lines: list[dict] = []
    failures: list[str] = []
    for track_id in ids:
        if track_id not in tracks:
            failures.append(f"{track_id}: not in the track catalog")
            continue
        try:
            line = build_one(track_id, tracks[track_id], bike)
        except Exception as err:  # noqa: BLE001 - report every bad layout, not just the first
            failures.append(f"{track_id}: {err}")
            continue
        body = json.dumps(line, indent=2) + "\n"
        (APP_OUT / f"{track_id}.json").write_text(body, encoding="utf-8")
        (ANDROID_OUT / f"{track_id}.json").write_text(body, encoding="utf-8")
        lines.append(line)

    if failures:
        print(f"\nFAIL {len(failures)} layout(s) rejected; index.ts left as is:")
        for row in failures:
            print(f"  - {row}")
        raise SystemExit(1)

    if args.ids:
        print(f"\nWrote {len(lines)} racing line(s); index.ts left as is")
        return

    types = """export type RacingLine = {
  trackId: string;
  name: string;
  polyline: number[][];
  /** Hex colour per band; see scripts/lib/racing_line_colors.py. */
  palette: string[];
  /** Band index per polyline point, parallel to polyline. */
  bands: number[];
};
"""
    for out_dir in (APP_OUT, ANDROID_OUT):
        (out_dir / "types.ts").write_text(types, encoding="utf-8")
        write_index(out_dir, lines)
    print(f"\nWrote {len(lines)} racing lines to app/ and android-app/")


if __name__ == "__main__":
    main()
