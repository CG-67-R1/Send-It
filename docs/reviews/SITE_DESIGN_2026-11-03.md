# Site design — 2026-11-03

## Status

SITE: CURSOR ALERT — the page does not yet earn the download.

Mode: ui-benchmark. Report only. No site, app, or API files were edited and nothing was uploaded.

Method limits: pages were fetched as text, not rendered at 390px. First-screen order and fold position are inferred from `docs/website/css/look.css` (single column at 600px and under; `.hero-visual` 380px tall; `.micro` 11px) and the HTML order. Live HTML, CSS and JS were downloaded and diffed against the repo.

## Purchase confidence

- P0: 0 | P1: 1 | P2: 7
- Unchanged from 2026-10-20: the page has not been edited since (live and repo are identical, last site commit `a9f4f09`). A rider on a phone sees "Your next session. Better prepared.", a line naming track days and club racing, the official App Store badge and a real Track Details screenshot. Free is stated beside the badge and at the foot. The one blocker is still a claim the app cannot keep: the circuit grid ("Built around these paddocks") lists Collie and Symmons Plains, which have no Track Details in the app. Everything else is polish.

## Professional UI this week

Strava, AllTrails and TrainingPeaks fetched (Headspace not fetched). Full table in `CURRENT.md`. Patterns that matter here:

- Strava puts a short four-fact row (free, scale, platforms, device support) above its closing action. RoadRacer has one 11px caption.
- AllTrails puts a QR code and the store badges under every benefit block. RoadRacer repeats a text "Get the app" button once and the badge only at the foot.
- Strava gives its safety feature its own highlight block. RoadRacer's "suggested line, not instruction" and informational-aid limit sit in a collapsed FAQ and the footer.
- TrainingPeaks states the trial length beside each button and shows a proof strip of elite teams. RoadRacer has no verifiable proof of that kind; do not invent one.

## Page vs app

Verified today:

- **Repo and host match.** `index.html` (9632 B), `css/look.css` (10692 B) and `app.js` (1160 B) from `https://roadracer.info/` are identical to `docs/website/` with line endings ignored.
- **Store link.** `https://apps.apple.com/au/app/id6799806571` returns 301 to the RoadRacer listing, then 200. The id is correct. `patterns.md` shows the `/app/` form; the `/au/` form resolves to the same listing, so I treat it as a pass.
- **Host pages and assets** return 200: `privacy.html`, `terms.html`, `copyright.html`, `uk/`, `assets/gallery/track-race-line.jpg`, `assets/icon.png`, `assets/RR-in-app.png` (2,323,632 B).
- **UK page.** `apps.apple.com/gb/app/id6815475540` still returns 404, so "Coming soon" on `uk/` is correct. The UK page is out of scope for the badge until it is live.
- **No "Send-It", price, in-app purchase or Android claims** on the homepage (grep of the live HTML returned 0).
- **Claims that match:** "club dates plus MotoGP, WorldSBK and ASBK" (AU calendar cache), speaking notes, on-device profile/setups/notes with chat going to the API, Rider / Tuner / Engineer in Bike Balance, race line described as "suggested".

Claim that does not match:

- **Circuit list.** `#circuit-data` names 16 circuits. In `app/src/data/gpxTrackMaps/index.ts` the shipped AU maps are baskerville, broadford, calder_park, hidden_valley, lakeside, mac_park, mallala, morgan_park, phillip_island, queensland_raceway, sandown, smp_brabham/druitt/gardner, the_bend_gt/international, wakefield_park (named "One Raceway (Wakefield Park)"), wanneroo and winton. **Collie** and **Symmons Plains** have no map, corners or racing line. **Calder Park** and **Sandown** do, and are not listed.

## Apply or suggest

