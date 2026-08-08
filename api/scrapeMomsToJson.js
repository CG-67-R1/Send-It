/**
 * Focused MoMS scrape for Official rule check.
 * Full text: GCRs (chs 1–5), Road Race (6), Historic Road Race (7), Appendices (17).
 * Reference list only: other discipline chapters (8–16) + website extras.
 *
 * Usage: node scrapeMomsToJson.js
 *        npm run scrape-moms
 *
 * Looks for *MoMS*.pdf in ../Q&A (prefers newest). Writes MoMS-<edition>-road-historic.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'Q&A');

const CHAPTERS = [
  { number: 1, title: '1 JURISDICTION', shortTitle: 'Jurisdiction', mode: 'full' },
  { number: 2, title: '2 ADMINISTRATION', shortTitle: 'Administration', mode: 'full' },
  { number: 3, title: '3 EVENTS', shortTitle: 'Events', mode: 'full' },
  {
    number: 4,
    title: '4 ALTERNATIVE FORMS OF EVENTS',
    shortTitle: 'Alternative Forms of Events',
    mode: 'full',
  },
  {
    number: 5,
    title: '5 OFFENCES, PROTESTS AND APPEALS',
    shortTitle: 'Offences, Protests and Appeals',
    mode: 'full',
  },
  { number: 6, title: '6 ROAD RACE', shortTitle: 'Road Race', mode: 'full' },
  { number: 7, title: '7 HISTORIC ROAD RACE', shortTitle: 'Historic Road Race', mode: 'full' },
  {
    number: 8,
    title: '8 MOTOCROSS AND SUPERCROSS',
    shortTitle: 'Motocross and Supercross',
    mode: 'reference',
  },
  {
    number: 9,
    title: '9 CLASSIC MOTOCROSS AND CLASSIC DIRT TRACK',
    altTitles: ['9 CLASSIC MOTOCROSS'],
    shortTitle: 'Classic Motocross and Classic Dirt Track',
    mode: 'reference',
  },
  {
    number: 10,
    title: '10 ENDURO AND RELIABILITY TRIALS',
    shortTitle: 'Enduro and Reliability Trials',
    mode: 'reference',
  },
  {
    number: 11,
    title: '11 ALL TERRAIN VEHICLES',
    altTitles: ['11 ATV', 'ALL TERRAIN VEHICLES'],
    shortTitle: 'ATV / All Terrain Vehicles',
    mode: 'reference',
  },
  { number: 12, title: '12 SPEEDWAY', shortTitle: 'Speedway', mode: 'reference' },
  {
    number: 13,
    title: '13 DIRT TRACK, TRACK & FLAT TRACK',
    shortTitle: 'Dirt Track, Track & Flat Track',
    mode: 'reference',
  },
  { number: 14, title: '14 SUPERMOTO', shortTitle: 'Supermoto', mode: 'reference' },
  { number: 15, title: '15 TRIAL', shortTitle: 'Trial', mode: 'reference' },
  { number: 16, title: '16 MINIKHANA', shortTitle: 'Minikhana', mode: 'reference' },
  { number: 17, title: '17 APPENDICES', shortTitle: 'Appendices', mode: 'full' },
];

const EXTERNAL_REFERENCES = [
  {
    title: 'Model Supplementary Regulations',
    note: 'Refer to the MA website (www.ma.org.au) — not fully scraped into this JSON.',
  },
  {
    title: 'National Integrity Framework (NIF) / Member Welfare Policy',
    note: 'Refer to www.ma.org.au',
  },
  { title: 'National Personal Accident Insurance', note: 'Refer to www.ma.org.au' },
  { title: 'Non-NIF Complaint and Dispute Resolution Policy', note: 'Refer to www.ma.org.au' },
  { title: 'Licence Conditions and Endorsements', note: 'Refer to www.ma.org.au' },
  { title: "Officials' Powers and Authorities", note: 'Refer to www.ma.org.au' },
];

function looksLikeTocOnly(window) {
  // TOC rows are mostly leader dots + a page number; chapter bodies mention MANUAL / APPLICATION / clauses
  const hasBodyMarker =
    /APPLICATION OF CHAPTER|MANUAL OF MOTORCYCLE SPORT|DEFINITIONS|THE CONTROLLING|VENUES|APPENDIX|PROHIBITED CONDUCT|ALTERNATIVE ACTIVITIES|SECTION\s+\d/i.test(
      window
    ) || /\d[\uFFFD.]\d{1,2}\b/.test(window);
  if (hasBodyMarker) return false;
  return /[\uFFFD�]{8,}/.test(window) || /_{12,}/.test(window) || /·{8,}/.test(window);
}

function findBodyStart(text, title, minIndex = 12000) {
  let idx = Math.max(0, minIndex);
  let best = -1;
  while ((idx = text.indexOf(title, idx)) !== -1) {
    const window = text.slice(idx, idx + 320);
    if (looksLikeTocOnly(window)) {
      idx += title.length;
      continue;
    }
    const bodyish =
      /APPLICATION OF CHAPTER|MANUAL OF MOTORCYCLE SPORT|DEFINITIONS|THE CONTROLLING|VENUES|APPENDIX|PROHIBITED CONDUCT|ALTERNATIVE ACTIVITIES|SECTION\s+\d/i.test(
        window
      ) || /\d[\uFFFD.]\d/.test(window);
    if (bodyish) return idx;
    if (best < 0) best = idx;
    idx += title.length;
  }
  return best;
}

/** Known MoMS 2026 TOC pages (fallback if PDF leaders break regex). */
const TOC_PAGE_FALLBACK = {
  1: 8,
  2: 12,
  3: 14,
  4: 22,
  5: 24,
  6: 29,
  7: 64,
  8: 88,
  9: 113,
  10: 128,
  11: 160,
  12: 169,
  13: 198,
  14: 219,
  15: 230,
  16: 242,
  17: 260,
};

