import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function probeRss(label, url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(25000),
    });
    const text = await res.text();
    const entries = (text.match(/<entry/g) || []).length;
    const items = (text.match(/<item/g) || []).length;
    console.log(`[rss] ${label}: ${res.status} entries=${entries} items=${items} len=${text.length}`);
    if (entries || items) {
      const parser = new Parser({ timeout: 20000 });
      const feed = await parser.parseString(text);
      console.log(`  title=${feed.title} parsed=${feed.items?.length}`);
      if (feed.items?.[0]) {
        console.log(`  first: ${feed.items[0].title?.slice(0, 80)}`);
        console.log(`  link: ${feed.items[0].link}`);
      }
    }
  } catch (e) {
    console.log(`[rss] ${label}: FAIL ${e.message}`);
  }
}

async function probeHtml(label, url, selector) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(25000),
    });
    const text = await res.text();
    const $ = cheerio.load(text);
    const count = $(selector).length;
    console.log(`[html] ${label}: ${res.status} len=${text.length} ${selector}=${count}`);
    if (count > 0) {
      const first = $(selector).first();
      console.log(`  first href: ${first.attr('href')}`);
      console.log(`  first text: ${first.text().trim().slice(0, 80)}`);
    }
  } catch (e) {
    console.log(`[html] ${label}: FAIL ${e.message}`);
  }
}

const rssUrls = [
  ['instagram-atom', 'https://rss-bridge.org/bridge01/?action=display&bridge=Instagram&u=peterbom4racing&format=Atom'],
  ['picuki-bridge', 'https://rss-bridge.org/bridge01/?action=display&bridge=PicukiBridge&u=peterbom4racing&format=Atom'],
  ['picnob-bridge', 'https://rss-bridge.org/bridge01/?action=display&bridge=PicnobBridge&u=peterbom4racing&format=Atom'],
];

for (const [label, url] of rssUrls) {
  await probeRss(label, url);
}

await probeHtml('picuki-profile', 'https://www.picuki.com/profile/peterbom4racing', '.box-photos .box-photo a');
await probeHtml('picnob-profile', 'https://picnob.com/profile/peterbom4racing', 'a[href*="/post/"]');

const buzzsprout = 'https://feeds.buzzsprout.com/2181509.rss';
await probeRss('oxley-bom-podcast', buzzsprout);
