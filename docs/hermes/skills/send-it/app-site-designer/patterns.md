# Professional mobile-app site patterns

Stable craft. Dated observations from live sites belong in [`CURRENT.md`](CURRENT.md), not here.

The job of the page is **purchase confidence**: a rider on a phone understands how the app helps them and is willing to tap Get the app.

## Reading order (first screen)

1. **Who it is for** — track-day riders and club racers, not “everyone who likes bikes”.
2. **Outcome** — what is different before the next session (learn the circuit, set the bike, get a briefing at their level).
3. **The product** — a real in-app screen, not only the shield logo.
4. **One action** — official App Store badge. Email and Instagram are secondary.
5. **Trust within one scroll** — free, on-device notes, informational aid only.

Feature cards come after that. Each card is an outcome, then the feature name.

## What professional homepages do (apply the pattern, not the brand)

- One job-to-be-done in the hero. Feature grids sit below.
- The product is shown in a phone, large enough to recognise a screen.
- Benefit sentence first, feature name second.
- The store action is repeated after the proof, not only in the header.
- A short limit line sits next to the action (price, privacy, or what it will not do).
- Type is large, contrast is high, and the page still works at 390px with no horizontal scroll.
- Navigation is a few in-page jumps (In the app, Get the app), not a brochure sitemap.

## Apply vs suggest

| Apply | Suggest only |
|-------|----------------|
| Reorder existing true copy so the outcome leads | A screenshot that is not already a real app capture |
| Put the store badge above the fold and again at the end | A review quote, star rating, or download count you have not verified |
| Name the rider and the session (track day, club race) | Play Store, pricing, or UK pack claims the live page does not make |
| Keep the amber-on-slate app palette so the site feels like the app | A new feature the screens do not ship |
| State free, on-device, and “not a coach or rule book” | Lap times, setup pressures, or “you will go faster” |

## Purchase-confidence checks

Pass only when all of these are true on a phone:

- The first screen names who it is for and one concrete benefit.
- A real product image is visible without scrolling past a logo-only hero. If the repo has no screen capture, mark **Suggest** and do not fake one.
- Every card maps to a shipped surface: Track Details, Coach, Bike Setup AI (day sheet, gearing, tyre wear, Basics, Bike Balance), Track Prep and Track Walk, Events, Q&A.
- The App Store link is `https://apps.apple.com/app/id6799806571` and uses the badge file in `docs/website/badges/`.
- Free, on-device data, and the informational-aid limit are on the page.
- Nothing says Send-It, a price, an in-app purchase, or a result the app does not provide.

## Out of scope

- Do not redesign the in-app UI. That is `mobile-app-expert`.
- Do not change store listing copy unless the user asks. That is Agent Apple / `store-listing-ship`.
- Do not publish the site. The owner uploads `docs/website/` to the LiteSpeed document root.
