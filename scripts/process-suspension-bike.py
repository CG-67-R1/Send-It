"""Build a clean bike PNG: transparent fringe, 50% body, enhanced suspension."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

SRC = Path(r"c:\Users\Administrator\.cursor\Send-It\app\src\assets\bike-setup\suspension-map.png")
OUT = Path(r"c:\Users\Administrator\.cursor\Send-It\app\src\assets\bike-setup\suspension-bike.png")

CROP_TOP = 36
CROP_BOTTOM = 436
BODY_ALPHA = 128


def is_near_white(r: int, g: int, b: int) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    if r >= 228 and g >= 228 and b >= 228:
        return True
    if r >= 205 and g >= 205 and b >= 205 and mx - mn < 22:
        return True
    return False


def is_fringe_white(r: int, g: int, b: int) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    return r >= 180 and g >= 180 and b >= 180 and mx - mn < 20


def is_red_mark(r: int, g: int, b: int) -> bool:
    return r > 155 and g < 115 and b < 115 and r > g + 45 and r > b + 45


def is_gold(r: int, g: int, b: int) -> bool:
    if r > 145 and g > 100 and b < 140 and r > b + 30 and g > b + 8:
        return True
    if r > 175 and g > 145 and b < 125 and r > b + 45:
        return True
    return False


def is_label_light(r: int, g: int, b: int) -> bool:
    """Pale gray/blue callout text that is not pure white."""
    mx, mn = max(r, g, b), min(r, g, b)
    if 140 <= mx <= 210 and mx - mn < 35 and mn > 120:
        return True
    return False


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    cropped = im.crop((0, CROP_TOP, w, min(h, CROP_BOTTOM))).copy()
    cw, ch = cropped.size
    px = cropped.load()
    print(f"crop -> {cw}x{ch}")

    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if is_near_white(r, g, b) or is_red_mark(r, g, b) or is_label_light(r, g, b):
                px[x, y] = (0, 0, 0, 0)

    visited = [[False] * cw for _ in range(ch)]
    best: list[tuple[int, int]] = []

    def flood(sx: int, sy: int) -> list[tuple[int, int]]:
        if not (0 <= sx < cw and 0 <= sy < ch) or visited[sy][sx] or px[sx, sy][3] == 0:
            return []
        q = deque([(sx, sy)])
        visited[sy][sx] = True
        cells: list[tuple[int, int]] = []
        while q:
            x, y = q.popleft()
            cells.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < cw and 0 <= ny < ch and not visited[ny][nx] and px[nx, ny][3] != 0:
                    visited[ny][nx] = True
                    q.append((nx, ny))
        return cells

    for y in range(0, ch, 3):
        for x in range(0, cw, 3):
            if not visited[y][x] and px[x, y][3] != 0:
                comp = flood(x, y)
                if len(comp) > len(best):
                    best = comp

    keep = set(best)
    print(f"bike pixels={len(keep)}")
    for y in range(ch):
        for x in range(cw):
            if px[x, y][3] != 0 and (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)

    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if a and (is_fringe_white(r, g, b) or is_near_white(r, g, b) or is_red_mark(r, g, b)):
                px[x, y] = (0, 0, 0, 0)

    # Gold suspension only inside fork + shock zones; dilate gold seeds only
    fork_box = (int(0.10 * cw), int(0.04 * ch), int(0.34 * cw), int(0.96 * ch))
    shock_box = (int(0.40 * cw), int(0.16 * ch), int(0.62 * cw), int(0.68 * ch))
    sus = Image.new("L", (cw, ch), 0)
    sd = ImageDraw.Draw(sus)
    gold_n = 0
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if a == 0 or not is_gold(r, g, b):
                continue
            in_fork = fork_box[0] <= x <= fork_box[2] and fork_box[1] <= y <= fork_box[3]
            in_shock = shock_box[0] <= x <= shock_box[2] and shock_box[1] <= y <= shock_box[3]
            if in_fork or in_shock:
                gold_n += 1
                sd.ellipse((x - 7, y - 7, x + 7, y + 7), fill=255)
    sus = sus.filter(ImageFilter.GaussianBlur(3))
    sp = sus.load()
    print(f"gold in zones={gold_n}")

    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if sp[x, y] >= 80:
                nr = min(255, int(r * 1.16 + 12))
                ng = min(255, int(g * 1.12 + 8))
                nb = min(255, int(b * 0.90))
                px[x, y] = (nr, ng, nb, 255)
            else:
                px[x, y] = (r, g, b, BODY_ALPHA)

    bbox = cropped.getbbox()
    if bbox:
        cropped = cropped.crop(bbox)
        print(f"trimmed -> {cropped.size}")

    tw, th = cropped.size
    tpx = cropped.load()
    for y in range(th):
        for x in range(tw):
            r, g, b, a = tpx[x, y]
            if a and (
                is_near_white(r, g, b)
                or is_fringe_white(r, g, b)
                or is_red_mark(r, g, b)
                or is_label_light(r, g, b)
            ):
                tpx[x, y] = (0, 0, 0, 0)

    # Pad so callout hotspots can sit beside the bike without overlapping parts
    pad_l, pad_r, pad_t, pad_b = 90, 40, 24, 24
    padded = Image.new("RGBA", (tw + pad_l + pad_r, th + pad_t + pad_b), (0, 0, 0, 0))
    padded.paste(cropped, (pad_l, pad_t), cropped)

    out = padded.resize((padded.width * 2, padded.height * 2), Image.Resampling.LANCZOS)
    out = ImageEnhance.Sharpness(out).enhance(1.18)
    out.save(OUT, "PNG")
    print(f"wrote {OUT} size={out.size}")


if __name__ == "__main__":
    main()
