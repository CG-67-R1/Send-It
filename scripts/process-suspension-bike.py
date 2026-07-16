"""Crop suspension infographic to bike-only transparent PNG with dimmed body."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SRC = Path(r"c:\Users\Administrator\.cursor\Send-It\app\src\assets\bike-setup\suspension-map.png")
OUT = Path(r"c:\Users\Administrator\.cursor\Send-It\app\src\assets\bike-setup\suspension-bike.png")

CROP_TOP = 36
CROP_BOTTOM = 436


def is_near_white(r: int, g: int, b: int) -> bool:
    if r > 235 and g > 235 and b > 235:
        return True
    if r > 215 and g > 215 and b > 215 and max(r, g, b) - min(r, g, b) < 22:
        return True
    return False


def is_red_mark(r: int, g: int, b: int) -> bool:
    return r > 160 and g < 110 and b < 110 and r > g + 50 and r > b + 50


def is_gold(r: int, g: int, b: int) -> bool:
    return r > 140 and g > 95 and b < 130 and r > b + 35 and g > b + 15


def is_diagram_ink(r: int, g: int, b: int) -> bool:
    """Callout lines / dark label ink (not bike body)."""
    # flat dark-gray / black ink
    if max(r, g, b) < 90 and max(r, g, b) - min(r, g, b) < 25:
        return True
    # dashed gray lines
    if 90 <= max(r, g, b) <= 170 and max(r, g, b) - min(r, g, b) < 20:
        return True
    return False


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    cropped = im.crop((0, CROP_TOP, w, min(h, CROP_BOTTOM))).copy()
    cw, ch = cropped.size
    px = cropped.load()
    print(f"crop -> {cw}x{ch}")

    gold_pts: list[tuple[int, int]] = []
    for y in range(ch):
        for x in range(cw):
            r, g, b, _a = px[x, y]
            if is_near_white(r, g, b) or is_red_mark(r, g, b):
                px[x, y] = (0, 0, 0, 0)
                continue
            if is_gold(r, g, b):
                gold_pts.append((x, y))

    # Break thin callout lines / label ink so flood-fill won't keep floating text.
    # Pass 1: clear obvious diagram ink that sits on (former) white areas — thin strokes.
    for _pass in range(4):
        kill: list[tuple[int, int]] = []
        for y in range(1, ch - 1):
            for x in range(1, cw - 1):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                neighbors = 0
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        if px[x + dx, y + dy][3] != 0:
                            neighbors += 1
                # thin stroke / speck of diagram ink only (preserve bike silhouette)
                if is_diagram_ink(r, g, b) and neighbors <= 5:
                    kill.append((x, y))
                elif neighbors <= 1:
                    kill.append((x, y))
        for x, y in kill:
            px[x, y] = (0, 0, 0, 0)
        print(f"thin-pass {_pass + 1}: removed {len(kill)}")

    # Also clear any remaining flat gray/black ink near transparent pixels (label leftovers)
    kill2: list[tuple[int, int]] = []
    for y in range(1, ch - 1):
        for x in range(1, cw - 1):
            r, g, b, a = px[x, y]
            if a == 0 or not is_diagram_ink(r, g, b):
                continue
            empty = 0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    if px[x + dx, y + dy][3] == 0:
                        empty += 1
            if empty >= 2:
                kill2.append((x, y))
    for x, y in kill2:
        px[x, y] = (0, 0, 0, 0)
    print(f"ink-near-empty removed {len(kill2)}")

    visited = [[False] * cw for _ in range(ch)]
    best: list[tuple[int, int]] = []

    def flood(sx: int, sy: int) -> list[tuple[int, int]]:
        if sx < 0 or sy < 0 or sx >= cw or sy >= ch:
            return []
        if visited[sy][sx] or px[sx, sy][3] == 0:
            return []
        q = deque([(sx, sy)])
        visited[sy][sx] = True
        cells: list[tuple[int, int]] = []
        while q:
            x, y = q.popleft()
            cells.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= cw or ny >= ch:
                    continue
                if visited[ny][nx] or px[nx, ny][3] == 0:
                    continue
                visited[ny][nx] = True
                q.append((nx, ny))
        return cells

    for y in range(0, ch, 4):
        for x in range(0, cw, 4):
            if not visited[y][x] and px[x, y][3] != 0:
                comp = flood(x, y)
                if len(comp) > len(best):
                    best = comp

    keep = set(best)
    print(f"bike component pixels={len(keep)}")
    for y in range(ch):
        for x in range(cw):
            if px[x, y][3] != 0 and (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)

    relev = Image.new("L", (cw, ch), 0)
    rd = ImageDraw.Draw(relev)
    for x, y in gold_pts:
        rd.ellipse((x - 26, y - 26, x + 26, y + 26), fill=255)

    focus = [
        (0.20, 0.18, 0.12, 0.16),
        (0.21, 0.42, 0.10, 0.30),
        (0.19, 0.78, 0.11, 0.14),
        (0.50, 0.38, 0.14, 0.26),
        (0.54, 0.60, 0.12, 0.16),
        (0.78, 0.72, 0.10, 0.14),
    ]
    for cx, cy, rx, ry in focus:
        rd.ellipse(
            (
                int((cx - rx) * cw),
                int((cy - ry) * ch),
                int((cx + rx) * cw),
                int((cy + ry) * ch),
            ),
            fill=255,
        )
    relev = relev.filter(ImageFilter.GaussianBlur(16))
    rp = relev.load()

    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if rp[x, y] < 45:
                px[x, y] = (r, g, b, max(1, a // 2))

    bbox = cropped.getbbox()
    if bbox:
        cropped = cropped.crop(bbox)
        print(f"trimmed -> {cropped.size}")

    out = cropped.resize((cropped.width * 2, cropped.height * 2), Image.Resampling.LANCZOS)
    out.save(OUT, "PNG")
    print(f"wrote {OUT} size={out.size}")


if __name__ == "__main__":
    main()
