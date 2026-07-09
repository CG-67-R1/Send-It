/**
 * Refresh AU headline cache file for fallback when live scraping fails (e.g. on Render).
 * Usage: node scripts/refreshAuHeadlines.js
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AU_SCRAPERS, AU_SOURCE_IDS } from '../scrapers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, '..', 'data', 'au-headlines.json');

async function main() {
  const headlines = [];
  for (const { id, fn } of AU_SCRAPERS) {
    try {
      const items = await fn();
      console.log(`${id}: ${items.length} items`);
      headlines.push(...items);
    } catch (e) {
      console.warn(`${id}: failed`, e.message || e);
    }
  }

  const seen = new Set();
  const deduped = headlines.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });

  const payload = {
    updatedAt: new Date().toISOString(),
    sourceIds: AU_SOURCE_IDS,
    count: deduped.length,
    headlines: deduped,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${deduped.length} AU headlines to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
