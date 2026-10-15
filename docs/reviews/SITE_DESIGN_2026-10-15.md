# Site design — 2026-10-15

## Status

SITE: CURSOR ALERT — the page does not yet earn the download.

Mode: ui-benchmark. Report only. Reviewed the live page at https://roadracer.info/ (fetched 2026-10-15) against `docs/website/index.html`. No site files were edited.

Method limits: the browser timed out, so I did not render the page at 390px. First-screen order below comes from the live HTML and `css/site.css?v=7` (single column at 720px and under). Image file sizes were not measured.

## Purchase confidence

- P0: 0 | P1: 2 | P2: 6
- Who it is for and the benefit are stated in the hero: Australian track days, learn the circuit, set the bike, a briefing that matches how you ride. The store badge sits in the hero with "Free on the App Store for iPhone" under it, and appears again at the end. Those checks pass. Two checks fail: the hero image is the shield logo rather than a screen, and the repo copy of the site cannot be uploaded without wiping the live page.

## Professional UI this week

Strava, AllTrails and TrainingPeaks were fetched. Full pattern table in `CURRENT.md`. The pattern notes that matter for RoadRacer:

- A real phone screen sits beside each benefit, with the store action repeated after it.
- The free/limit line sits directly under the action.
- AllTrails puts a QR code beside the store badge for desktop visitors.

## Page vs app

Claims that match (checked against `SCREEN_BRIEF_FOR_VISUALS.md` and the patterns file):

- Store link is `https://apps.apple.com/au/app/id6799806571`; it resolves (HTTP 200) and the id is correct.
- Free, on-device data, "AI chats may be processed by OpenAI", and the informational-aid limit are all on the page.
- No "Send-It", price, in-app purchase, Android or Play claim on the live page (0 Send-It matches).
- Track Details and race line captions say "find your starting point". That keeps the race line a suggestion, as AGENTS.md requires.

Claims to confirm with the owner:

- Events says "Club dates plus MotoGP, WorldSBK, and ASBK". The screen brief only lists the series. The gallery photo of Morgan Park track days supports club dates, but confirm they ship in the current App Store build.
- The circuit list has 16 names. Confirm each has Track Details in the shipped build.

Host vs repo drift (the main finding):

| Item | Live roadracer.info | `docs/website/index.html` |
|------|---------------------|---------------------------|
| Length | About 17.5 KB | About 6.6 KB |
| Gallery and Bike Balance screenshots | 17 lazy-loaded images | None |
| Circuit list, au-flag, Facebook, nav menu | Yes | No |
| Contact email | hello@roadracer.info | roadracer.au@outlook.com.au |
| Store link | `/au/` localised | Not localised |
| Badge | `assets/download-on-the-app-store.svg` (host copy) | `badges/` official SVG |
| CSS | `css/site.css?v=7` | Links `css/site.css`, none in repo |

Following `docs/website/README.md` today ("replace the live `index.html`") would delete the gallery and revert the contact email.

## Apply or suggest

| Priority | Finding | Apply or suggest | Cursor edit |
|----------|---------|------------------|-------------|
| P1 | The hero image is the RR shield logo. On a phone it is capped at 120px and sits below the buttons. The first real app screen is several scrolls down. Patterns require a real product image without scrolling past a logo-only hero. | Apply | Replace the hero `RR-in-app.png` with an existing real capture already on the host (`assets/gallery/track-details.jpg`), and show it at phone size next to or directly under the hero copy. |
| P1 | Repo `docs/website/` is far behind the live page, so uploading it would regress the site. | Apply | Pull the live `index.html`, `css/site.css`, and `assets/gallery/` into `docs/website/` first, then update the README to say the repo now matches the host. Make all later edits on top of that. |
| P2 | The on-device and informational-aid lines are only at the foot of the page, after the gallery. "Free" is near the badge, but "setups and notes stay on your device" is not. | Apply | Add one line under the hero badge: "Free. Your setups and notes stay on your device." Keep the full footnote at the bottom. |
| P2 | Instagram and Facebook pills sit next to the badge, so the hero has three actions. Patterns want one primary action. | Apply | Remove the two pills from the hero and the Get-the-app block. They are already in the footer. |
| P2 | The kicker above the H1 is "Motorsport Is Life", the owner's brand. The H1 repeats the header wordmark. Neither tells the visitor who it is for. | Apply | Change the kicker to "For Australian track-day riders and club racers" (language already on the page). |
| P2 | Desktop visitors cannot tap the badge. | Apply | Add a QR code beside the footer badge pointing at the same App Store URL. No new claim. |
| P2 | The hero image has empty `alt`. Seventeen 924x2000 images are lazy-loaded, and I did not measure their weight. | Suggest | Give the hero image alt text. Check gallery JPEG sizes and serve a smaller width for phones. |
| P2 | The live badge is a host copy, not the file in `docs/website/badges/`. I did not verify it is Apple's unaltered artwork. | Suggest | Compare it with the official SVG and switch to it if they differ. |
| P2 | There is no external proof (rating, review, download count). | Suggest | Do not add one until the owner can verify a real figure from App Store Connect. |

## Top fixes for Cursor

1. Sync `docs/website/` from the live host before anything else (P1, drift).
2. Put a real app screen in the hero (P1).
3. Put "Free. Setups and notes stay on your device." under the hero badge (P2).
4. Remove the social pills from the hero and Get-the-app block (P2).
5. Change the kicker to name the audience (P2).

Implement with `.cursor/skills/app-marketing-site/`. `dual-tree-apply` does not apply, because this touches the site only.

## Open from earlier reports

None. This is the first SITE_DESIGN report.
