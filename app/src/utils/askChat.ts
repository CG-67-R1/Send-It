import { apiFetch, ROADRACE_ASK_URL } from '../../constants/api';

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

function asAskSource(value: unknown): AskSource | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== 'string') return null;
  const source: AskSource = { title: record.title };
  if (typeof record.origin === 'string') source.origin = record.origin;
  if (typeof record.location === 'string') source.location = record.location;
  if (typeof record.clauseId === 'string') source.clauseId = record.clauseId;
  if (typeof record.edition === 'string') source.edition = record.edition;
  if (typeof record.effectiveDate === 'string') source.effectiveDate = record.effectiveDate;
  if (typeof record.page === 'number') source.page = record.page;
  if (typeof record.summary === 'string') source.summary = record.summary;
  if (typeof record.chapterNumber === 'number') source.chapterNumber = record.chapterNumber;
  if (typeof record.chapterTitle === 'string') source.chapterTitle = record.chapterTitle;
  if (typeof record.onlineUrl === 'string') source.onlineUrl = record.onlineUrl;
  return source;
}

function asMomsOnlineMeta(value: unknown): MomsOnlineMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const metaRecord = value as Record<string, unknown>;
  if (typeof metaRecord.sourcePage !== 'string') return undefined;
  const meta: MomsOnlineMeta = { sourcePage: metaRecord.sourcePage };
  if (typeof metaRecord.fullPdfUrl === 'string') meta.fullPdfUrl = metaRecord.fullPdfUrl;
  if (typeof metaRecord.edition === 'string') meta.edition = metaRecord.edition;
  return meta;
}

export async function sendAskChat(
  message: string,
  options: { mode?: AskMode } = {}
): Promise<AskChatResult> {
  try {
    const body: { message: string; mode?: AskMode } = { message };
    if (options.mode === 'rules') body.mode = 'rules';

    const res = await apiFetch(ROADRACE_ASK_URL, {
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
