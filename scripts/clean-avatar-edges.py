#!/usr/bin/env python3
"""
Strip outer white sticker outlines / fringe from avatar PNGs, then lightly sharpen.

Only touches edge-adjacent near-white pixels so interior whites (suit stripes, etc.)
and transparent face holes are preserved.

Usage:
  python scripts/clean-avatar-edges.py --dry-run   # write to app/avatar/_cleaned/
  python scripts/clean-avatar-edges.py             # overwrite app/avatar/*.png
"""

from __future__ import annotations

import argparse
import sys
from array import array
from pathlib import Path

from PIL import Image, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[1]
AVATAR_DIR = REPO_ROOT / "app" / "avatar"
CLEANED_DIR = AVATAR_DIR / "_cleaned"

WHITE_MIN = 200
STRONG_WHITE_MIN = 230
# Luma threshold for light-gray fringe (not just pure white)
LUMA_MIN = 160
# Max RGB channel spread — fringe is near-gray; colored suit edges are preserved
MAX_CHROMA = 50
# Only strip softer gray when within this distance of real body pixels.
# Strong white on the outer edge is always cleared (stray islands + sticker outline).
MAX_OUTLINE_DEPTH = 16
OUTLINE_PASSES = 20
EDGE_RADIUS = 3
HALO_ALPHA_MAX = 255
SHARPEN_RADIUS = 1.0
SHARPEN_PERCENT = 45
SHARPEN_THRESHOLD = 4

# 8-connected + radius-2 offsets (Chebyshev), excluding center
NEIGHBOR_OFFSETS: list[tuple[int, int]] = [
    (dx, dy)
    for dy in range(-EDGE_RADIUS, EDGE_RADIUS + 1)
    for dx in range(-EDGE_RADIUS, EDGE_RADIUS + 1)
    if not (dx == 0 and dy == 0)
]


def _idx(x: int, y: int, w: int) -> int:
    return (y * w + x) * 4


def _is_near_white(r: int, g: int, b: int, amin: int = WHITE_MIN) -> bool:
    return r >= amin and g >= amin and b >= amin


