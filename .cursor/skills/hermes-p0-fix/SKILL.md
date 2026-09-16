---
name: hermes-p0-fix
description: Implement P0/P1 items from the latest Hermes review reports. Use when the user asks to fix Hermes findings, close RR_REVIEW / MOBILE_OPS / ASC_PREFLIGHT items, or work through Cursor alerts in docs/reviews.
---

# Hermes P0/P1 fix

Hermes is report-only. This skill is the Cursor implementer for dated files in `docs/reviews/`.

Do not clone Hermes reviewers. Do not write a new `RR_REVIEW_*` unless the user asked for a review.

## When to use

- User mentions Hermes, P0/P1, CURSOR ALERT, weekly review, or “fix the latest report”
- After a new file appears under `docs/reviews/`

## Source reports (newest date wins)

Read only what you will implement:

1. `docs/reviews/RR_REVIEW_YYYY-MM-DD.md`
2. `docs/reviews/MOBILE_OPS_YYYY-MM-DD.md`
3. `docs/reviews/ASC_PREFLIGHT_YYYY-MM-DD.md`
4. Track extras if the P0 is track-shaped: `TRACK_*_YYYY-MM-DD.md`

Skip weekly-skills novels (`AGENT_APPLE_SKILLS_*`, `AGENT_PLAY_SKILLS_*`, `AI_ENTERPRISE_WATCH_*`) unless the user pointed at a concrete app fix inside them.

## Scope

- Implement **P0 and P1** only
- Skip P2 / nits unless the user asked
- Apply dual-tree rules (`.cursor/skills/dual-tree-apply/SKILL.md`)
- Track-hand or bake items: `.cursor/skills/track-details-bake/SKILL.md` — do not invent L/R from GPX

## Workflow

1. Open the newest report in each family above. List open P0/P1 with file paths.
2. Implement the smallest fix that closes the item.
3. Do not commit unless the user asked (then follow `.cursor/rules/vercel-commit-push.mdc`).
4. Verify from repo root:

```powershell
node scripts/mobile-review-preflight.mjs
```

If the change is track-only, also:

```powershell
node scripts/validate-track-data.mjs
node scripts/prove-track-maps.mjs
```

5. In the reply, list each P0/P1 as **fixed** or **blocked** (missing source / needs a verified hand / needs user submit). Do not edit the Hermes report unless the user asked.

## Do not

- Start a second full-app review
- Raise store submit or racing-line full rebuild to unattended
- “Resolve” a finding by deleting it from the report
