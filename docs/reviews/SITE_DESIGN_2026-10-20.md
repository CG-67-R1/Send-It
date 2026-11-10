# Site design — 2026-10-20

## Status

SITE: CURSOR ALERT — the page does not yet earn the download.

Mode: ui-benchmark. Report only. No site, app, or API files were edited and nothing was uploaded.

Method limits: the full-page screenshot was too tall for the vision tool (over 8000px), so I did not view the page at 390px. First-screen order and fold position below are computed from `docs/website/css/look.css` (single column at 600px and under) and the hero image, which I did view. Live HTML, CSS and JS were downloaded and diffed against the repo.

## Purchase confidence

- P0: 0 | P1: 1 | P2: 7
- The page is much closer than on 15 Oct. A rider on a phone sees "Your next session. Better prepared.", a one-line description that names track days and club racing, the official App Store badge, and a real Track Details screenshot in the hero. Free is stated beside the badge and at the foot. The one remaining blocker is a claim the app cannot keep: the circuit section is headed "Built around these paddocks" and lists 16 circuits, but Collie and Symmons Plains have no Track Details in the app.

## Professional UI this week

Strava, AllTrails and TrainingPeaks fetched. Full table in `CURRENT.md`. Patterns that matter here:

- Strava puts a short fact row (free, platforms, device support) directly above its closing action. RoadRacer has one 11px caption.
- AllTrails puts a QR code and the store badges under every benefit block. RoadRacer has the badge only in the hero and the foot.
- Strava gives its safety feature its own highlight block with the limit beside it. RoadRacer's "suggested line, not instruction" and informational-aid limit sit in a collapsed FAQ and the footer.

## Page vs app

Closed since 15 Oct (verified today):

- **Repo drift is gone.** Live `index.html`, `css/look.css` and `app.js` are identical to `docs/website/` (line endings ignored). Following the README no longer wipes the live page.
- **Hero is a real app screen.** `assets/gallery/track-race-line.jpg` (127 KB) is a bare iPhone screenshot of Track Details at One Raceway with the coloured suggested line, turn 2 badge and 4.5x zoom. It is loaded eagerly and carries alt text.
- **Badge is official.** The live `assets/download-on-the-app-store.svg` matches `docs/website/badges/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg` once whitespace is ignored.
- Social pills are out of the hero, and the live Facebook/Instagram links are in the footer only.
- Store link `https://apps.apple.com/au/app/id6799806571` returns 301 to the RoadRacer listing (id confirmed in the page data). `privacy.html`, `terms.html`, `copyright.html` and `uk/` return 200. UK page still says "Coming soon" and `apps.apple.com/gb/app/id6815475540` still returns 404, so that is correct.
- Zero "Send-It", price, in-app purchase or Android claims on the page.

Claims that match the app:

- Club dates: `api/data/au-road-race-events.json` has 75 AU events from club organisers (for example a Tasmanian interclub round at Symmons Plains), so "club dates plus MotoGP, WorldSBK and ASBK" holds.
- Speaking notes: `app.json` configures `expo-speech-recognition` for Track Walk and Track Details.
- "Chat history is not kept on the RoadRacer server" matches `docs/legal/PRIVACY.md` and the in-app Settings text.
- Rider / Tuner / Engineer appears in the Bike Balance screen.
- Race line is described as "suggested" in hero alt and cards. Good.

Claim that does not match:

- **Circuit list.** 14 of the 16 names have a GPX map, numbered turns and a racing line in the app (Baskerville, Broadford, Hidden Valley, Lakeside, Mac Park, Mallala, Morgan Park, One Raceway, Phillip Island, Queensland Raceway, Sydney Motorsport Park, The Bend, Wanneroo, Winton). **Collie and Symmons Plains** appear in the app only as calendar venues and in the onboarding area text. They have no entry in `app/src/data/gpxTrackMaps/` or `trackDetailsCorners/`. Calder Park and Sandown have Track Details but are not listed.

## Apply or suggest

