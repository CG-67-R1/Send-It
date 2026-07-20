import { ROADRACE_ASK_URL } from '../../constants/api';

export type AskSource = {
  title: string;
  origin?: string;
  location?: string;
  clauseId?: string;
  edition?: string;
  effectiveDate?: string;
  page?: number;
  summary?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  onlineUrl?: string;
};

export type MomsOnlineMeta = {
  sourcePage: string;
  fullPdfUrl?: string;
  edition?: string;
};

export type AskMode = 'ask' | 'rules';

export type AskChatResult =
  | { ok: true; reply: string; sources: AskSource[]; fromKb: boolean; momsOnline?: MomsOnlineMeta }
  | { ok: false; error: string };

function asAskSource(s: unknown): AskSource | null {
  if (typeof s !== 'object' || s === null) return null;
  const o = s as Record<string, unknown>;
  if (typeof o.title !== 'string') return null;
  const source: AskSource = { title: o.title };
  if (typeof o.origin === 'string') source.origin = o.origin;
  if (typeof o.location === 'string') source.location = o.location;
  if (typeof o.clauseId === 'string') source.clauseId = o.clauseId;
  if (typeof o.edition === 'string') source.edition = o.edition;
  if (typeof o.effectiveDate === 'string') source.effectiveDate = o.effectiveDate;
  if (typeof o.page === 'number') source.page = o.page;
  if (typeof o.summary === 'string') source.summary = o.summary;
  if (typeof o.chapterNumber === 'number') source.chapterNumber = o.chapterNumber;
  if (typeof o.chapterTitle === 'string') source.chapterTitle = o.chapterTitle;
  if (typeof o.onlineUrl === 'string') source.onlineUrl = o.onlineUrl;
  return source;
}

function asMomsOnlineMeta(o: unknown): MomsOnlineMeta | undefined {
  if (typeof o !== 'object' || o === null) return undefined;
  const m = o as Record<string, unknown>;
  if (typeof m.sourcePage !== 'string') return undefined;
  const meta: MomsOnlineMeta = { sourcePage: m.sourcePage };
  if (typeof m.fullPdfUrl === 'string') meta.fullPdfUrl = m.fullPdfUrl;
  if (typeof m.edition === 'string') meta.edition = m.edition;
  return meta;
}

export async function sendAskChat(
  message: string,
  options: { mode?: AskMode } = {}
): Promise<AskChatResult> {
  try {
    const body: { message: string; mode?: AskMode } = { message };
    if (options.mode === 'rules') body.mode = 'rules';

    const res = await fetch(ROADRACE_ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: typeof data?.error === 'string' ? data.error : 'Request failed' };
    }

    const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
    if (!reply) {
      return { ok: false, error: 'Ask returned an empty response.' };
    }

    const sources = Array.isArray(data.sources)
      ? data.sources.map(asAskSource).filter((s: AskSource | null): s is AskSource => Boolean(s))
      : [];

    return {
      ok: true,
      reply,
      sources,
      fromKb: Boolean(data.fromKb),
      momsOnline: asMomsOnlineMeta(data.momsOnline),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
