# Send-It review reports

Hermes (RoadRace app expert) writes review reports here. **Report only** — implementation happens in Cursor.

**Naming convention:** `FAMILY_YYYY-MM-DD.md` — always this folder, never elsewhere.

## Cursor implementers (do not clone Hermes)

P0/P1 from this folder are implemented with project skills, not a second reviewer:

- [`.cursor/skills/hermes-p0-fix/SKILL.md`](../../.cursor/skills/hermes-p0-fix/SKILL.md) — read newest `RR_REVIEW_*` / `MOBILE_OPS_*` / `ASC_PREFLIGHT_*`, fix P0/P1 only
- [`.cursor/skills/dual-tree-apply/SKILL.md`](../../.cursor/skills/dual-tree-apply/SKILL.md) — mirror `app/` and `android-app/`
- [`.cursor/skills/track-details-bake/SKILL.md`](../../.cursor/skills/track-details-bake/SKILL.md) — bake + prove when the finding is Track Details
- [`.cursor/skills/store-listing-ship/SKILL.md`](../../.cursor/skills/store-listing-ship/SKILL.md) — ASC scripts (submit only if asked)
- [`.cursor/skills/coach-kb-safety/SKILL.md`](../../.cursor/skills/coach-kb-safety/SKILL.md) — Coach / Q&A / GPT pack edits

`GPT_*_AUDIT_*` and `UI_DESIGN_*` filenames are report labels. There is no Hermes `gpt-knowledge-pack-audit` or `mobile-design/ui-designer` skill to install. Use `coach-kb-safety` + `scripts/gpt-repo-parity-audit.mjs`, and `SCREEN_BRIEF_FOR_VISUALS.md`, respectively.

## Report families

| File pattern | Author (skill) | Contents |
|--------------|----------------|----------|
| `RR_REVIEW_YYYY-MM-DD.md` | `send-it/rr-app-expert` | Weekly full audit: gates, screens, track data, coding improvements |
| `MOBILE_OPS_YYYY-MM-DD.md` | `send-it/mobile-app-expert` | iOS/Android ops, perf, security — HEALTHY or CURSOR ALERT |
| `MOBILE_REVIEW_YYYY-MM-DD.md` | `send-it/mobile-review` | Screen-focused audit (legacy / on-demand) |
| `ASC_PREFLIGHT_YYYY-MM-DD.md` | `send-it/agent-apple` | Pre-App Store Connect iOS review — SUBMIT / HOLD |
| `ASC_LISTING_SCREENSHOTS_YYYY-MM-DD.md` | `send-it/agent-apple` | ASC listing screenshot review + categorisation before release |
| `AGENT_APPLE_SKILLS_YYYY-MM-DD.md` | `send-it/agent-apple` | Weekly Agent Apple CURRENT.md refresh |
| `PLAY_PREFLIGHT_YYYY-MM-DD.md` | `send-it/agent-play` | Pre-Google Play Android review — SUBMIT / HOLD |
| `AGENT_PLAY_SKILLS_YYYY-MM-DD.md` | `send-it/agent-play` | Weekly Agent Play CURRENT.md refresh |
| `TRACK_*_YYYY-MM-DD.md` | `send-it/rr-app-expert` | Track catalog / GPX / Track Memory deep audits |
| `SECURITY_REVIEW_YYYY-MM-DD.md` | on-demand | Security-focused audit |
| `UI_DESIGN_*_YYYY-MM-DD.md` | on-demand (no Hermes skill) | UI/UX design review vs `SCREEN_BRIEF_FOR_VISUALS.md` |
| `MARKET_FILL_*.md` | `send-it/market-pack` | Regional pack research fills |
| `GPT_*_AUDIT_*.md` | on-demand (`scripts/gpt-repo-parity-audit.mjs`) | Custom GPT knowledge pack audits |

One-off handoff docs should use the same `FAMILY_YYYY-MM-DD.md` name. Reports dated before 2026-09-14 were removed. Do not cite them. Restate a finding only when a review dated 2026-09-14 or later says it.

## Dismissed findings (owner decision, 2026-11-03)

The owner has dismissed these. Hermes must not raise, copy forward, or list them as open in any report. Cursor must not implement them unless the owner asks again.

| From | Finding |
|------|---------|
| `RR_REVIEW_2026-11-02` | `api/` `npm audit` advisories (`proxy-addr`, `body-parser`, `undici`) |
| `RR_REVIEW_2026-11-02` | AI rate limiter without `trust proxy` / shared bucket |
| `RR_REVIEW_2026-11-02` | `app/` vs `android-app/` drift: `QAScreen` UK trivia, `askChat` rulebook meta, `storageKeys` `TRIVIA_USED_UK`, `CalendarScreen` undated guard, bike-setup image sizes |
| `RR_REVIEW_2026-11-02` | Wanneroo Track Memory layout shorter than catalog |
| `RR_REVIEW_2026-11-02` | Verified-hand misses: Broadford T12, Queensland Raceway T5, SMP Gardner T7, Mac Park T2/T3/T8/T12, The Bend International T18, Wakefield T9 |
| `SITE_DESIGN_2026-11-03` | Homepage circuit list (Collie, Symmons Plains, Calder Park, Sandown) |
| `AGENT_APPLE_SKILLS_2026-10-30` | `APP_REVIEW_NOTES.md` wording about SDK 57 `expo-speech-recognition` |
| `AGENT_APPLE_SKILLS_2026-10-30` | April 2027 iOS 27 SDK plan (SDK 58 / scene support) |

A new P0 is still reported. Wrong turn hands shipped in `track_turn_verification.json` or `tracks.json` remain P0 under `AGENTS.md`; the dismissed row covers only the diagnose-script misses listed above.

## Workflow

1. Hermes runs scheduled or on-demand review → writes report here.
2. Cursor follows `.cursor/skills/hermes-p0-fix/` and implements P0/P1 (dual-tree).
3. Re-run `node scripts/mobile-review-preflight.mjs` before merge.
4. Next Hermes review marks resolved items under **Resolved since last review**.

Setup: [`docs/hermes/CRON_SETUP.md`](../hermes/CRON_SETUP.md)
