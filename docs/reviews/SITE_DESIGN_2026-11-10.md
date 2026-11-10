# Site design — 2026-11-10

## Status

SITE: CURSOR ALERT — the page does not yet earn the download.

Mode: ui-benchmark. Report only. No site, app, android-app or API files were edited and nothing was uploaded.

Method limits: pages were fetched as text, not rendered at 390px. First-screen order and fold position are inferred from `docs/website/css/look.css` and the HTML order. Live HTML, CSS and JS were downloaded and diffed against the repo working tree.

## Purchase confidence

- P0: 0 | P1: 1 | P2: 5
- A rider on a phone sees "Your next session. Better prepared.", a line naming first track day through club racing, the official App Store badge and a real Track Details screenshot. Free is stated beside the badge. The one blocker is unchanged for 21 days: the circuit grid ("Built around these paddocks") lists Collie and Symmons Plains, which have no Track Details in the app. The repo working tree now holds uncommitted edits that fix four P2s from last week, but nothing is committed or uploaded, and the P1 is not in them.

## Professional UI this week

Strava, AllTrails and TrainingPeaks fetched (Headspace not fetched). Full table in `CURRENT.md`. No pattern changed since 2026-11-03. Still relevant:

- Strava puts a short fact row above its closing action; AllTrails puts a QR code and store badges under every benefit block; TrainingPeaks puts the trial length beside each button.
- RoadRacer has no verifiable proof of the logo-strip kind. Do not invent one.

## Page vs app

Verified today:

- **Live host unchanged.** `index.html` 9632 B, `css/look.css` 10692 B, `app.js` 1160 B are the same sizes as on 2026-11-03 and 2026-10-20. `app.js` is identical to the repo; `index.html` and `look.css` differ from the repo only because of the uncommitted edits below.
- **Uncommitted repo edits (not on host).** `git status` shows `docs/website/index.html`, `css/look.css`, `README.md` modified and `docs/website/img/` untracked (`app-store-qr.svg`). Last site commit is still `a9f4f09` (2026-10-16). The diff: `og:image` points at the Track Details screenshot with alt text and `twitter:card`; `.micro` is a 13px fact row ("Free on the App Store · iPhone · Your setups and notes stay on your device"); the official badge is added beside the mid-page "Get the app" button; a QR code sits beside the foot badge and is hidden at 600px and under. No new claims. `https://roadracer.info/img/app-store-qr.svg` returns 404 on the host, so the QR file must be uploaded with `index.html` and `look.css`.
- **Store link.** `https://apps.apple.com/au/app/id6799806571` returns 200 after redirect to the RoadRacer listing. The id is correct.
- **UK listing.** `apps.apple.com/gb/app/id6815475540` still returns 404, so "Coming soon" on `uk/` is correct.
- **No "Send-It"** on the live homepage (0 matches). No price, in-app purchase or Android claim in the page.
- **Claims that match:** speaking, photo and typed notes; on-device profile, setups and notes with AI chat going to the API; Rider / Tuner / Engineer in Bike Balance; race line described as "suggested"; Q&A as informational aid.

Claim that does not match (unchanged):

- **Circuit list.** `#circuit-data` names 16 circuits. In `app/src/data/gpxTrackMaps/index.ts` the shipped AU maps include `calder_park` and `sandown`, and there is no Collie or Symmons Plains map. The page's One Raceway entry is correct (`wakefield_park`).

## Apply or suggest

| Priority | Finding | Apply or suggest | Cursor edit |
|----------|---------|------------------|-------------|
| P1 | The circuit grid, headed "Built around these paddocks — not a generic racing app", names Collie and Symmons Plains, which have no Track Details. A rider who races there installs expecting a map and finds none. Open since 2026-10-20 (21 days). | Apply | In `docs/website/index.html` `#circuit-data`, remove "Collie" and "Symmons Plains", add "Calder Park" and "Sandown", keep the list alphabetical (16 stays 16), and check each name against `app/src/data/gpxTrackMaps/index.ts`. Include it in the same upload as the other pending edits. |
| P2 | Pending edits are uncommitted and not on the host, so riders still see the 11px caption, single mid-page text button, icon share card and no QR. | Apply | Review the working-tree diff, commit it with the circuit fix, and upload `index.html`, `css/look.css` and `img/app-store-qr.svg` together. Do not upload `index.html` alone: it references the QR file. |
| P2 | The QR SVG is untracked and I did not decode it. A wrong code would send desktop visitors to the wrong place. | Apply | Scan `docs/website/img/app-store-qr.svg` with a phone and confirm it opens the RoadRacer listing (`id6799806571`) before upload. |
| P2 | Hero overlay says "LESS GUESSWORK. MORE TRACK TIME." The second line promises an outcome the app does not deliver. | Suggest | Owner to approve a line that describes the screen, for example "Suggested line, zoomed to turn 2". Edit `.image-bottom` in `index.html`. |
| P2 | `assets/RR-in-app.png` is 2.3 MB (shield, desktop only, lazy). | Suggest | Owner exports a 600x600 PNG or WebP under 200 KB on the host and replaces the file. |
| P2 | `docs/website/` has no `assets/` folder, so the page cannot be previewed from the repo. | Suggest | Owner copies `assets/` from the host into `docs/website/assets/` and commits it, then updates the README line "Leave `assets/` on the host". |

## Top fixes for Cursor

1. Fix the circuit list to match shipped Track Details: drop Collie and Symmons Plains, add Calder Park and Sandown (P1).
2. Commit the pending homepage edits together with the circuit fix and upload `index.html`, `css/look.css` and `img/app-store-qr.svg` as one set (P2).
3. Scan the QR SVG and confirm it opens `id6799806571` before upload (P2).
4. Get the owner to approve a replacement for "More track time" (P2).

Implement with `.cursor/skills/app-marketing-site/`. `dual-tree-apply` does not apply, because this touches the site only.

## Open from earlier reports

| Earlier item | Status |
|--------------|--------|
| 2026-10-20 P1 circuit list names Collie and Symmons Plains | **Open** (21 days). Not in the pending edits. |
| 2026-11-03 P2 trust line is 11px | Fixed in working tree, not on host |
| 2026-11-03 P2 second badge mid-page | Fixed in working tree, not on host |
| 2026-11-03 P2 no QR code | Fixed in working tree, QR file 404 on host |
| 2026-11-03 P2 og:image is the icon | Fixed in working tree, not on host |
| 2026-10-20 P2 "More track time" overlay | Open, needs owner |
| 2026-10-20 P2 2.3 MB shield PNG | Open, host asset |
| 2026-10-20 P2 repo has no `assets/` | Open, owner |
| P2 no external proof | Open by design. Do not add a rating or download count until verified in App Store Connect. |

## Summary

P0: 0 | P1: 1 | P2: 5
