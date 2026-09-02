#!/usr/bin/env python3
"""Build RR-owned Track Details maps from imported board schematics.

Strips watermarks / checkerboard / title blocks, paints grass + light-grey
track, keeps corner numbers and coloured markers, places the RR logo in the
largest infield pocket that does not cover the ribbon.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

GRASS = np.array([0x6D, 0x9A, 0x46, 255], dtype=np.uint8)
TRACK = np.array([0xD4, 0xD9, 0xDE, 255], dtype=np.uint8)
PIT = np.array([0xBE, 0xC4, 0xCA, 255], dtype=np.uint8)

REPO = Path(__file__).resolve().parents[1]
LOGO_PATH = REPO / "app" / "src" / "assets" / "RR.png"
APP_BOARDS = REPO / "app" / "src" / "assets" / "trackInfo" / "boards"
ANDROID_BOARDS = REPO / "android-app" / "src" / "assets" / "trackInfo" / "boards"
DOWNLOADS = Path(r"C:\Users\Administrator\Downloads\Australia")
ORIGINAL_CACHE = REPO / "tmp" / "board-originals"

DOWNLOAD_NAMES = {
    "baskerville.png": "Baskerville.png",
    "broadford.png": "Boradford.png",
    "calder_park.png": "CalderPark.png",
    "hidden_valley.png": "HiddenValley.png",
    "lakeside.png": "Lakeside.png",
    "mac_park.png": "MacnamaraPark.png",
    "mallala.png": "Mallala.png",
    "morgan_park.png": "MorganPark.png",
    "phillip_island.png": "PhillipIsland.png",
    "queensland_raceway.png": "QueenslandRaceway.png",
    "sandown.png": "Sandown.png",
    "smp_brabham.png": "SydneyBrabham.png",
    "smp_druitt.png": "SydneyDruitt.png",
    "smp_gardner.png": "SydneyGardner.png",
    "the_bend_gt.png": "TheBendGT.png",
    "the_bend_international.png": "TheBendInt.png",
    "wakefield_park.png": "OneRaceway.png",
    "wanneroo.png": "Wanneroo.png",
    "winton.png": "Winton.png",
}


def disk(radius: int) -> np.ndarray:
    y, x = np.ogrid[-radius : radius + 1, -radius : radius + 1]
    return x * x + y * y <= radius * radius


def crop_logo(path: Path) -> Image.Image:
    logo = Image.open(path).convert("RGBA")
    arr = np.array(logo)
    ys, xs = np.where(arr[:, :, 3] > 16)
    pad = 4
    x0, x1 = max(0, int(xs.min()) - pad), min(arr.shape[1], int(xs.max()) + pad + 1)
    y0, y1 = max(0, int(ys.min()) - pad), min(arr.shape[0], int(ys.max()) + pad + 1)
    return Image.fromarray(arr[y0:y1, x0:x1])


def _large_components(mask: np.ndarray, min_frac: float, min_px: int) -> np.ndarray:
    labeled, ncc = ndimage.label(mask)
    if ncc == 0:
        return np.zeros(mask.shape, dtype=bool)
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0
    largest = int(sizes.max())
    cutoff = max(min_px, int(min_frac * mask.size), int(0.16 * largest))
    return np.isin(labeled, np.where(sizes >= cutoff)[0])


def _components_near(
    mask: np.ndarray,
    track: np.ndarray,
    max_area: int,
    max_dist: float,
) -> np.ndarray:
    if not mask.any():
        return np.zeros(mask.shape, dtype=bool)
    dist = ndimage.distance_transform_edt(~track)
    labeled, ncc = ndimage.label(mask)
    if ncc == 0:
        return np.zeros(mask.shape, dtype=bool)
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0
    keep = np.zeros(mask.shape, dtype=bool)
    for i in np.where((sizes >= 4) & (sizes <= max_area))[0]:
        comp = labeled == i
        if float(dist[comp].min()) > max_dist:
            continue
        keep |= comp
    return keep


def _crop_to_content(out: np.ndarray, used: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    ys, xs = np.where(used)
    if ys.size == 0:
        return out, used
    h, w = used.shape
    pad = max(28, int(0.08 * max(h, w)))
    y0, y1 = max(0, int(ys.min()) - pad), min(h, int(ys.max()) + pad + 1)
    x0, x1 = max(0, int(xs.min()) - pad), min(w, int(xs.max()) + pad + 1)
    return out[y0:y1, x0:x1], used[y0:y1, x0:x1]


def restyle(src: Image.Image, logo: Image.Image) -> Image.Image:
    rgba = np.array(src.convert("RGBA"))
    h, w = rgba.shape[:2]
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    opaque = alpha >= 96
    white = opaque & (lum > 238) & (chroma < 16)
    dusty = opaque & (lum > 148) & (chroma < 90) & (np.abs(r.astype(np.int16) - g) < 32)
    colored = opaque & (chroma > 32) & ~dusty
    reddish = opaque & (r > 140) & (r > g + 32) & (r > b + 32) & (chroma > 40)
    dark = opaque & (chroma < 30) & (lum < 128)
    mid = opaque & (chroma < 26) & (lum >= 128) & (lum < 190) & ~dusty

    track = _large_components(dark | reddish, min_frac=0.002, min_px=280)
    near4 = ndimage.binary_dilation(track, structure=disk(4))
    marker = _components_near(colored & ~track, track, max_area=int(0.018 * h * w), max_dist=36)
    labels = _components_near(dark & ~track, track, max_area=int(0.012 * h * w), max_dist=30)
    pit = _large_components(mid & ndimage.binary_dilation(track, structure=disk(10)), 0.0004, 80)
    pit |= mid & near4 & ~labels & ~marker
    aa = near4 & opaque & (chroma < 40) & (lum < 205) & ~colored & ~white & ~dusty & ~labels
    ribbon = track | pit | aa

    dark_n = ndimage.uniform_filter(dark.astype(np.float32), size=9)
    white_n = ndimage.uniform_filter(white.astype(np.float32), size=9)
    checker_px = (dark_n > 0.16) & (white_n > 0.16) & (chroma < 55) & near4
    flags = _components_near(checker_px & ~track, track, max_area=2200, max_dist=10)
    pin_fill = white & ndimage.binary_dilation(marker, structure=disk(3))
    track_n = ndimage.convolve(
        track.astype(np.uint8), np.ones((5, 5), dtype=np.uint8), mode="constant"
    )
    on_ribbon_marks = white & (track_n >= 16)

    keep = (marker | labels | flags | pin_fill | on_ribbon_marks) & opaque & ~track & ~pit

    out = np.empty_like(rgba)
    out[:, :] = GRASS
    out[ribbon] = TRACK
    out[pit] = PIT
    out[keep] = rgba[keep]

    used = ribbon | keep
    out, used = _crop_to_content(out, used)
    h, w = used.shape

    obstacle = used.copy()
    obstacle = ndimage.binary_dilation(obstacle, structure=disk(2))
    closed = ndimage.binary_dilation(obstacle, structure=disk(7))
    grass = ~closed
    border = np.zeros((h, w), dtype=bool)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True
    outside = ndimage.binary_propagation(border & grass, mask=grass)
    infield = grass & ~outside
    if infield.mean() < 0.008:
        infield = ~obstacle
        margin_h, margin_w = max(8, h // 14), max(8, w // 14)
        infield[:margin_h, :] = False
        infield[-margin_h:, :] = False
        infield[:, :margin_w] = False
        infield[:, -margin_w:] = False

    return Image.fromarray(_place_logo(out, obstacle, infield, logo))


def _place_logo(
    out: np.ndarray,
    obstacle: np.ndarray,
    infield: np.ndarray,
    logo: Image.Image,
) -> np.ndarray:
    h, w = obstacle.shape
    dist = ndimage.distance_transform_edt(~obstacle)
    yy, xx = np.mgrid[0:h, 0:w]
    cy0, cx0 = (h - 1) / 2.0, (w - 1) / 2.0
    radial = np.sqrt(((yy - cy0) / max(h / 2, 1)) ** 2 + ((xx - cx0) / max(w / 2, 1)) ** 2)
    score = dist * (0.40 + 0.60 * np.clip(1.0 - radial / 1.35, 0.05, 1.0))
    score[~infield] *= 0.15
    if float(score.max()) < 12:
        return out

    cy, cx = np.unravel_index(int(score.argmax()), score.shape)
    radius = float(dist[cy, cx])
    lw, lh = logo.size
    target_h = min(int(radius * 1.45), int(min(h, w) * 0.34), int(h * 0.46))
    target_h = max(28, target_h)
    scale = target_h / max(lh, 1)
    tw, th = max(8, int(lw * scale)), max(8, int(lh * scale))

    for _ in range(12):
        x0 = int(cx - tw / 2)
        y0 = int(cy - th / 2)
        x1, y1 = x0 + tw, y0 + th
        if x0 < 2 or y0 < 2 or x1 > w - 2 or y1 > h - 2:
            tw, th = int(tw * 0.82), int(th * 0.82)
            continue
        pad = 4
        block = obstacle[max(0, y0 - pad) : min(h, y1 + pad), max(0, x0 - pad) : min(w, x1 + pad)]
        if block.mean() > 0.07:
            tw, th = int(tw * 0.82), int(th * 0.82)
            continue
        resized = logo.resize((tw, th), Image.Resampling.LANCZOS)
        base = Image.fromarray(out)
        base.alpha_composite(resized, (x0, y0))
        return np.array(base)

    return out


def resolve_source(name: str) -> Path:
    download = DOWNLOADS / DOWNLOAD_NAMES[name]
    cached = ORIGINAL_CACHE / name
    for path in (download, cached):
        if path.is_file():
            return path
    raise FileNotFoundError(
        f"No original schematic for {name}. Put the source PNG in {DOWNLOADS} or {ORIGINAL_CACHE}."
    )


def cache_originals() -> None:
    ORIGINAL_CACHE.mkdir(parents=True, exist_ok=True)
    for name, download_name in DOWNLOAD_NAMES.items():
        dest = ORIGINAL_CACHE / name
        if dest.is_file():
            continue
        src = DOWNLOADS / download_name
        if src.is_file():
            shutil.copy2(src, dest)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build RR-owned board maps")
    parser.add_argument("--out", type=Path, default=None, help="Output directory (default: app + android assets)")
    parser.add_argument("--only", nargs="*", default=None)
    args = parser.parse_args()

    cache_originals()
    logo = crop_logo(LOGO_PATH)
    names = args.only or list(DOWNLOAD_NAMES)
    dests: list[Path]
    if args.out:
        dests = [args.out]
        args.out.mkdir(parents=True, exist_ok=True)
    else:
        dests = [APP_BOARDS, ANDROID_BOARDS]
        for d in dests:
            d.mkdir(parents=True, exist_ok=True)

    for name in names:
        src_path = resolve_source(name)
        print(f"{name}: {src_path}")
        out = restyle(Image.open(src_path), logo)
        for dest in dests:
            out.save(dest / name, "PNG", optimize=True)
        print(f"  -> {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()
