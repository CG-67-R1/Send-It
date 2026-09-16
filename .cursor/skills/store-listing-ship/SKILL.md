---
name: store-listing-ship
description: Prepare App Store Connect listing, screenshots, and version actions using existing asc-*.mjs scripts. Use when the user mentions ASC, App Store Connect, TestFlight, listing copy, store screenshots, or iOS submit. Submit only when the user explicitly asks. Never print Apple or Expo secrets.
---

# Store listing / ship (L1)

Wraps existing ASC scripts and listing docs. Agent Apple (`docs/hermes/skills/send-it/agent-apple/`) stays report-only.

**Submit is human-gated.** Readiness, listing edits, and screenshot inventory are allowed. `asc-ship-*.mjs` / `asc-submit-*.mjs` run only when the user said submit / ship / send for review.

## When to use

- ASC, App Store Connect, TestFlight, listing URLs, promo text, store screenshots
- User names `asc-ship-100`, `asc-submit-101`, or screenshot replace/upload

## Read first

- `docs/ios/ASC_LISTING_COPY.md`
- `docs/ios/APP_REVIEW_NOTES.md`
- `docs/ios/screenshots/INDEX.md`
- `docs/hermes/skills/send-it/agent-apple/asc.md` and `CURRENT.md` (do not rewrite them)
- Latest `docs/reviews/ASC_PREFLIGHT_*.md` and `ASC_LISTING_SCREENSHOTS_*.md`

Identity: bundle `com.milroadracer.app`, ASC app `6799806571`. Credentials live outside the repo (`docs/ios/apple-credentials.env.example`). Scripts use the EAS-stored API key. **Never print** `.p8`, Expo tokens, or key contents.

## Safe commands (prepare)

From repo root:

```powershell
node scripts/asc-app-state.mjs
node scripts/asc-listing-editability.mjs
node scripts/asc-list-screenshots.mjs
node scripts/asc-set-listing-urls.mjs
node scripts/asc-set-promo-text.mjs
```

Screenshot folders and slot rules: `docs/ios/screenshots/INDEX.md`. iPhone 6.5" must be 1284×2778 or 1242×2688. Do not upload `*-01-news` (News is gone). Evening/telegram sets are often the wrong size for ASC.

## Submit commands (user must ask)

```powershell
node scripts/asc-ship-100.mjs
node scripts/asc-ship-100.mjs --build <n>
node scripts/asc-submit-101.mjs
node scripts/asc-submit-101.mjs --diagnose
```

If blocked, diagnose with `node scripts/asc-diagnose-submit-block.mjs` when that script is present. Do not invent App Review outcomes.

## Play

Play is prepare-only in Wave 1. Paste pack: `docs/play/PLAY_LISTING_COPY.md`. Product root is `android-app/`. There is no Play app id and no `eas submit` Android path in-repo. Do not submit to Play from this skill.

## Do not

- Commit secrets or dump credentials into chat
- Upload News-slot or wrong-size screenshots
- Treat Agent Apple weekly-skills as a ship checklist
- Raise submit to unattended / L2
