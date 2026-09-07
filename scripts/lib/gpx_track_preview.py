"""Shared PNG ribbon drawing for GPX Track Details previews."""

from __future__ import annotations

from PIL import Image, ImageDraw

SIZE = 2000
GRASS = (0x6D, 0x9A, 0x46, 255)
TRACK_EDGE = (255, 255, 255, 255)
TRACK_GREY = (0x9C, 0xA3, 0xAF, 255)
EDGE_WIDTH = 40
SURFACE_WIDTH = 24


def to_px(polyline: list[list[float]]) -> list[tuple[float, float]]:
    return [(p[0] / 100.0 * SIZE, p[1] / 100.0 * SIZE) for p in polyline]


def _stroke(draw: ImageDraw.ImageDraw, pts, colour, width: int) -> None:
    """Segment rectangles plus a disc at every vertex.

    joint="curve" leaves wedges of background showing through on the outside of
    joins once the polyline is dense, so the discs are drawn explicitly. This
    matches the round line joins the app's SVG renderer uses.
    """
    radius = width / 2
    draw.line(pts, fill=colour, width=width)
    for x, y in pts:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=colour)


def draw_ribbon(draw: ImageDraw.ImageDraw, polyline: list[list[float]]) -> None:
    pts = to_px(polyline)
    if len(pts) < 2:
        return
    if pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    _stroke(draw, pts, TRACK_EDGE, EDGE_WIDTH)
    _stroke(draw, pts, TRACK_GREY, SURFACE_WIDTH)


def render_track(polyline: list[list[float]]) -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), GRASS)
    draw_ribbon(ImageDraw.Draw(img), polyline)
    return img
