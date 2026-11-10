# App site designer — current professional UI

**As of:** 2026-11-10  
**Owner:** ui-benchmark mode rewrites this file. Do not leave stale site-by-site notes in SKILL.md.

Pattern notes only. No sentences, screenshots, or marks copied. Fetched as text on 2026-11-10; layout was inferred from page content order, not rendered at 390px.

## Observed this week

| Site | First-screen order | How the product is shown | How the benefit is phrased | Store / primary action | Trust line near the action |
|------|--------------------|--------------------------|----------------------------|------------------------|----------------------------|
| Strava | Short community headline, one sentence with a scale figure and the word free, social + email sign-up buttons, log-in link, one-line legal consent | Device frame per feature block (record, analyse, desktop), each captioned. A safety feature (live location share) has its own highlighted block lower down | Verb-led block headlines, one benefit sentence each; three short "why stay" blurbs after the blocks | Sign-up repeated after the blocks, in a closing banner, and above the subscription section | Four-fact row directly above the closing action (free, scale, platforms, device support). Subscription is explained after the free path |
| AllTrails | Rotating full-bleed photography, a search box, three quick-action links | Same phone body beside each benefit block, one benefit per block | One short outcome sentence per block | QR code plus both store badges under every benefit block | None on the first screen. Partner collections and city lists sit lower |
| TrainingPeaks | Audience split first (athlete / coach), each with its own sign-up and its own trial length; goal-range sentence for the athlete | Hero photography and card art; product UI mostly deeper in. Photo cards for plans, learning content and a device-partner logo strip | Names the athlete's goal range before any feature; one short outcome line per card | Separate athlete and coach sign-up at the top, paired again in a closing block | Trial length stated beside each button. Device-partner logo strip as proof |

Changes since 2026-11-03: none that change a pattern. Strava, AllTrails and TrainingPeaks all kept the same block order. TrainingPeaks now also shows a photo-led article card and a plan-store quiz card above the closing block.

## Patterns worth applying (no new claims needed)

- Show a real phone screen per benefit block and repeat the store action after each (Strava, AllTrails). RoadRacer shows a real screen in the hero. The working-tree edit adds the badge beside the mid-page button; it is not on the host yet.
- Put the free/limit line directly under the action as a short fact row (Strava). The working-tree `.micro` is now a 13px fact row; the host still shows the 11px caption.
- Offer a QR code beside the badge for desktop visitors (AllTrails). The working tree has one at the foot (hidden at 600px and under); the host file `img/app-store-qr.svg` returns 404.
- Name the audience before the product name (TrainingPeaks audience split).
- Give a safety-relevant feature its own named highlight block, with its limit stated beside it (Strava). Maps to RoadRacer's "suggested line, not instruction" and informational-aid limit, now in a collapsed FAQ and the footer.
- Do not copy proof strips (team logos, "millions of users"). RoadRacer has no verified rating, download count or partner to show; leave that slot empty until the owner can verify one in App Store Connect.

## Seed fetch list (replace any that fail)

Strava, AllTrails, TrainingPeaks or Headspace. All three fetched this week. Headspace not fetched.

## Changelog

- **2026-11-10** — Fourth ui-benchmark. Same three sites; patterns unchanged. Live roadracer.info is unchanged since 2026-10-20 (index 9632 B, `css/look.css` 10692 B, `app.js` 1160 B). The repo working tree now holds uncommitted edits to `index.html`, `css/look.css`, `README.md` and a new `img/app-store-qr.svg`: they cover four of the 2026-11-03 P2s (13px fact row, mid-page badge, QR code, og:image + twitter:card) but not the circuit list P1. None are uploaded.
- **2026-11-03** — Third ui-benchmark. Same three sites; patterns unchanged. Live roadracer.info byte-identical to `docs/website/` (9632 / 10692 / 1160 bytes). Collie / Symmons Plains P1 open. Calder Park and Sandown have maps but are not listed.
- **2026-10-20** — Second ui-benchmark. Same three sites. Live roadracer.info byte-identical to `docs/website/`; host badge matches the official badge. Hero is now a real Track Details screen. New finding: two circuits on the page (Collie, Symmons Plains) have no Track Details in the app.
- **2026-10-15** — First ui-benchmark. Fetched Strava, AllTrails, TrainingPeaks. Live roadracer.info was ahead of `docs/website/` (gallery, Facebook, au-flag, circuit list, new contact email). Skill added earlier the same day; purchase confidence is the pass bar; patterns in `patterns.md`.
