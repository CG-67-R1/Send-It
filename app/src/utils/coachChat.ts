import { apiErrorMessage, apiFetch, LLM_API_TIMEOUT_MS, ROADRACE_CHAT_URL } from '../../constants/api';
import { riderAiSkillFromActivity } from '../navigation/homeMode';
import { getOnboardingAnswers } from '../storage/onboarding';
import type { TrackWalkSession } from '../storage/trackWalk';
import { formatSessionForExport } from '../storage/trackWalk';

import { stripChatMarkdown } from './chatMarkdown';
import type { CoachAttachmentPayload } from './coachAttachments';

export type CoachMode = 'coach' | 'bikesetup';

export type CoachChatMessage = { role: 'user' | 'assistant'; content: string };

export type CoachChatDisplayMessage = CoachChatMessage & {
  id: string;
  attachments?: Array<{ kind: 'image'; uri: string; name: string } | { kind: 'file'; name: string }>;
};

let chatMessageSeq = 0;

/** Stable id for chat list keys (append/remove safe). */
export function createChatMessage(
  partial: CoachChatMessage & {
    attachments?: CoachChatDisplayMessage['attachments'];
  }
): CoachChatDisplayMessage {
  chatMessageSeq += 1;
  return {
    id: `msg-${Date.now()}-${chatMessageSeq}`,
    ...partial,
  };
}

/** Ensure seed/handoff messages have stable ids for React keys. */
export function ensureMessageIds(
  messages: Array<
    CoachChatMessage & {
      id?: string;
      attachments?: CoachChatDisplayMessage['attachments'];
    }
  >
): CoachChatDisplayMessage[] {
  return messages.map((m, i) =>
    m.id
      ? (m as CoachChatDisplayMessage)
      : { ...m, id: `seed-${Date.now()}-${i}-${++chatMessageSeq}` }
  );
}

export type CoachChatResult =
  | { ok: true; reply: string; suggestMode?: CoachMode }
  | { ok: false; error: string };

export async function sendCoachChat(
  message: string,
  mode: CoachMode = 'coach',
  history: CoachChatMessage[] = [],
  attachments: CoachAttachmentPayload[] = []
): Promise<CoachChatResult> {
  try {
    const answers = await getOnboardingAnswers();
    const riderSkill = riderAiSkillFromActivity(answers?.activity);
    const res = await apiFetch(ROADRACE_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode,
        riderSkill,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        attachments,
      }),
      signal: AbortSignal.timeout(LLM_API_TIMEOUT_MS),
    });
    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: typeof data?.error === 'string' ? data.error : 'Request failed' };
    }

    const reply = stripChatMarkdown(typeof data?.reply === 'string' ? data.reply.trim() : '');
    if (!reply) {
      return { ok: false, error: 'Coach returned an empty response.' };
    }

    const suggestRaw = data?.suggestMode;
    const suggestMode: CoachMode | undefined =
      suggestRaw === 'coach' || suggestRaw === 'bikesetup' ? suggestRaw : undefined;

    return suggestMode ? { ok: true, reply, suggestMode } : { ok: true, reply };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
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
