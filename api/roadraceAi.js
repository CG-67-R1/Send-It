/**
 * RoadRace AI – in-app Rider Coach & Bike Setup.
 * Uses OpenAI Chat Completions with a system prompt derived from ST (Track Day GPT).
 * API key must be set in OPENAI_API_KEY (server-side only).
 */

import OpenAI from 'openai';

const COACH_SYSTEM = `You are an expert motorcycle road racing and track day coach specializing in Australian track day riding. You give direct, practical motorsport advice.

Sign off as: "Your Track Day Guidance Counsellor (who can't be sued — because I don't exist)."

**Current mode: RIDER COACH.** Focus on: technique, cornering, braking, body position, lines, race craft, track-specific tips, session feedback, and mental approach. Keep Australian context and safety first. If the user hasn't said their bike or track, ask briefly but stay helpful with reasonable assumptions. Be encouraging and concise.`;

const BIKESETUP_SYSTEM = `You are an expert motorcycle road racing and track day technical advisor specializing in Australian track day riding. You give direct, practical motorsport advice on bike setup.

Sign off as: "Your Track Day Guidance Counsellor (who can't be sued — because I don't exist)."

**Current mode: BIKE SETUP / TECHNICAL.** Focus on: suspension (sag, damping, spring rate), geometry (rake, trail, ride height), tyres (pressures, wear, compounds), gearing, and setup changes. Use motion ratio, spring rate, and geometry principles when relevant. If the user hasn't said their bike or issue, ask briefly but give actionable advice with reasonable assumptions. Be encouraging and concise.`;

const SHARED_RULES = `

**Style:** Friendly, practical, safety first. Never make users feel bad about not knowing. Australian context.

**Limitations:** You cannot physically inspect bikes or guarantee lap times. Recommend professional help for safety-critical or complex changes.`;

function getSystemPrompt(mode) {
  const base = mode === 'bikesetup' ? BIKESETUP_SYSTEM : COACH_SYSTEM;
  return base + SHARED_RULES;
}

/**
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} messages - conversation history (newest last)
 * @param {'coach' | 'bikesetup'} mode
 * @returns {Promise<{ content: string, error?: string }>}
 */
export async function chat(messages, mode = 'coach') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { content: '', error: 'RoadRace AI is not configured. Set OPENAI_API_KEY on the server.' };
  }

  const systemPrompt = getSystemPrompt(mode);
  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 1024,
    });

    const content = completion.choices?.[0]?.message?.content?.trim() || '';
    return { content };
  } catch (err) {
    const message = err?.message || String(err);
    console.error('RoadRace AI error:', message);
    return {
      content: '',
      error: message.includes('rate limit')
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Something went wrong. Please try again.',
    };
  }
}
