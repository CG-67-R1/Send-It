# roadracer.info homepage (upload)

`roadracer.info` is served from LiteSpeed hosting, not this Vercel app. This folder is the homepage to upload into that site’s document root (same place as the live `index.html`).

Replace the live `index.html` and upload `css/look.css` and `app.js` with it. Leave `assets/`, `privacy.html`, `terms.html`, and `copyright.html` on the host. The homepage and the UK page share `css/look.css`. The older dark rules stay in the host `css/site.css` for the legal pages.

What changed vs the 3 Sep 2026 live page:

- **Get the app** now links to [App Store id6799806571](https://apps.apple.com/app/id6799806571)
- Email stays as the secondary contact
- Bike Setup card names **Bike Setup AI** (day sheet, gearing, tyre wear, Basics, Bike Balance last)
- Meta / OG mention gearing and tyre-wear notes without dropping “pocket coach”

## UK landing page (`roadracer.info/uk/`)

`uk/` uses the same editorial design as the homepage: paper background, red `#c92c18` accent, big headlines, red ticker, dark Bike Setup block. Shared files are `css/look.css` and `app.js`. UK-only files are `uk/index.html` and `uk/img/`. Upload those so the page serves at `https://roadracer.info/uk/`.

- **Shared styling.** Both pages link `css/look.css`. Do not point the homepage back at `css/site.css`.
- **Reused from the host:** `../assets/header-icon.png`, `../assets/RR-in-app.png`, `../assets/gallery/{tyre-wear,gearing,bike-balance-steering}.jpg`, and `../privacy.html`, `../terms.html`, `../copyright.html`. Nothing else needs uploading.
- **UK images** in `uk/img/` are crops of `docs/ios/screenshots/uk-iphone-6.5/` (Brands Hatch for the hero, Donington for the first card). Those captures are bare Track Details maps with no race line or numbered turns, so the page claims only the map. Retake them with the race line and turns, then swap the files.
- **No App Store badge.** The UK app (ASC `6815475540`, bundle `com.milroadracer.uk`) was not live when this was written (`apps.apple.com/gb/app/id6815475540` returned 404), so the page says "Coming soon" and links an email. **When live:** replace the hero button, the `.micro` line and the `#get` block with the official badge from `docs/website/badges/` linked to the UK App Store URL, change the meta description, and rename "Get updates" in the header.
- **Circuits** (`uk/app.js`) are the 10 UK layouts that have a GPX map in `app/src/data/gpxTrackMaps/`: Anglesey, Brands Hatch, Cadwell Park, Donington Park, Knockhill, Mallory Park, Oulton Park, Silverstone, Snetterton, Thruxton. The other 14 tracks in the UK pack have no map yet and are not named. Add a name here when its map ships.
- **Omitted on purpose:** "official rule check" (the UK rulebook slot has no clause data in `packs/regions/uk/rules/rulebook.json`) and "club dates" (UK Events carries MotoGP, WorldSBK and BSB only).
- **Colour:** the preview's `#e63823` is 3.8:1 on the paper background, below the 4.5:1 minimum for small text, so the UK page uses `#c92c18` (4.9:1) on light and `#ff6a55` on the dark block. The preview's 6 to 10px labels are raised to 10 to 12px.

Promo copy kit (Instagram, approved-line candidates, 30-day review): [`docs/marketing/bike-setup-promo/README.md`](../marketing/bike-setup-promo/README.md).
