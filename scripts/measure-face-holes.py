#!/usr/bin/env python3
"""
Measure face-hole apertures in leathers PNGs and compare to DEFAULT_FACE_HOLE_LAYOUT.

Fits a least-squares circle to the transparent face gap (between opaque silhouette
edges) in each ``*_no_face.png``, then checks the mean against ``presets.ts``.

Usage:
  python3 scripts/measure-face-holes.py
  python3 scripts/measure-face-holes.py --tol 0.02

Exit 0 when layout is within tolerance; 1 on drift.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
AVATAR_DIR = REPO_ROOT / "app" / "avatar"
PRESETS_PATH = REPO_ROOT / "app" / "src" / "avatar" / "presets.ts"

# Unused duplicate asset (presets use yellow_no_face.png).
SKIP_FILES = {"yellow._no_face.png"}


def measure_circle(path: Path) -> dict[str, float]:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    a = arr[:, :, 3]
    h, w = a.shape
    opaque = a >= 128
    ys, xs = np.where(opaque)
    if len(xs) == 0:
        raise RuntimeError(f"no opaque pixels in {path.name}")
    sil_l, sil_r = int(xs.min()), int(xs.max())
    sil_t, sil_b = int(ys.min()), int(ys.max())
    sil_h = sil_b - sil_t + 1
    y0 = sil_t + int(sil_h * 0.05)
    y1 = sil_t + int(sil_h * 0.45)

    row_spans: list[tuple[int, int, int, int]] = []
    for y in range(y0, y1 + 1):
        row = opaque[y, sil_l : sil_r + 1]
        op_idx = np.where(row)[0]
        if len(op_idx) < 2:
            continue
        gaps = []
        idxs = op_idx.tolist()
        for k in range(len(idxs) - 1):
            if idxs[k + 1] - idxs[k] > 1:
                gl = sil_l + idxs[k] + 1
                gr = sil_l + idxs[k + 1] - 1
                gaps.append((gl, gr, gr - gl + 1))
        if not gaps:
            continue
        gl, gr, gw = max(gaps, key=lambda g: g[2])
        if gw < w * 0.15:
            continue
        if float(a[y, gl : gr + 1].mean()) > 50:
            continue
        row_spans.append((y, gl, gr, gw))

    if len(row_spans) < 20:
        raise RuntimeError(f"insufficient face-gap rows in {path.name}")

    segs: list[list[tuple[int, int, int, int]]] = []
    cur = [row_spans[0]]
    for r in row_spans[1:]:
        if r[0] == cur[-1][0] + 1:
            cur.append(r)
        else:
            segs.append(cur)
            cur = [r]
    segs.append(cur)

    target = sil_t + 0.22 * sil_h

    def score(s: list[tuple[int, int, int, int]]) -> float:
        cy = (s[0][0] + s[-1][0]) / 2
        return sum(r[3] for r in s) - abs(cy - target) * 2

    best = max(segs, key=score)
    max_w = max(r[3] for r in best)
    core = [r for r in best if r[3] >= max_w * 0.2]

    xs_b: list[float] = []
    ys_b: list[float] = []
    for y, gl, gr, _gw in core:
        xs_b.extend([gl, gr])
        ys_b.extend([y, y])
    xs_b.append((core[0][1] + core[0][2]) / 2)
    ys_b.append(core[0][0])
    xs_b.append((core[-1][1] + core[-1][2]) / 2)
    ys_b.append(core[-1][0])

    xs_a = np.asarray(xs_b, dtype=float)
    ys_a = np.asarray(ys_b, dtype=float)
    A = np.column_stack([xs_a, ys_a, np.ones_like(xs_a)])
    b = -(xs_a**2 + ys_a**2)
    D, E, F = np.linalg.lstsq(A, b, rcond=None)[0]
    cx = -D / 2
    cy = -E / 2
    r = float(np.sqrt(max(cx**2 + cy**2 - F, 1.0)))
    return {
        "cx": float(cx),
        "cy": float(cy),
        "r": r,
        "leftPct": (cx - r) / w,
        "topPct": (cy - r) / h,
        "widthPct": (2 * r) / w,
        "heightPct": (2 * r) / h,
    }


def read_default_layout() -> dict[str, float]:
    src = PRESETS_PATH.read_text(encoding="utf-8")
    m = re.search(
        r"export const DEFAULT_FACE_HOLE_LAYOUT: FaceHoleLayout = \{.*? "
        r"leftPct:\s*([\d.]+),\s*topPct:\s*([\d.]+),\s*"
        r"widthPct:\s*([\d.]+),\s*heightPct:\s*([\d.]+),",
        src,
        flags=re.S,
    )
    if not m:
        raise RuntimeError("Could not parse DEFAULT_FACE_HOLE_LAYOUT from presets.ts")
    return {
        "leftPct": float(m.group(1)),
        "topPct": float(m.group(2)),
        "widthPct": float(m.group(3)),
        "heightPct": float(m.group(4)),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tol", type=float, default=0.02, help="Max abs delta per layout field")
    args = ap.parse_args()

    files = sorted(
        p
        for p in AVATAR_DIR.iterdir()
        if p.suffix == ".png" and "_no_face" in p.name and p.name not in SKIP_FILES
    )
    if not files:
        print(f"No face-hole PNGs found in {AVATAR_DIR}", file=sys.stderr)
        return 1

    results = []
    for path in files:
        m = measure_circle(path)
        results.append(m)
        print(
            f"{path.name}: cx={m['cx']:.1f} cy={m['cy']:.1f} r={m['r']:.1f} → "
            f"{m['leftPct']:.4f}, {m['topPct']:.4f}, {m['widthPct']:.4f}, {m['heightPct']:.4f}"
        )

    measured = {
        k: float(np.mean([r[k] for r in results]))
        for k in ("leftPct", "topPct", "widthPct", "heightPct")
    }
    layout = read_default_layout()
    print("\nMeasured mean:", {k: round(v, 4) for k, v in measured.items()})
    print("DEFAULT_FACE_HOLE_LAYOUT:", layout)

    ok = True
    for key in ("leftPct", "topPct", "widthPct", "heightPct"):
        delta = abs(measured[key] - layout[key])
        passed = delta <= args.tol
        print(f"  {key}: Δ={delta:.4f} {'OK' if passed else 'DRIFT'} (tol {args.tol})")
        if not passed:
            ok = False

    if not ok:
        print("\nFAIL: face-hole layout drifted from measured PNG apertures.", file=sys.stderr)
        return 1
    print("\nPASS: DEFAULT_FACE_HOLE_LAYOUT matches measured apertures.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