function parseTocPages(text) {
  const tocEnd = text.search(/\nINTRODUCTION TO THE|\n3\nINTRODUCTION/);
  const toc = text.slice(0, tocEnd > 0 ? tocEnd : 6000);
  const pages = { ...TOC_PAGE_FALLBACK };
  for (const ch of CHAPTERS) {
    // Match "6 ROAD RACE" … "29" with any leader characters between
    const re = new RegExp(
      `${ch.number}\\s+${ch.shortTitle.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&').replace(/\s+/g, '\\s+')}[\\s\\S]{0,120}?(\\d{1,3})(?=\\s*\\n)`,
      'i'
    );
    const m = toc.match(re);
    if (m) pages[ch.number] = Number(m[1]);
  }
  return pages;
}

function extractApplicationBlurb(chunk) {
  // Skip TOC-style APPLICATION headers (leader dots); take the prose paragraph after.
  const re = /APPLICATION OF CHAPTER\s*([\s\S]{0,1200})/gi;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    let body = m[1]
      .replace(/^[\s\uFFFD�·._]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Drop leftover leader-only blobs
    body = body.replace(/^[\uFFFD�·._\s]{10,}/, '').trim();
    if (body.length < 40) continue;
    if (/^[\uFFFD�·._\s]+$/.test(body)) continue;
    // Prefer sentences that describe the chapter
    const cut = body.search(/\n\d[\uFFFD.]|\nSECTION\s|\s\d{1,2}[\uFFFD.]\d/);
    if (cut > 40) body = body.slice(0, cut);
    return body.slice(0, 500);
  }
  return '';
}

