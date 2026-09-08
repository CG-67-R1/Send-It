#!/usr/bin/env python3
"""Draw corner review maps for a batch of layouts.

Two panels per track: the corners the detector finds on its own, and the corners
it finds when the confirmed count and curated numbering offset are supplied. The
corners that only appear in the second panel are what autonomous detection
misses, drawn in red so the geometry behind each miss can be judged by eye.

Report only. These images are review artifacts and are not used by the app.

Usage:
  node scripts/export-gpx-corner-maps.mjs
  python scripts/render-gpx-corner-maps.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.gpx_track_preview import GRASS, TRACK_EDGE, TRACK_GREY

DATA_DIR = REPO / "tests" / "gpx-corner-maps"

PANEL = 1500
MARGIN = 130
EDGE_WIDTH = 30
SURFACE_WIDTH = 18
CORNER_WIDTH = 18

FOUND = (0x2B, 0x6C, 0xB0, 255)
MISSED = (0xD1, 0x2F, 0x2F, 255)
START = (0xF5, 0xC2, 0x42, 255)
STRAIGHT = (0x7A, 0x3D, 0xB8, 255)
INK = (0x14, 0x18, 0x1F, 255)
PAPER = (0xF7, 0xF7, 0xF5, 255)


def load_font(size: int) -> ImageFont.ImageFont:
    for name in ("arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def to_pixels(polyline: list[list[float]]) -> list[tuple[float, float]]:
    """Scale the local metre coordinates into the panel, aspect ratio preserved."""
    xs = [p[0] for p in polyline]
    ys = [p[1] for p in polyline]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
    scale = (PANEL - 2 * MARGIN) / span
    mid_x = (max(xs) + min(xs)) / 2
    mid_y = (max(ys) + min(ys)) / 2
    centre = PANEL / 2
    # Flip y so north is up rather than image-down.
    return [
        (centre + (p[0] - mid_x) * scale, centre - (p[1] - mid_y) * scale) for p in polyline
    ]


def stroke(draw: ImageDraw.ImageDraw, pts, colour, width: int) -> None:
    """Line plus a disc per vertex, matching the app's round joins."""
    if len(pts) < 2:
        return
    radius = width / 2
    draw.line(pts, fill=colour, width=width)
    for x, y in pts:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=colour)


def span_points(pts, start: int, end: int) -> list[tuple[float, float]]:
    """Sample points from start to end, wrapping at the lap seam."""
    count = len(pts)
    out = [pts[start % count]]
    i = start % count
    guard = 0
    while i != end % count and guard <= count:
        i = (i + 1) % count
        out.append(pts[i])
        guard += 1
    return out


def outward(pts, index: int, distance: float) -> tuple[float, float]:
    """A point offset away from the track centre, for a readable label."""
    count = len(pts)
    px, py = pts[index % count]
    cx = sum(p[0] for p in pts) / count
    cy = sum(p[1] for p in pts) / count
    dx, dy = px - cx, py - cy
    norm = (dx * dx + dy * dy) ** 0.5 or 1.0
    return (px + dx / norm * distance, py + dy / norm * distance)


def draw_panel(data: dict, key: str, title: str, subtitle: str) -> Image.Image:
    pts = to_pixels(data["polyline"])
    img = Image.new("RGBA", (PANEL, PANEL), GRASS)
    draw = ImageDraw.Draw(img)

    closed = pts + [pts[0]]
    stroke(draw, closed, TRACK_EDGE, EDGE_WIDTH)
    stroke(draw, closed, TRACK_GREY, SURFACE_WIDTH)

    run = data[key]
    missed = set(run.get("addedCornerNumbers", []))
    label_font = load_font(46)
    title_font = load_font(52)
    small_font = load_font(38)

    for corner in run["corners"]:
        colour = MISSED if corner["number"] in missed else FOUND
        stroke(draw, span_points(pts, corner["startIndex"], corner["endIndex"]), colour, CORNER_WIDTH)

    for corner in run["corners"]:
        colour = MISSED if corner["number"] in missed else FOUND
        lx, ly = outward(pts, corner["apexIndex"], 78)
        text = str(corner["number"])
        box = draw.textbbox((0, 0), text, font=label_font)
        w, h = box[2] - box[0], box[3] - box[1]
        pad = 14
        draw.ellipse(
            (lx - w / 2 - pad, ly - h / 2 - pad, lx + w / 2 + pad, ly + h / 2 + pad),
            fill=colour,
            outline=PAPER,
            width=4,
        )
        draw.text((lx, ly), text, font=label_font, fill=PAPER, anchor="mm")

    sx, sy = pts[run["startFinishIndex"] % len(pts)]
    draw.ellipse((sx - 22, sy - 22, sx + 22, sy + 22), fill=START, outline=INK, width=5)
    slx, sly = outward(pts, run["startFinishIndex"], 78)
    draw.text((slx, sly), "S/F", font=small_font, fill=INK, anchor="mm",
              stroke_width=6, stroke_fill=PAPER)

    draw.text((MARGIN / 2, 30), title, font=title_font, fill=INK,
              stroke_width=7, stroke_fill=PAPER)
    draw.text((MARGIN / 2, 96), subtitle, font=small_font, fill=INK,
              stroke_width=6, stroke_fill=PAPER)
    return img


