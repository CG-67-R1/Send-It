# Calendar data

The **What's On** calendar combines:

1. **MotoGP** – from `calendar-static.json` (curated). There is no public MotoGP calendar API; update this file when the new season calendar is published (e.g. from [motogp.com/en/calendar](https://www.motogp.com/en/calendar)).
2. **WorldSBK** – fetched live from [TheSportsDB](https://www.thesportsdb.com) free API (league id 4454). No manual update needed; the API returns the current season.
3. **ASBK** – from `calendar-static.json` → `australia` (curated national Australian Superbike Championship rounds).
4. **Australian club/state road racing** – from `au-road-race-events.json`, produced by a scraper that uses `au-road-race-sources.json` as its source list and filters to road-race discipline.

**Governing-body calendars** (MA + most states) use the shared **Timely** ICS export (`calendar_id` 54704199) with per-state `filter_groups` and the Road Race tag (`677551074`). Tasmania uses Ridernet (HTML fallback only).

**Champions Ride Days** track-day calendar is scraped from [championsridedays.com.au/event-calender/](https://championsridedays.com.au/event-calender/) (embedded FooEvents JSON). Refresh **bi-monthly**; scraper keeps the **next 2 months** only.

## Refresh AU calendar (scraped events)

```bash
cd api && npm run refresh-au-calendar
```

This reads `au-road-race-sources.json`, scrapes Timely ICS feeds (MA + state governing bodies), web calendar pages (Computime, Phoenix MCC), and optionally Facebook pages via RSS-Bridge when `facebook_page` is set on a source.

Output: `au-road-race-events.json` with `{ updatedAt, sourceCount, eventCount, errors, events: [...] }`.

**Facebook caveat:** RSS-Bridge public instances are fragile and may return errors. Facebook-sourced events are marked `confidence: "low"` with a verify note. Treat as supplementary to web calendars.

Env: `FACEBOOK_RSS_BRIDGE_BASE` (default `https://rss-bridge.org/bridge01`).

## Updating static dates

- **MotoGP:** Check [motogp.com/en/calendar](https://www.motogp.com/en/calendar) and [crash.net](https://www.crash.net/motogp) for the full calendar; edit `calendar-static.json` → `motogp`.
- **ASBK:** Check [asbk.com.au](https://www.asbk.com.au) and Motorcycling Australia releases; edit `calendar-static.json` → `australia`.
- **AU club/state:** Point your scraper at `au-road-race-sources.json` and emit `au-road-race-events.json` with records shaped like:
  - `name`, `start_date`, `end_date`, `state`, `venue`, `organiser`, `source_id`, `source_url`, `entry_url`, `discipline`, `notes` (see `output_expectation` in `au-road-race-sources.json`).

After editing `calendar-static.json` or regenerating `au-road-race-events.json`, restart the API server or call `/calendar?refresh=1` to clear the cache.