/** Split full chapter text into clause/heading blocks for RAG location citations. */
function toMomsBlocks(chapterNumber, shortTitle, content) {
  const blocks = [];
  const lines = String(content || '').split(/\n/);
  let currentLoc = `Chapter ${chapterNumber}: ${shortTitle}`;
  let paragraphLines = [];

  const flush = () => {
    const text = paragraphLines.join('\n').trim();
    if (!text) return;
    const clauseMatch = String(currentLoc).match(/\b(\d+\.\d+(?:\.\d+){0,3})\b/);
    blocks.push({
      type: /^Chapter\s+\d+/i.test(currentLoc) && text.length < 120 ? 'heading' : 'paragraph',
      location: currentLoc,
      clauseId: clauseMatch ? clauseMatch[1] : undefined,
      chapter: chapterNumber,
      text,
    });
    paragraphLines = [];
  };

  const clauseRe = new RegExp(
    `^\\s*(${chapterNumber}\\.\\d+(?:\\.\\d+){0,3})\\b(.*)$`
  );
  const sectionRe = new RegExp(
    `^\\s*(?:SECTION\\s+${chapterNumber}[A-Z]?[:\\s].*|${chapterNumber}[\\uFFFD.\\-]\\d+\\s+.+)$`,
    'i'
  );

  for (const line of lines) {
    const clause = line.match(clauseRe);
    const section = !clause && sectionRe.test(line) ? line.trim() : null;
    if (clause) {
      flush();
      const rest = (clause[2] || '').trim();
      currentLoc = rest ? `${clause[1]} ${rest}`.slice(0, 140) : clause[1];
      paragraphLines.push(line);
    } else if (section) {
      flush();
      currentLoc = section.replace(/[\uFFFD�]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
      paragraphLines.push(line);
    } else {
      paragraphLines.push(line);
    }
  }
  flush();
  return blocks;
}

function nextReviewDue(editionYear) {
  // Flag after mid-January of the following calendar year
  return `${Number(editionYear) + 1}-01-15`;
}

async function findMomsPdf() {
  const files = await fs.readdir(QA_DIR).catch(() => []);
  const pdfs = [];
  for (const file of files) {
    if (!/\.pdf$/i.test(file)) continue;
    if (!/moms|manual\s*of\s*motorcycle/i.test(file)) continue;
    const st = await fs.stat(path.join(QA_DIR, file));
    pdfs.push({ file, mtime: st.mtimeMs, size: st.size });
  }
  pdfs.sort((a, b) => b.mtime - a.mtime);
  return pdfs[0] || null;
}

async function run() {
  const pdfInfo = await findMomsPdf();
  if (!pdfInfo) {
    console.error('No MoMS PDF found in Q&A/. Expected a filename containing MoMS.');
    process.exit(1);
  }

  const filePath = path.join(QA_DIR, pdfInfo.file);
  console.log(`Reading ${pdfInfo.file} (${pdfInfo.size} bytes)...`);
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  const text = (data.text || '').replace(/\r\n/g, '\n');
  console.log(`Parsed ${data.numpages ?? '?'} pages, ${text.length} chars`);

  const editionMatch =
    pdfInfo.file.match(/(20\d{2})/) || text.slice(0, 2000).match(/\b(20\d{2})\s+MANUAL OF/);
  const edition = editionMatch ? editionMatch[1] : String(new Date().getFullYear());
  const dateMatch = pdfInfo.file.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const effectiveDate = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    : `${edition}-01-01`;

  const tocPages = parseTocPages(text);
  const starts = CHAPTERS.map((ch) => {
    let start = findBodyStart(text, ch.title);
    if (start < 0 && Array.isArray(ch.altTitles)) {
      for (const alt of ch.altTitles) {
        start = findBodyStart(text, alt);
        if (start >= 0) break;
      }
    }
    // Last resort for short titles: "\n11 ATV" after chapter 10 start
    if (start < 0 && ch.number === 11) {
      const approx = text.search(/\n11\s+ATV\b/);
      if (approx > 100000) start = approx;
    }
    if (start < 0 && ch.number === 9) {
      const approx = text.search(/\n9\s+CLASSIC MOTOCROSS/);
      if (approx > 100000) start = approx;
    }
    return { ...ch, start };
  });

  for (const ch of starts) {
    if (ch.start < 0) console.warn(`  WARN: could not locate body for ${ch.title}`);
    else console.log(`  ch ${ch.number} (${ch.mode}) @ ${ch.start}`);
  }

  const ordered = starts
    .filter((c) => c.start >= 0)
    .sort((a, b) => a.start - b.start);

  const chapters = [];
  const fullBlocks = [];
  const fullParts = [];

  for (let i = 0; i < ordered.length; i++) {
    const ch = ordered[i];
    const end = i + 1 < ordered.length ? ordered[i + 1].start : text.length;
    const chunk = text.slice(ch.start, end).trim();
    const pageStart = tocPages[ch.number] ?? null;

    if (ch.mode === 'full') {
      const contentBlocks = toMomsBlocks(ch.number, ch.shortTitle, chunk);
      chapters.push({
        number: ch.number,
        title: ch.shortTitle,
        mode: 'full',
        pageStart,
        charCount: chunk.length,
        content: chunk,
        contentBlocks,
      });
      fullParts.push(`\n\n===== Chapter ${ch.number}: ${ch.shortTitle} =====\n\n${chunk}`);
      for (const b of contentBlocks) {
        fullBlocks.push({
          type: b.type,
          location: b.location,
          text: b.text,
          chapter: ch.number,
        });
      }
      console.log(`  FULL ch ${ch.number}: ${chunk.length} chars, ${contentBlocks.length} blocks`);
    } else {
      const blurb = extractApplicationBlurb(chunk);
      const cleanBlurb =
        blurb &&
        !/[\uFFFD�]{3,}/.test(blurb) &&
        /^(The|These|This|GCRs|For )\b/i.test(blurb)
          ? blurb
          : '';
      const summary =
        `MoMS ${edition} Chapter ${ch.number}: ${ch.shortTitle}` +
        `${pageStart ? ` (from page ${pageStart})` : ''}. ` +
        `Full discipline rules are not indexed in this Road Race–focused scrape — see the MoMS PDF or www.ma.org.au.` +
        (cleanBlurb ? ` ${cleanBlurb}` : '');
      chapters.push({
        number: ch.number,
        title: ch.shortTitle,
        mode: 'reference',
        pageStart,
        charCount: chunk.length,
        summary,
      });
      console.log(`  REF  ch ${ch.number}: page ${pageStart ?? '?'}`);
    }
  }

  const referenceList = [
    ...chapters
      .filter((c) => c.mode === 'reference')
      .map((c) => ({
        chapter: c.number,
        title: c.title,
        pageStart: c.pageStart,
        summary: c.summary,
        where: `MoMS ${edition} Chapter ${c.number}${c.pageStart ? ` (from p.${c.pageStart})` : ''} — PDF / www.ma.org.au`,
      })),
    ...EXTERNAL_REFERENCES.map((r) => ({
      chapter: null,
      title: r.title,
      pageStart: null,
      summary: r.note,
      where: r.note,
    })),
  ];

  // Lightweight Q/A seeds so retrieval can answer “where is X?” for ref chapters
  const qa = referenceList
    .filter((r) => r.chapter != null)
    .map((r) => ({
      id: `moms-ref-ch${r.chapter}`,
      origin: pdfInfo.file,
      corpus: 'moms',
      q: `Where are the ${r.title} rules in MoMS?`,
      a: `${r.summary} Location: ${r.where}. This Road Race–focused index does not include the full chapter text.`,
    }));

  const content = fullParts.join('\n').trim();
  const outName = `MoMS-${edition}-road-historic.json`;
  const outPath = path.join(QA_DIR, outName);

  const payload = {
    corpus: 'moms',
    edition,
    effectiveDate,
    origin: pdfInfo.file,
    title: `${edition} Manual of Motorcycle Sport — Road Race & Historic focus`,
    numpages: data.numpages ?? null,
    scrapedAt: new Date().toISOString(),
    updatePolicy: {
      reminder:
        'When MA publishes a new MoMS edition (usually early each year), replace the PDF in Q&A/ and run: cd api && npm run scrape-moms. Redeploy the API.',
      nextReviewDue: nextReviewDue(edition),
      hermesCheck: 'health-check / daily gate flags MoMS if edition year is stale after nextReviewDue',
    },
    scope: {
      fullChapters: CHAPTERS.filter((c) => c.mode === 'full').map((c) => c.number),
      referenceOnlyChapters: CHAPTERS.filter((c) => c.mode === 'reference').map((c) => c.number),
      note: 'Full GCR chapters 1–5 apply to all disciplines including Road Race and Historic. Chapters 6–7 and Appendices (17) are fully indexed. Other disciplines are reference-only.',
    },
    content,
    contentBlocks: fullBlocks,
    chapters: chapters.map((c) =>
      c.mode === 'full'
        ? {
            number: c.number,
            title: c.title,
            mode: c.mode,
            pageStart: c.pageStart,
            charCount: c.charCount,
            // Keep chapter content in top-level content/blocks for RAG; omit duplicate huge copy in chapters array
            blockCount: c.contentBlocks.length,
          }
        : {
            number: c.number,
            title: c.title,
            mode: c.mode,
            pageStart: c.pageStart,
            summary: c.summary,
          }
    ),
    referenceList,
    qa,
  };

  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\nWrote ${outName}`);
  console.log(`  full content: ${content.length} chars, ${fullBlocks.length} blocks`);
  console.log(`  reference entries: ${referenceList.length}`);
  console.log(`  nextReviewDue: ${payload.updatePolicy.nextReviewDue}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
