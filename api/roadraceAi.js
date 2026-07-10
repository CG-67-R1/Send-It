/**
 * RoadRace AI – in-app Rider Coach & Bike Setup.
 * Uses OpenAI Chat Completions with a system prompt derived from ST (Track Day GPT).
 * API key must be set in OPENAI_API_KEY (server-side only).
 */

import OpenAI from 'openai';
import { retrieveForAsk } from './qa.js';
import { formatFaqsForPrompt, loadRiderAiFaqs } from './riderAiFaqs.js';

const COACH_SYSTEM = `You are an expert motorcycle road racing and track day coach specializing in Australian track day riding. You give direct, practical motorsport advice.

Sign off as: "Your Track Day Guidance Counsellor (who can't be sued — because I don't exist)."

**Current mode: RIDER COACH.** Focus on: technique, cornering, braking, body position, lines, race craft, track-specific tips, session feedback, and mental approach. Keep Australian context and safety first. If the user hasn't said their bike or track, ask briefly but stay helpful with reasonable assumptions. Be encouraging and concise.`;

const BIKESETUP_SYSTEM = `You are an expert motorcycle road racing and track day technical advisor specializing in Australian track day riding. You give direct, practical motorsport advice on bike setup.

Sign off as: "Your Track Day Guidance Counsellor (who can't be sued — because I don't exist)."

**Current mode: BIKE SETUP / TECHNICAL.** Focus on: suspension (sag, damping, spring rate), geometry (rake, trail, ride height), tyres (pressures, wear, compounds), gearing, and setup changes. Use motion ratio, spring rate, and geometry principles when relevant. If the user hasn't said their bike or issue, ask briefly but give actionable advice with reasonable assumptions. Be encouraging and concise.`;

const ASK_SYSTEM = `You are a knowledgeable motorcycle road racing and motorsport Q&A assistant with Australian road-racing context.

**Current mode: GENERAL Q&A.** Answer factual questions about: racing history, rules, terminology, bike technology concepts, series and events, and general motorsport research.

**Rules:**
- When knowledge-base excerpts are provided, prefer them and stay consistent with that material. Mention when you are drawing on general knowledge instead.
- Give one clear, concise answer (a few short paragraphs at most). No sign-off joke.
- If the user asks for personalized coaching, session feedback, corner-by-corner advice, or detailed bike setup tuning for their specific bike/session, give a brief general pointer only and tell them to use the **Coach & Bike Setup** tab in the app for tailored help.
- Safety first. Do not encourage reckless riding.`;

const SHARED_RULES = `

**Style:** Friendly, practical, safety first. Never make users feel bad about not knowing. Australian context.

**Limitations:** You cannot physically inspect bikes or guarantee lap times. Recommend professional help for safety-critical or complex changes.`;

function formatKbContext(chunks) {
  if (!chunks.length) {
    return '\n\n**Knowledge base:** No relevant excerpts found for this question. Answer from general motorsport knowledge and say so briefly.';
  }
  const blocks = chunks.map(
    (c, i) =>
      `[${i + 1}] ${c.title}${c.origin ? ` (source: ${c.origin})` : ''}\n${c.content}`
  );
  return `\n\n**Knowledge base excerpts (prefer these when relevant):**\n\n${blocks.join('\n\n')}`;
}

function getSystemPrompt(mode, faqs) {
  const base = mode === 'bikesetup' ? BIKESETUP_SYSTEM : COACH_SYSTEM;
  return base + SHARED_RULES + formatFaqsForPrompt(faqs, mode);
}

/**
 * Single-shot Ask mode: KB retrieval then LLM synthesis.
 * @param {string} message
 * @returns {Promise<{ content: string, sources: Array<{ title: string, origin?: string }>, fromKb: boolean, error?: string }>}
 */
export async function askChat(message) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      content: '',
      sources: [],
      fromKb: false,
      error: 'RoadRace AI is not configured. Set OPENAI_API_KEY on the server.',
    };
  }

  const text = (message || '').trim();
  if (!text) {
    return { content: '', sources: [], fromKb: false, error: 'message is required' };
  }

  const { chunks, fromKb } = await retrieveForAsk(text);
  const sources = chunks.map((c) => ({ title: c.title, origin: c.origin }));
  const systemPrompt = ASK_SYSTEM + formatKbContext(chunks);

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 1024,
    });

    const content = completion.choices?.[0]?.message?.content?.trim() || '';
    return { content, sources, fromKb };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('RoadRace AI ask error:', msg);
    return {
      content: '',
      sources: [],
      fromKb: false,
      error: msg.includes('rate limit')
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Something went wrong. Please try again.',
    };
  }
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

  const faqs = await loadRiderAiFaqs();
  const systemPrompt = getSystemPrompt(mode, faqs);
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
