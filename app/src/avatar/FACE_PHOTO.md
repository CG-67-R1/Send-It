# Avatar face photo — capture and display

Read this before changing leathers art, face-hole geometry, the take-photo camera, or how the home hero composites the face.

## Invariant

**WYSIWYG:** pixels visible through the face hole when capturing must be the pixels that fill the hole on the home (and onboarding) avatar. An optional horizontal un-mirror after crop is allowed; **framing must not change**.

## Why this bit us (2026-07)

Several bugs stacked: Android `skipProcessing` skipped mirror bake; Align always opened after camera; hole math treated the square badge as filled art while PNGs are **1024×1536** with `contain` letterboxing; and screen→photo cover mapping did not match `takePictureAsync`. Symptom: full face in the hole at capture, but home showed a cropped/offset region (e.g. nose–forehead, head shifted).

**Working approach:** CameraView is framed on the hole (larger by `CAPTURE_PREVIEW_SCALE` for arm’s-length zoom-out). Save the **center** of that preview — do not project hole screen coordinates into the sensor image.

## Key files

| Area | Path |
|------|------|
| Art-space hole + presets | `presets.ts` (`DEFAULT_FACE_HOLE_LAYOUT`, `AVATAR_ART_*`) |
| Hole → badge (`contain`), camera layout, center crop | `faceHoleGeometry.ts` |
| Take-photo UI | `../components/AvatarFaceCameraModal.tsx` |
| Home / summary composite | `../components/AvatarFaceEllipse.tsx` |
| Library pan/zoom only | `../components/AvatarFaceAlignModal.tsx` |
| Persist face JPEG | `../storage/avatarFacePhoto.ts` |
| Leathers PNGs | `../../avatar/*_no_face.png` |

## Rules for future edits

1. **Camera = hole framing.** Keep hole-centered CameraView + `captureCenterHoleCrop`. Do not restore full-screen cover mapping / CSS-scale crop math. Do **not** draw a separate math-ellipse aim mask — the PNG transparent hole is the guide.
2. **Hole layout is artwork-relative.** Fractions are of the PNG; `computeFaceHole` maps through the same `contain` fit as the Image. The leathers cut-out is a **pixel circle** in art space (`widthPct * 1024 ≈ heightPct * 1536`). If you change PNG size, aspect, or the transparent cut-out, re-measure (`python3 scripts/measure-face-holes.py`) and update `DEFAULT_FACE_HOLE_LAYOUT`.
3. **Camera vs library.** Camera skips Align and writes a hole-ready crop. Library still uses `AvatarFaceAlignModal` (pan/zoom), which bakes a **hole-aspect** crop — not a forced square.
4. **Mirror.** Use CameraView `mirror` and process the frame (no Android `skipProcessing`). Flip after center crop if the saved face must be true left/right.
5. **Display.** `AvatarFaceEllipse` clips to the same hole geometry; keep face fill consistent with the captured hole aspect.
6. **Crop.** `captureCenterHoleCrop` cover-fits to hole aspect first, then keeps the center `CAPTURE_PREVIEW_SCALE` fraction (handles full-sensor frames).

## Manual QA (when any of the above changes)

1. Choose a face-hole leathers avatar.
2. Take photo — fill the hole with your full face.
3. Confirm home hero hole shows that same full face (not a zoomed corner or offset head).
4. Optionally pick from library and Align — still works independently.
