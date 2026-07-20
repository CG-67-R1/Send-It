import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URLS_FILE = path.join(__dirname, 'data', 'moms-online-urls.json');

let cached = null;

async function loadMomsOnlineUrls() {
  if (cached) return cached;
  try {
    const raw = await fs.readFile(URLS_FILE, 'utf-8');
    cached = JSON.parse(raw);
    return cached;
  } catch (e) {
    console.warn('MoMS online URLs not loaded:', e?.message || e);
    cached = {
      sourcePage: 'https://www.ma.org.au/licences-rules/rules/general-competition-rules/',
      chapters: {},
    };
    return cached;
  }
}

/**
 * Derive MoMS chapter number from clause id or location text.
 * @param {{ clauseId?: string, location?: string, title?: string }} source
 * @returns {number | null}
 */
export function chapterNumberFromSource(source) {
  const clauseId = source?.clauseId;
  if (clauseId) {
    const m = String(clauseId).match(/^(\d+)/);
    if (m) return Number(m[1]);
  }
  const hay = `${source?.location || ''} ${source?.title || ''}`;
  const chMatch = hay.match(/(?:chapter|ch\.?)\s*(\d{1,2})\b/i);
  if (chMatch) return Number(chMatch[1]);
  const clauseMatch = hay.match(/\b(\d+)\.\d+/);
  if (clauseMatch) return Number(clauseMatch[1]);
  return null;
}

/**
 * @returns {Promise<{ sourcePage: string, fullPdfUrl?: string, edition?: string }>}
 */
export async function getMomsOnlineMeta() {
  const data = await loadMomsOnlineUrls();
  return {
    sourcePage: data.sourcePage,
    ...(data.fullPdfUrl ? { fullPdfUrl: data.fullPdfUrl } : {}),
    ...(data.edition ? { edition: data.edition } : {}),
  };
}

/**
 * Resolve official MA online chapter link for a rules source.
 * @param {{ clauseId?: string, location?: string, title?: string }} source
 * @returns {Promise<{ chapterNumber?: number, chapterTitle?: string, onlineUrl?: string }>}
 */
export async function resolveMomsChapterLink(source) {
  const data = await loadMomsOnlineUrls();
  const chapterNumber = chapterNumberFromSource(source);
  if (!chapterNumber || !data.chapters) {
    return { chapterNumber: chapterNumber ?? undefined };
  }
  const entry = data.chapters[String(chapterNumber)];
  if (!entry?.url) {
    return { chapterNumber };
  }
  return {
    chapterNumber,
    chapterTitle: entry.title,
    onlineUrl: entry.url,
  };
}

/**
 * Attach online chapter links to rules API sources.
 * @param {Array<object>} sources
 */
export async function enrichRulesSources(sources) {
  const meta = await getMomsOnlineMeta();
  const enriched = [];
  for (const s of sources) {
    const link = await resolveMomsChapterLink(s);
    enriched.push({
      ...s,
      ...(link.chapterNumber != null ? { chapterNumber: link.chapterNumber } : {}),
      ...(link.chapterTitle ? { chapterTitle: link.chapterTitle } : {}),
      ...(link.onlineUrl ? { onlineUrl: link.onlineUrl } : {}),
    });
  }
  return { sources: enriched, momsOnline: meta };
}
