import { ROADRACE_ASK_URL } from '../../constants/api';

export type AskSource = { title: string; origin?: string };

export type AskChatResult =
  | { ok: true; reply: string; sources: AskSource[]; fromKb: boolean }
  | { ok: false; error: string };

export async function sendAskChat(message: string): Promise<AskChatResult> {
  try {
    const res = await fetch(ROADRACE_ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(60000),
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
      ? data.sources.filter(
          (s: unknown): s is AskSource =>
            typeof s === 'object' &&
            s !== null &&
            typeof (s as AskSource).title === 'string'
        )
      : [];

    return {
      ok: true,
      reply,
      sources,
      fromKb: Boolean(data.fromKb),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
