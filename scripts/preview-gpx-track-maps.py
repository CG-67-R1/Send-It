#!/usr/bin/env python3
"""Write PNG previews of the GPX Track Details maps for local review.

Usage: python scripts/preview-gpx-track-maps.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.gpx_track_preview import render_track

MAP_DIR = REPO / "app" / "src" / "data" / "gpxTrackMaps"
OUT_DIR = REPO / "tmp" / "gpx-track-map-previews"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(MAP_DIR.glob("*.json"))
    if not files:
        raise SystemExit(f"No map JSON in {MAP_DIR}")
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        out = OUT_DIR / f"{data['trackId']}.png"
        render_track(data["polyline"]).save(out, "PNG")
        print(f"  {out.name}")
    print(f"Wrote {len(files)} previews to {OUT_DIR}")


if __name__ == "__main__":
    main()