| Priority | Finding | Apply or suggest | Cursor edit |
|----------|---------|------------------|-------------|
| P1 | The circuit grid, headed "Built around these paddocks — not a generic racing app", names Collie and Symmons Plains, which have no Track Details. A rider who races there installs expecting a map and finds none. Hero card 01 says "Track Details for Australian circuits" and the grid reads as the supported list. | Apply | In `docs/website/index.html` `#circuit-data`, remove "Collie" and "Symmons Plains", add "Calder Park" and "Sandown", and change the count text to match (16 stays 16). Sort alphabetically. Re-check against `app/src/data/gpxTrackMaps/index.ts` before upload. |
| P2 | Trust lines are weak above the fold: "FREE ON THE APP STORE FOR iPHONE / MADE FOR TRACK DAYS" is 11px muted caption text. "Stays on your device" and the informational-aid limit live in collapsed `<details>` and the footer. | Apply | Replace the `.micro` line with a short fact row at 13px or larger: "Free on the App Store · iPhone · Your setups and notes stay on your device". Leave the full limit in the FAQ and footer. |
| P2 | Overlay on the hero says "LESS GUESSWORK. MORE TRACK TIME." The second line promises an outcome the app does not deliver. | Suggest | Owner to approve a replacement that describes the screen, for example "Suggested line, zoomed to turn 2". Edit `.image-bottom` in `index.html`. |
| P2 | The store action appears in the hero and at the foot only. On a phone the foot is 6+ screens down. | Apply | Add a badge after the "Bike Balance + Bike Setup" block next to the existing "Get the app" button. Same official badge file, no new copy. |
| P2 | No QR code for desktop visitors, who cannot tap the badge. | Apply | Add a QR code beside the foot badge for `https://apps.apple.com/au/app/id6799806571`. Hide it at 600px and under. |
| P2 | Share cards use the square icon (`og:image` is `assets/icon.png`) with no `twitter:card`. A shared link shows a logo, not the product. | Apply | Point `og:image` at `https://roadracer.info/assets/gallery/track-race-line.jpg`, add `og:image:alt`, and add `twitter:card` `summary_large_image`. |
| P2 | `assets/RR-in-app.png` is 2.3 MB (shield, desktop only, hidden at 600px and under, lazy). Large for a decorative image when shown. | Suggest | Export a 600x600 PNG or WebP under 200 KB on the host and replace the file. Host asset, so the owner uploads it. |
| P2 | `docs/website/` has no `assets/` folder. The gallery images, icons and badge SVG used by the page exist only on the host, so the page cannot be previewed from the repo and a lost host would lose them. | Suggest | Owner to copy `assets/` from the host into `docs/website/assets/` and commit it, then change the README line "Leave `assets/` on the host" to say the repo is the master copy. |

`patterns.md` says the store URL is `https://apps.apple.com/app/id6799806571`. The page uses the `/au/` form, which resolves to the same listing and suits an Australian audience. Treat as a pass; I will keep it.

## Top fixes for Cursor

1. Fix the circuit list to match shipped Track Details: drop Collie and Symmons Plains, add Calder Park and Sandown (P1).
2. Replace the 11px caption under the hero badge with a visible Free / on-device fact row (P2).
3. Add a second store badge after the Bike Balance block (P2).
4. Point `og:image` at the hero screenshot and add `twitter:card` (P2).
5. Get the owner to approve a replacement for "More track time" (P2).

Implement with `.cursor/skills/app-marketing-site/`. `dual-tree-apply` does not apply, because this touches the site only. Upload `index.html` only; `css/look.css` and `app.js` already match the host.

## Open from earlier reports (SITE_DESIGN_2026-10-15)

| Earlier item | Status |
|--------------|--------|
| P1 hero is logo only | Closed. Real screenshot in hero. |
| P1 repo behind host | Closed. Files match. Assets still host-only (P2 above). |
| P2 on-device line only at foot | Open. See P2 trust-line row. |
| P2 social pills in hero | Closed. |
| P2 kicker names the audience | Closed in effect. Eyebrow reads "Built for the Australian paddock" and the intro names track days and club racing. |
| P2 no QR code | Open. |
| P2 hero alt text empty | Closed. |
| P2 host badge not verified | Closed. Matches official file. |
| P2 gallery weight unmeasured | Measured today: gallery JPEGs are 80 to 128 KB. Fine. Shield PNG is 2.3 MB (P2 above). |
| P2 no external proof | Open by design. Do not add a rating or download count until the owner can verify one in App Store Connect. |

## Summary

P0: 0 | P1: 1 | P2: 7