| Priority | Finding | Apply or suggest | Cursor edit |
|----------|---------|------------------|-------------|
| P1 | The circuit grid, headed "Built around these paddocks — not a generic racing app", names Collie and Symmons Plains, which have no Track Details. A rider who races there installs expecting a map and finds none. Card 01 says "Track Details for Australian circuits", so the grid reads as the supported list. | Apply | In `docs/website/index.html` `#circuit-data`, remove "Collie" and "Symmons Plains", add "Calder Park" and "Sandown", keep the list alphabetical (16 stays 16), and check each name against `app/src/data/gpxTrackMaps/index.ts` before upload. Upload `index.html` only. |
| P2 | Trust line is weak above the fold: `.micro` ("FREE ON THE APP STORE FOR iPHONE / MADE FOR TRACK DAYS") is 11px muted caption text. "Stays on your device" and the informational-aid limit live in collapsed `<details>` and the footer. | Apply | Replace the `.micro` text with a fact row at 13px or larger: "Free on the App Store · iPhone · Your setups and notes stay on your device". In `css/look.css` change `.micro` to 13px. Upload `index.html` and `css/look.css`. |
| P2 | Hero overlay says "LESS GUESSWORK. MORE TRACK TIME." The second line promises an outcome the app does not deliver. | Suggest | Owner to approve a line that describes the screen, for example "Suggested line, zoomed to turn 2". Edit `.image-bottom` in `index.html`. |
| P2 | The store badge appears in the hero and at the foot only. The mid-page action is a text button, not the official badge. On a phone the foot is 6+ screens down. | Apply | Add the official badge from `docs/website/badges/` beside the existing "Get the app" button in `.setup-copy`. No new copy. |
| P2 | No QR code for desktop visitors, who cannot tap the badge. | Apply | Add a QR code beside the foot badge for `https://apps.apple.com/au/app/id6799806571` and hide it at 600px and under. |
| P2 | Share cards use the square icon (`og:image` is `assets/icon.png`) with no `twitter:card`. A shared link shows a logo, not the product. | Apply | Point `og:image` at `https://roadracer.info/assets/gallery/track-race-line.jpg`, add `og:image:alt`, and add `twitter:card` `summary_large_image`. |
| P2 | `assets/RR-in-app.png` is 2.3 MB (shield, desktop only, lazy). Large for a decorative image when it loads. | Suggest | Owner exports a 600x600 PNG or WebP under 200 KB on the host and replaces the file. |
| P2 | `docs/website/` has no `assets/` folder, so the page cannot be previewed from the repo and the gallery, icons and badge SVG exist only on the host. | Suggest | Owner copies `assets/` from the host into `docs/website/assets/` and commits it. Then change the README line "Leave `assets/` on the host". |

## Top fixes for Cursor

1. Fix the circuit list to match shipped Track Details: drop Collie and Symmons Plains, add Calder Park and Sandown (P1).
2. Replace the 11px `.micro` caption with a visible Free / on-device fact row at 13px+ (P2).
3. Add the official badge beside the mid-page "Get the app" button (P2).
4. Point `og:image` at the hero screenshot and add `twitter:card` (P2).
5. Get the owner to approve a replacement for "More track time" (P2).

Implement with `.cursor/skills/app-marketing-site/`. `dual-tree-apply` does not apply, because this touches the site only.

## Open from earlier reports

| Earlier item | Status |
|--------------|--------|
| 2026-10-20 P1 circuit list names Collie and Symmons Plains | **Open** (13 days). No site edit since. |
| 2026-10-20 P2 trust line is 11px | Open |
| 2026-10-20 P2 "More track time" overlay | Open, needs owner |
| 2026-10-20 P2 second badge mid-page | Open |
| 2026-10-20 P2 no QR code | Open |
| 2026-10-20 P2 og:image is the icon | Open |
| 2026-10-20 P2 2.3 MB shield PNG | Open, host asset |
| 2026-10-20 P2 repo has no `assets/` | Open, owner |
| P2 no external proof | Open by design. Do not add a rating or download count until verified in App Store Connect. |

## Summary

P0: 0 | P1: 1 | P2: 7
