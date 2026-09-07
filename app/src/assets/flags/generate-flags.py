"""Draw bundled country-flag PNGs (run from this folder: python generate-flags.py)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
SCALE = 4  # draw oversized, then Lanczos-downscale for a clean header flag


def star_pts(
    cx: float,
    cy: float,
    spikes: int,
    outer: float,
    inner: float,
    rot_deg: float = -90,
) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    rot = math.radians(rot_deg)
    step = math.pi / spikes
    for _ in range(spikes):
        pts.append((cx + math.cos(rot) * outer, cy + math.sin(rot) * outer))
        rot += step
        pts.append((cx + math.cos(rot) * inner, cy + math.sin(rot) * inner))
        rot += step
    return pts


def save(img: Image.Image, code: str, width: int, height: int) -> None:
    out = img.resize((width, height), Image.Resampling.LANCZOS)
    path = OUT / f"{code}.png"
    out.save(path, "PNG")
    print(f"wrote {path.name} ({width}x{height})")


def union_jack(w: int, h: int) -> Image.Image:
    """Simplified Union Jack, readable at header size. Ratio 2:1."""
    img = Image.new("RGBA", (w, h), "#012169")
    d = ImageDraw.Draw(img)
    white, red = "#FFFFFF", "#C8102E"
    # St Andrew saltire (white) then St Patrick (red), then St George.
    d.line([(0, 0), (w, h)], fill=white, width=max(h // 5, 1))
    d.line([(w, 0), (0, h)], fill=white, width=max(h // 5, 1))
    d.line([(0, 0), (w, h)], fill=red, width=max(h // 15, 1))
    d.line([(w, 0), (0, h)], fill=red, width=max(h // 15, 1))
    d.rectangle([(w // 2 - h // 6, 0), (w // 2 + h // 6, h)], fill=white)
    d.rectangle([(0, h // 2 - h // 6), (w, h // 2 + h // 6)], fill=white)
    d.rectangle([(w // 2 - h // 10, 0), (w // 2 + h // 10, h)], fill=red)
    d.rectangle([(0, h // 2 - h // 10), (w, h // 2 + h // 10)], fill=red)
    return img


def draw_gb() -> None:
    w, h = 240 * SCALE, 120 * SCALE
    save(union_jack(w, h), "gb", 240, 120)


def draw_it() -> None:
    w, h = 180 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w // 3, h], fill="#009246")
    d.rectangle([2 * w // 3, 0, w, h], fill="#CE2B37")
    save(img, "it", 180, 120)


def draw_es() -> None:
    w, h = 180 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#AA151B")
    d = ImageDraw.Draw(img)
    d.rectangle([0, h // 4, w, 3 * h // 4], fill="#F1BF00")
    save(img, "es", 180, 120)


def draw_fr() -> None:
    w, h = 180 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w // 3, h], fill="#002395")
    d.rectangle([2 * w // 3, 0, w, h], fill="#ED2939")
    save(img, "fr", 180, 120)


def draw_de() -> None:
    w, h = 200 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#000000")
    d = ImageDraw.Draw(img)
    d.rectangle([0, h // 3, w, 2 * h // 3], fill="#DD0000")
    d.rectangle([0, 2 * h // 3, w, h], fill="#FFCE00")
    save(img, "de", 200, 120)


def draw_jp() -> None:
    w, h = 180 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(img)
    r = int(h * 0.3)  # disc diameter is 3/5 of height
    cx, cy = w // 2, h // 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#BC002D")
    save(img, "jp", 180, 120)


def draw_us() -> None:
    # 19:10, 13 stripes, 50-star canton.
    w, h = 228 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#B22234")
    d = ImageDraw.Draw(img)
    stripe = h / 13
    for i in range(6):
        y0 = int((i * 2 + 1) * stripe)
        y1 = int((i * 2 + 2) * stripe)
        d.rectangle([0, y0, w, y1], fill="#FFFFFF")
    canton_w = int(w * 0.4)
    canton_h = int(7 * stripe)
    d.rectangle([0, 0, canton_w, canton_h], fill="#3C3B6E")
    col = canton_w / 12
    row = canton_h / 10
    r = 0.0308 * h  # official star diameter ≈ 0.0616 × hoist
    inner = r * 0.382
    for row_idx in range(9):
        count = 6 if row_idx % 2 == 0 else 5
        y = row * (row_idx + 1)
        x0 = col if count == 6 else col * 2
        for i in range(count):
            x = x0 + i * col * 2
            d.polygon(star_pts(x, y, 5, r, inner), fill="#FFFFFF")
    save(img, "us", 228, 120)


def draw_au() -> None:
    w, h = 240 * SCALE, 120 * SCALE
    img = Image.new("RGBA", (w, h), "#012169")
    jack = union_jack(w // 2, h // 2)
    img.paste(jack, (0, 0))
    d = ImageDraw.Draw(img)

    def star(cx: float, cy: float, spikes: int, outer: float, inner_ratio: float = 0.4) -> None:
        d.polygon(star_pts(cx, cy, spikes, outer, outer * inner_ratio), fill="#FFFFFF")

    star(0.25 * w, 0.75 * h, 7, 0.15 * h, 0.4)
    star(0.75 * w, 0.247 * h, 7, 0.083 * h)  # Gamma Crucis (top)
    star(0.75 * w, 0.823 * h, 7, 0.09 * h)  # Alpha Crucis (bottom)
    star(0.627 * w, 0.537 * h, 7, 0.078 * h)  # Beta Crucis (left)
    star(0.873 * w, 0.457 * h, 7, 0.078 * h)  # Delta Crucis (right)
    star(0.812 * w, 0.593 * h, 5, 0.04 * h, 0.4)  # Epsilon Crucis
    save(img, "au", 240, 120)


if __name__ == "__main__":
    draw_gb()
    draw_it()
    draw_es()
    draw_au()
    draw_fr()
    draw_de()
    draw_jp()
    draw_us()