def _luma(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def _is_achromatic(r: int, g: int, b: int) -> bool:
    return max(r, g, b) - min(r, g, b) <= MAX_CHROMA


def _should_clear_outline(r: int, g: int, b: int, a: int) -> bool:
    """True for white sticker outline / light-gray fringe (not colored art)."""
    if a == 0:
        return False
    if not _is_achromatic(r, g, b):
        return False
    luma = _luma(r, g, b)
    if luma >= STRONG_WHITE_MIN:
        return True
    if luma >= WHITE_MIN:
        return True
    if luma >= LUMA_MIN:
        return True
    return False


def _is_strong_white(r: int, g: int, b: int) -> bool:
    return _is_achromatic(r, g, b) and _luma(r, g, b) >= STRONG_WHITE_MIN


def _near_body_pixel(buf: array, x: int, y: int, w: int, h: int) -> bool:
    """True if a non-fringe opaque pixel exists within MAX_OUTLINE_DEPTH."""
    for dy in range(-MAX_OUTLINE_DEPTH, MAX_OUTLINE_DEPTH + 1):
        for dx in range(-MAX_OUTLINE_DEPTH, MAX_OUTLINE_DEPTH + 1):
            if dx * dx + dy * dy > MAX_OUTLINE_DEPTH * MAX_OUTLINE_DEPTH:
                continue
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            i = _idx(nx, ny, w)
            a = buf[i + 3]
            if a == 0:
                continue
            if not _should_clear_outline(buf[i], buf[i + 1], buf[i + 2], a):
                return True
    return False


def outer_background_mask(buf: array, w: int, h: int) -> bytearray:
    """
    Transparent pixels connected to the image border (outer background).
    Internal holes (face ovals) are excluded so we do not strip whites there.
    Returns a flat w*h mask (1 = outer background).
    """
    n = w * h
    bg = bytearray(n)
    stack: list[int] = []

    def try_seed(x: int, y: int) -> None:
        p = y * w + x
        if bg[p]:
            return
        if buf[p * 4 + 3] == 0:
            bg[p] = 1
            stack.append(p)

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while stack:
        p = stack.pop()
        x = p % w
        y = p // w
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            np_ = ny * w + nx
            if bg[np_]:
                continue
            if buf[np_ * 4 + 3] == 0:
                bg[np_] = 1
                stack.append(np_)
    return bg


def _touches_outer_bg(bg: bytearray, x: int, y: int, w: int, h: int) -> bool:
    for dx, dy in NEIGHBOR_OFFSETS:
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and bg[ny * w + nx]:
            return True
    return False


def strip_white_outline(buf: array, w: int, h: int) -> int:
    """Clear outer-edge near-white using a silhouette frontier (skips face holes)."""
    cleared = 0
    bg = outer_background_mask(buf, w, h)

    frontier: set[tuple[int, int]] = set()
    for p, is_bg in enumerate(bg):
        if not is_bg:
            continue
        x = p % w
        y = p // w
        for dx, dy in NEIGHBOR_OFFSETS:
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            if bg[ny * w + nx]:
                continue
            i = _idx(nx, ny, w)
            a = buf[i + 3]
            if a == 0:
                continue
            if _should_clear_outline(buf[i], buf[i + 1], buf[i + 2], a):
                frontier.add((nx, ny))

    for _ in range(OUTLINE_PASSES):
        if not frontier:
            break
        next_frontier: set[tuple[int, int]] = set()
        for x, y in frontier:
            i = _idx(x, y, w)
            a = buf[i + 3]
            if a == 0:
                continue
            r, g, b = buf[i], buf[i + 1], buf[i + 2]
            if not _should_clear_outline(r, g, b, a):
                continue
            if not _touches_outer_bg(bg, x, y, w, h):
                continue
            # Require nearby non-fringe body so large white splash art is preserved.
            # Stray islands are removed by despeckle_bright_islands instead.
            if not _near_body_pixel(buf, x, y, w, h):
                continue
            buf[i + 3] = 0
            bg[y * w + x] = 1
            cleared += 1
            for dx, dy in NEIGHBOR_OFFSETS:
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h):
                    continue
                if bg[ny * w + nx]:
                    continue
                j = _idx(nx, ny, w)
                na = buf[j + 3]
                if na == 0:
                    continue
                if _should_clear_outline(buf[j], buf[j + 1], buf[j + 2], na):
                    next_frontier.add((nx, ny))
        frontier = next_frontier
    return cleared


def clear_remaining_halo(buf: array, w: int, h: int) -> int:
    """Clear remaining light-gray / white fringe on the outer silhouette only."""
    bg = outer_background_mask(buf, w, h)
    cleared = 0
    for y in range(h):
        for x in range(w):
            i = _idx(x, y, w)
            a = buf[i + 3]
            if a == 0:
                continue
            r, g, b = buf[i], buf[i + 1], buf[i + 2]
            if not _should_clear_outline(r, g, b, a):
                continue
            if not _touches_outer_bg(bg, x, y, w, h):
                continue
            if not _near_body_pixel(buf, x, y, w, h):
                continue
            buf[i + 3] = 0
            cleared += 1
    return cleared


def despeckle_bright_islands(buf: array, w: int, h: int, max_area: int = 80) -> int:
    """Remove small outer-connected bright speck clusters."""
    bg = outer_background_mask(buf, w, h)
    visited = bytearray(w * h)
    cleared = 0

    def is_speck(x: int, y: int) -> bool:
        i = _idx(x, y, w)
        a = buf[i + 3]
        if a == 0:
            return False
        return _should_clear_outline(buf[i], buf[i + 1], buf[i + 2], a)

    for y in range(h):
        for x in range(w):
            p = y * w + x
            if visited[p] or not is_speck(x, y):
                continue
            if not _touches_outer_bg(bg, x, y, w, h):
                continue
            # Flood component of bright fringe
            stack = [(x, y)]
            component: list[tuple[int, int]] = []
            visited[p] = 1
            touches_bg = False
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                if _touches_outer_bg(bg, cx, cy, w, h):
                    touches_bg = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    np_ = ny * w + nx
                    if visited[np_]:
                        continue
                    if not is_speck(nx, ny):
                        continue
                    visited[np_] = 1
                    stack.append((nx, ny))
            if touches_bg and len(component) <= max_area:
                for cx, cy in component:
                    i = _idx(cx, cy, w)
                    buf[i + 3] = 0
                    cleared += 1
    return cleared


