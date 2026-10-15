---
name: app-marketing-site
description: >-
  Create or update the RoadRacer marketing site so it matches the real app
  and current professional mobile-app homepage UI. Use when the user asks to
  design, build, or improve roadracer.info, docs/website, the homepage, or
  to apply a SITE_DESIGN review. Goal is phone purchase confidence: the
  visitor understands the benefit and can get the app.
---

# App marketing site

Build and edit the public site so a rider on a phone understands how RoadRacer helps them and can get the app. Hermes `app-site-designer` reviews and suggests. This skill applies the design in the repo.

Public name is **RoadRacer**. Do not write “Send-It” on the site.

## When to use

- Create or redesign the homepage
- Apply `docs/reviews/SITE_DESIGN_*.md`
- “Make the site match the app” or “improve the marketing UI”

## Read first

- `docs/hermes/skills/send-it/app-site-designer/patterns.md`
- `docs/hermes/skills/send-it/app-site-designer/CURRENT.md`
- Latest `docs/reviews/SITE_DESIGN_*.md` if one exists
- `docs/website/README.md` and `docs/website/index.html`
- `SCREEN_BRIEF_FOR_VISUALS.md` (what the app actually ships)
- `docs/marketing/bike-setup-promo/README.md` when Bike Setup copy changes

## Surfaces

| Surface | Path | Notes |
|---------|------|--------|
| Marketing site | `docs/website/index.html` | Owner uploads this to roadracer.info (LiteSpeed). |
| Store badge | `docs/website/badges/` | Use the official SVG. Do not redraw it. |
| Vercel promo | `app/public/promo.html` | Update only when the user wants that surface kept in step. |

Leave host-only `privacy.html`, `terms.html`, `copyright.html`, and existing `assets/` in place. `css/site.css` is on the host. If the layout needs rules the host file does not have, add `docs/website/css/site.css` and say it must be uploaded with `index.html`.

## Create or update

1. List the shipped benefits from the screen brief. Drop any card that names a screen the app no longer has.
2. First screen, in this order: who it is for, one outcome, a real product image if one already exists, App Store badge (`https://apps.apple.com/app/id6799806571`).
3. Then benefit cards. Outcome sentence first, feature name second. Allowed set: Track Details, Coach, Bike Setup AI, Track Prep and Track Walk, Events, Q&A.
4. Trust block: free, notes and setups on the device, AI chats may go to OpenAI, answers are informational aids.
5. Repeat the store badge at Get the app. Email stays secondary.
6. Apply patterns from `CURRENT.md` (hierarchy, phone layout, one action). Do not copy another brand’s words or images.
7. Style with the app palette: background `#0f172a`, card `#1e293b`, amber `#f59e0b`, text `#f8fafc`. Readable at 390px. No horizontal scroll.

## Claims you must not add

- A price, subscription, or in-app purchase (the page says free; no IAP on file).
- Play Store, unless the user says Play is shipping.
- Lap times, tyre pressures, “you will go faster”, or a substitute for a coach, technician, or rule book.
- Review quotes, ratings, or download counts that are not already verified in the repo.
- A fake screenshot. If none exists, keep the current image and note the gap.

## After editing

Open the page in a browser at about 390px wide and at a desktop width. Confirm the first screen states the benefit, the store link is the App Store id above, and no new claim failed the list. Say that roadracer.info changes only after the owner uploads `docs/website/`.

Do not commit unless the user asks.
