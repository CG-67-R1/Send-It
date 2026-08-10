# RoadRacer 12s promo video

Builds landscape (16:9) and portrait (9:16) promotional cuts from six stills, with Ken Burns motion, whoosh/UI SFX, a CC0 racing music bed, and a short TTS vocal pitch.

## Outputs

| File | Spec |
|------|------|
| [`out/roadracer-promo-16x9.mp4`](out/roadracer-promo-16x9.mp4) | 1920×1080, 30 fps, ~13.3s, H.264 + AAC |
| [`out/roadracer-promo-9x16.mp4`](out/roadracer-promo-9x16.mp4) | 1080×1920, 30 fps, ~13.3s, H.264 + AAC |

Sequence: dial-in (left pan) → news/coaching/tools/upload/tyre (right pan) → fade to bike outro (`assets/video/bike-outro.mp4`). Portrait crops stay on the left or right edge — no center crop.

## Prerequisites

- Node.js 20+
- Python with [`edge-tts`](https://github.com/rany2/edge-tts) (`python -m edge_tts` works)
- FFmpeg via `npm install` (`ffmpeg-static` / `ffprobe-static`) — no system install required

## Rebuild

```powershell
cd marketing/promo
npm install
npm run all
```

Or step by step:

```powershell
npm run voice   # edge-tts → assets/audio/vocal.mp3
npm run sfx     # whoosh + UI chime
npm run music   # CC0 Pure Raceway (OpenGameArt)
npm run build   # both aspect ratios → out/
```

### Voice

- Script: [`script.txt`](script.txt) (Australian, excited)
- Default voice: `en-AU-WilliamMultilingualNeural` (`+18%` rate, `+6Hz` pitch)
- Override: `$env:PROMO_VOICE="en-AU-NatashaNeural"; npm run voice`

### Sequence

Edit [`sequence.json`](sequence.json) for clip order, zoom, portrait focus, and durations.

## Audio licenses

See [`ATTRIBUTION.md`](ATTRIBUTION.md). Music is CC0 (MintoDog — Pure Raceway). SFX and vocal are generated in this pipeline.

## Notes

- `tools/` (optional local FFmpeg zip extract) and `tmp/` are gitignored.
- Stills live in `assets/stills/rr1.png` … `rr6.png`.