def sharpen_rgba(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    rgb = rgba.convert("RGB")
    sharp = rgb.filter(
        ImageFilter.UnsharpMask(
            radius=SHARPEN_RADIUS,
            percent=SHARPEN_PERCENT,
            threshold=SHARPEN_THRESHOLD,
        )
    )
    return Image.merge("RGBA", (*sharp.split(), rgba.split()[3]))


def count_opaque(buf: array) -> int:
    n = 0
    for i in range(3, len(buf), 4):
        if buf[i] > 0:
            n += 1
    return n


def erode_alpha(buf: array, w: int, h: int, radius: int = 1) -> int:
    """Choke silhouette by clearing any opaque pixel that has a transparent neighbor."""
    if radius < 1:
        return 0
    to_clear: list[int] = []
    for y in range(h):
        for x in range(w):
            i = _idx(x, y, w)
            if buf[i + 3] == 0:
                continue
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        # Treat image border as transparent
                        to_clear.append(i)
                        break
                    if buf[_idx(nx, ny, w) + 3] == 0:
                        to_clear.append(i)
                        break
                else:
                    continue
                break
    for i in to_clear:
        buf[i + 3] = 0
    return len(to_clear)


def process_image(path: Path) -> tuple[Image.Image, dict]:
    im = Image.open(path).convert("RGBA")
    before_opaque = count_opaque(array("B", im.tobytes()))

    # Mild sharpen first, then strip so unsharp does not recreate fringe.
    sharpened = sharpen_rgba(im)
    w, h = sharpened.size
    buf = array("B", sharpened.tobytes())

    outline_cleared = strip_white_outline(buf, w, h)
    halo_cleared = clear_remaining_halo(buf, w, h)
    outline_cleared += strip_white_outline(buf, w, h)
    # Final 1px choke removes residual light anti-aliased fringe of any color
    choke_cleared = erode_alpha(buf, w, h, radius=1)
    speck_cleared = despeckle_bright_islands(buf, w, h, max_area=300)

    cleaned = Image.frombytes("RGBA", (w, h), buf.tobytes())
    after_opaque = count_opaque(buf)
    stats = {
        "before_opaque": before_opaque,
        "after_opaque": after_opaque,
        "outline_cleared": outline_cleared,
        "halo_cleared": halo_cleared + speck_cleared + choke_cleared,
        "pixels_removed": before_opaque - after_opaque,
    }
    return cleaned, stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean white outlines from avatar PNGs")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=f"Write to {CLEANED_DIR} instead of overwriting",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=AVATAR_DIR,
        help="Input directory (default: app/avatar)",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        help="Optional subset of filenames to process",
    )
    args = parser.parse_args()

    src_dir: Path = args.input
    if not src_dir.is_dir():
        print(f"Missing avatar dir: {src_dir}", file=sys.stderr)
        return 1

    out_dir = CLEANED_DIR if args.dry_run else src_dir
    if args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    if args.only:
        pngs = [src_dir / name for name in args.only]
        missing = [p for p in pngs if not p.is_file()]
        if missing:
            print(f"Missing files: {missing}", file=sys.stderr)
            return 1
    else:
        pngs = sorted(p for p in src_dir.glob("*.png") if p.is_file())

    if not pngs:
        print(f"No PNGs in {src_dir}", file=sys.stderr)
        return 1

    mode = f"DRY-RUN -> {out_dir}" if args.dry_run else f"OVERWRITE {out_dir}"
    print(mode)
    total_removed = 0
    for path in pngs:
        print(f"  processing {path.name}...", flush=True)
        cleaned, stats = process_image(path)
        dest = out_dir / path.name
        cleaned.save(dest, format="PNG", optimize=True)
        total_removed += stats["pixels_removed"]
        print(
            f"  {path.name}: removed={stats['pixels_removed']} "
            f"(outline={stats['outline_cleared']} halo={stats['halo_cleared']}) "
            f"opaque {stats['before_opaque']}->{stats['after_opaque']}"
        )

    print(f"Done. {len(pngs)} files, {total_removed} opaque pixels cleared.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
