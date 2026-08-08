# Avatar face photo — capture and display

Read this before changing leathers art, face-hole geometry, the take-photo camera, or how the home hero composites the face.

## Invariant

**WYSIWYG:** pixels visible through the face hole after Align must be the pixels that fill the hole on the home (and onboarding) avatar. Framing must not change between Align and display.

## Why this bit us (2026-07 / 2026-08)

Several bugs stacked: Android `skipProcessing` skipped mirror bake; hole math treated the square badge as filled art while PNGs are **1024×1536** with `contain` letterboxing; and screen→photo cover mapping did not match `takePictureAsync`. Symptom: full face in the hole at capture, but home showed a cropped/offset region.

**Why automatic crop keeps failing on phones:** expo-camera **preview ≠ saved frame** on web (and often native): the hole shows a CSS-covered, clipped slice of the stream, while `takePictureAsync` stores the whole frame. Desktop webcams sometimes look “close enough”; phone / Safari streams do not. Hole PNG math alone cannot fix that.

**Working approach:** Camera aims with the leathers PNG hole, then returns a **full-frame** JPEG. **Both camera and library** open `AvatarFaceAlignModal` so the user pans/zooms until the hole matches — that bake is the only reliable WYSIWYG path across devices.

## Key files

| Area | Path |
|------|------|
| Art-space hole + presets | `presets.ts` (`DEFAULT_FACE_HOLE_LAYOUT`, `AVATAR_ART_*`) |
| Hole → badge (`contain`), camera layout helpers | `faceHoleGeometry.ts` |
| Take-photo UI (aim + full-frame capture) | `../components/AvatarFaceCameraModal.tsx` |
| Pan/zoom bake (camera + library) | `../components/AvatarFaceAlignModal.tsx` |
| Home / summary composite | `../components/AvatarFaceEllipse.tsx` |
| Persist face JPEG | `../storage/avatarFacePhoto.ts` |
| Leathers PNGs | `../../avatar/*_no_face.png` |

## Rules for future edits

1. **Camera = aim + full frame.** Keep hole-centered CameraView for aiming. Do **not** auto-crop the JPEG to the hole and skip Align — that path fails on phones. Do **not** draw a separate math-ellipse aim mask — the PNG transparent hole is the guide.
2. **Hole layout is artwork-relative.** Fractions are of the PNG; `computeFaceHole` maps through the same `contain` fit as the Image. The leathers cut-out is a **pixel circle** in art space (`widthPct * 1024 ≈ heightPct * 1536`). If you change PNG size, aspect, or the transparent cut-out, re-measure (`python3 scripts/measure-face-holes.py`) and update `DEFAULT_FACE_HOLE_LAYOUT`.
3. **Camera and library both use Align.** Align bakes a **hole-aspect** crop — not a forced square.
4. **Mirror.** Keep CameraView `mirror={false}` so preview and capture are true left/right (not selfie-mirrored). Do not flip after capture.
5. **Display.** `AvatarFaceEllipse` clips to the same hole geometry; keep face fill consistent with the Align bake.

## Manual QA (when any of the above changes)

1. Choose a face-hole leathers avatar.
2. Take photo on **phone** — roughly frame, Capture, Align until the hole looks right, Confirm.
3. Confirm home hero hole matches Align (not a zoomed corner or offset head).
4. Repeat with a library pick — same Align path.
5. Spot-check desktop web still works.
