# Send-It review reports

Hermes (RoadRace app expert) writes review reports here. **Report only** — implementation happens in Cursor.

| File pattern | Author | Contents |
|--------------|--------|----------|
| `RR_REVIEW_YYYY-MM-DD.md` | `send-it/rr-app-expert` | Full audit: gates, screens, coding improvements |
| `MOBILE_REVIEW_YYYY-MM-DD.md` | `send-it/mobile-review` | Screen-focused audit (legacy / on-demand) |

## Workflow

1. Hermes runs scheduled or on-demand review → writes report here.
2. Cursor reads P0/P1 items and implements fixes.
3. Re-run `node scripts/mobile-review-preflight.mjs` before merge.
4. Next Hermes review marks resolved items under **Resolved since last review**.

Setup: [`docs/hermes/CRON_SETUP.md`](../hermes/CRON_SETUP.md)
