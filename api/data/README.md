# Calendar data

The **What's On** calendar combines:

1. **MotoGP** – from `calendar-static.json` (curated). There is no public MotoGP calendar API; update this file when the new season calendar is published (e.g. from [motogp.com/en/calendar](https://www.motogp.com/en/calendar)).
2. **WorldSBK** – fetched live from [TheSportsDB](https://www.thesportsdb.com) free API (league id 4454). No manual update needed; the API returns the current season.
3. **Australian road racing** – from `calendar-static.json` (curated). Currently ASBK; you can add more series (e.g. state championships) by adding objects to the `australia` array with `title`, `venue`, `country`, `startDate`, `endDate`, `url`, and optional `series` (e.g. `"ASBK"`).

## Updating static dates

- **MotoGP:** Check [motogp.com/en/calendar](https://www.motogp.com/en/calendar) and [crash.net](https://www.crash.net/motogp) for the full calendar; edit `calendar-static.json` → `motogp`.
- **Australia:** Check [asbk.com.au](https://www.asbk.com.au) and Motorcycling Australia / state body calendars; edit `calendar-static.json` → `australia`.

After editing `calendar-static.json`, restart the API server or call `/calendar?refresh=1` to clear the cache.
