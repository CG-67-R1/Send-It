---
name: dual-tree-apply
description: Apply the same product change to both Expo trees (app/ for Vercel+iOS and android-app/ for Play). Use when editing app/src, android-app/src, packs, tracks.json, track JSON, or bundled packs so one platform is not left stale.
---

# Dual-tree apply

`app/` and `android-app/` are full copies. There is no general sync script. A logic fix in one tree does not update the other.

## When to use

- Any edit under `app/src/` or `android-app/src/`
- Pack JSON, `tracks.json`, Track Memory, corners, geofences, racing lines
- User says dual-tree, android-app, Play copy, or “mirror to Android”

## Pairing rule

Same relative path, both trees:

| `app/` | `android-app/` |
|--------|----------------|
| `app/src/<rest>` | `android-app/src/<rest>` |
| `app/constants/api.ts` | `android-app/constants/api.ts` |

Expected **config** divergence (do not copy): `app.json`, `eas.json`, `package.json`, `vercel.json`, committed `android/`, `android-app/README.md`.

## What already dual-writes

Run these instead of hand-copying JSON:

- `node scripts/build-gpx-track-maps.mjs [ids…]`
- `node scripts/build-track-details-corners.mjs [ids…]`
- `python scripts/build-racing-lines.py [ids…]`
- Orchestrator: `node scripts/build-track-details.mjs [ids…] [--with-lines]`

`node scripts/prove-track-maps.mjs` fails when app vs android-app corner JSON differ.

## App-only writers (copy after)

These write `app/` only. After they run, copy the output to the android-app twin:

- `node scripts/sync-app-packs.mjs` → also copy `app/src/packs/bundled/` → `android-app/src/packs/bundled/`
- `node scripts/enforce-turn-verification.mjs --write` → also copy `app/src/data/tracks.json` (and the verification JSON if you edited it)
- `node scripts/validate-track-data.mjs` reads `app/src/data/` only — still keep android-app catalog in sync by copy

## Manual apply

1. Edit the requested tree.
2. Apply the same patch to the twin path (or run a dual-write bake).
3. If the user asked for one tree only, say so and skip the twin.
4. Typecheck both:

```powershell
cd app; npx tsc --noEmit
cd ../android-app; npx tsc --noEmit
```

## Do not

- Symlink or merge the trees
- Verify Play changes on Vercel (Vercel serves `app/` only)
- Invent a mega sync of `app.json` / Gradle
