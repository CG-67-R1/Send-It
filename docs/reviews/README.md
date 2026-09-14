# Send-It review reports

Hermes (RoadRace app expert) writes review reports here. **Report only** — implementation happens in Cursor.

**Naming convention:** `FAMILY_YYYY-MM-DD.md` — always this folder, never elsewhere.

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
| `UI_DESIGN_*_YYYY-MM-DD.md` | `mobile-design/ui-designer` | UI/UX design review |
| `MARKET_FILL_*.md` | `send-it/market-pack` | Regional pack research fills |
| `GPT_*_AUDIT_*.md` | `send-it/gpt-knowledge-pack-audit` | Custom GPT knowledge pack audits |

One-off handoff docs (no date suffix, e.g. `GPX_CORNER_DETECTOR_95_ACCURACY_HANDOFF.md`) are allowed but should be rare.

## Workflow

1. Hermes runs scheduled or on-demand review → writes report here.
2. Cursor reads P0/P1 items and implements fixes.
3. Re-run `node scripts/mobile-review-preflight.mjs` before merge.
4. Next Hermes review marks resolved items under **Resolved since last review**.

Setup: [`docs/hermes/CRON_SETUP.md`](../hermes/CRON_SETUP.md)
