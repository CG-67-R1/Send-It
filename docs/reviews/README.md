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
| `AI_ENTERPRISE_WATCH_YYYY-MM-DD.md` | `send-it/ai-enterprise-watch` | Weekly enterprise AI landscape (short form goes to Telegram) |
| `TRACK_*_YYYY-MM-DD.md` | `send-it/track-data-analyst` | Track catalog / GPX / Track Memory deep audits |
| `SECURITY_REVIEW_YYYY-MM-DD.md` | on-demand | Security-focused audit |
| `UI_DESIGN_*_YYYY-MM-DD.md` | on-demand (no Hermes skill) | UI/UX design review vs `SCREEN_BRIEF_FOR_VISUALS.md` |
| `MARKET_FILL_*.md` | `send-it/market-pack` | Regional pack research fills |
| `GPT_*_AUDIT_*.md` | on-demand (`scripts/gpt-repo-parity-audit.mjs`) | Custom GPT knowledge pack audits |

One-off handoff docs (no date suffix, e.g. `GPX_CORNER_DETECTOR_95_ACCURACY_HANDOFF.md`) are allowed but should be rare.

## Workflow

1. Hermes runs scheduled or on-demand review → writes report here.
2. Cursor follows `.cursor/skills/hermes-p0-fix/` and implements P0/P1 (dual-tree).
3. Re-run `node scripts/mobile-review-preflight.mjs` before merge.
4. Next Hermes review marks resolved items under **Resolved since last review**.

Setup: [`docs/hermes/CRON_SETUP.md`](../hermes/CRON_SETUP.md)