def render_straights(data: dict) -> Image.Image:
    """Label every straight so a rider can name the main one."""
    pts = to_pixels(data["polyline"])
    run = data["autonomous"]
    img = Image.new("RGBA", (PANEL, PANEL), GRASS)
    draw = ImageDraw.Draw(img)

    closed = pts + [pts[0]]
    stroke(draw, closed, TRACK_EDGE, EDGE_WIDTH)
    stroke(draw, closed, TRACK_GREY, SURFACE_WIDTH)

    corner_font = load_font(40)
    label_font = load_font(46)

    for corner in run["corners"]:
        stroke(draw, span_points(pts, corner["startIndex"], corner["endIndex"]), FOUND, CORNER_WIDTH)
    for corner in run["corners"]:
        lx, ly = outward(pts, corner["apexIndex"], 62)
        draw.text((lx, ly), f"T{corner['number']}", font=corner_font, fill=FOUND,
                  anchor="mm", stroke_width=6, stroke_fill=PAPER)

    for straight in run["straights"]:
        stroke(draw, span_points(pts, straight["startIndex"], straight["endIndex"]),
               STRAIGHT, CORNER_WIDTH)

    for straight in run["straights"]:
        lx, ly = outward(pts, straight["midIndex"], 96)
        text = f"{straight['label']}  {straight['lengthM']}m"
        box = draw.textbbox((0, 0), text, font=label_font)
        w, h = box[2] - box[0], box[3] - box[1]
        pad = 16
        draw.rounded_rectangle(
            (lx - w / 2 - pad, ly - h / 2 - pad, lx + w / 2 + pad, ly + h / 2 + pad),
            radius=16, fill=STRAIGHT, outline=PAPER, width=4,
        )
        draw.text((lx, ly), text, font=label_font, fill=PAPER, anchor="mm")

    sx, sy = pts[run["startFinishIndex"] % len(pts)]
    draw.ellipse((sx - 24, sy - 24, sx + 24, sy + 24), fill=START, outline=INK, width=5)

    header = 120
    sheet = Image.new("RGBA", (PANEL, PANEL + header), PAPER)
    sheet.paste(img, (0, header))
    head = ImageDraw.Draw(sheet)
    head.text((24, 16), data["trackName"], font=load_font(46), fill=INK)
    head.text((24, 70), "straights labelled by length - yellow dot = inferred start/finish",
              font=load_font(34), fill=INK)
    return sheet.convert("RGB").resize((1250, int((PANEL + header) * 1250 / PANEL)), Image.LANCZOS)


def render(data: dict) -> Image.Image:
    auto = data["autonomous"]
    ref = data["reference"]
    missed = ref["addedCornerNumbers"]

    left = draw_panel(
        data,
        "autonomous",
        "Detector on its own",
        f"{auto['count']} corners found",
    )
    right = draw_panel(
        data,
        "reference",
        "With confirmed count",
        f"{ref['count']} corners - red = missed ({', '.join('T' + str(n) for n in missed)})"
        if missed
        else f"{ref['count']} corners - nothing missed",
    )

    header = 110
    sheet = Image.new("RGBA", (PANEL * 2 + 30, PANEL + header), PAPER)
    sheet.paste(left, (0, header))
    sheet.paste(right, (PANEL + 30, header))

    draw = ImageDraw.Draw(sheet)
    draw.text(
        (24, 20),
        f"{data['trackName']}  -  {data['lapLengthM'] / 1000:.3f} km  -  "
        f"confirmed {data['confirmedCorners']} corners, detector found {auto['count']}",
        font=load_font(56),
        fill=INK,
    )
    return sheet.convert("RGB").resize(
        (1700, int((PANEL + header) * 1700 / (PANEL * 2 + 30))), Image.LANCZOS
    )


def main() -> None:
    straights_only = "--straights" in sys.argv[1:]
    files = sorted(DATA_DIR.glob("*.json"))
    if not files:
        raise SystemExit(
            f"No exports in {DATA_DIR}. Run: node scripts/export-gpx-corner-maps.mjs"
        )
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if straights_only:
            out = DATA_DIR / f"{data['trackId']}-straights.png"
            render_straights(data).save(out, "PNG")
        else:
            out = DATA_DIR / f"{data['trackId']}.png"
            render(data).save(out, "PNG")
        print(f"  {out}")
    print(f"Wrote {len(files)} maps to {DATA_DIR}")


if __name__ == "__main__":
    main()
