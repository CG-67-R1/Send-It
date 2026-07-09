import { ROADRACE_CHAT_URL } from '../../constants/api';
import type { TrackWalkSession } from '../storage/trackWalk';
import { formatSessionForExport } from '../storage/trackWalk';

import type { CoachAttachmentPayload } from './coachAttachments';

export type CoachMode = 'coach' | 'bikesetup';

export type CoachChatMessage = { role: 'user' | 'assistant'; content: string };

export type CoachChatDisplayMessage = CoachChatMessage & {
  attachments?: Array<{ kind: 'image'; uri: string; name: string } | { kind: 'file'; name: string }>;
};

export type CoachChatResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };

export async function sendCoachChat(
  message: string,
  mode: CoachMode = 'coach',
  history: CoachChatMessage[] = [],
  attachments: CoachAttachmentPayload[] = []
): Promise<CoachChatResult> {
  try {
    const res = await fetch(ROADRACE_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        attachments,
      }),
      signal: AbortSignal.timeout(90000),
    });
    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: typeof data?.error === 'string' ? data.error : 'Request failed' };
    }

    const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
    if (!reply) {
      return { ok: false, error: 'Coach returned an empty response.' };
    }

    return { ok: true, reply };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export function formatTrackNotesForCoach(session: TrackWalkSession): string {
  const body = formatSessionForExport(session);
  const isOther = session.trackId === 'other';
  const footer = isOther
    ? [
        '',
        'IMPORTANT: This track is not in the RoadRace knowledge base. Base advice only on the rider notes and context above. Ask clarifying questions if corner numbering or direction is ambiguous.',
        '',
        'Please review these structured track walk notes and give corner-specific coaching advice: lines, braking, reference points, and anything to work on next session.',
      ]
    : [
        '',
        'Please review these structured track walk notes and give corner-specific coaching advice: lines, braking, reference points, and anything to work on next session.',
      ];
  return `${body}${footer.join('\n')}`;
}

/** @deprecated use formatTrackNotesForCoach(session) */
export function formatTrackNotesForCoachLegacy(
  trackName: string,
  notes: string,
  photoCount = 0
): string {
  const lines = [`Track: ${trackName}`, '', notes.trim()];
  if (photoCount > 0) {
    lines.push('', `(Rider attached ${photoCount} photo${photoCount === 1 ? '' : 's'} with these notes.)`);
  }
  lines.push(
    '',
    'Please review these track walk / corner notes and give practical coaching advice: lines, braking, reference points, and anything to work on next session.'
  );
  return lines.join('\n');
}
