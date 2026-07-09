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
 * @param {Array<{ type: 'image'|'file', name: string, mimeType?: string, data?: string, content?: string }>} attachments - only applied to the final user turn
 * @returns {Promise<{ content: string, error?: string }>}
 */
function buildUserContent(text, attachments = []) {
  const safeText = (text || '').trim() || 'Please review the attached file(s) and give feedback.';
  if (!attachments.length) return safeText;

  const parts = [{ type: 'text', text: safeText }];
  for (const att of attachments) {
    if (att.type === 'image' && att.data) {
      const mime = att.mimeType || 'image/jpeg';
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${att.data}` },
      });
    } else if (att.type === 'file' && att.content) {
      parts.push({
        type: 'text',
        text: `\n\n[Attached file: ${att.name}]\n${att.content}`,
      });
    }
  }
  return parts.length === 1 ? safeText : parts;
}

function normalizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const att of raw.slice(0, 3)) {
    if (!att || typeof att !== 'object') continue;
    if (att.type === 'image' && typeof att.data === 'string' && att.data.length > 0) {
      if (att.data.length > 6_000_000) continue;
      out.push({
        type: 'image',
        name: String(att.name || 'photo.jpg').slice(0, 120),
        mimeType: String(att.mimeType || 'image/jpeg').slice(0, 80),
        data: att.data,
      });
    } else if (att.type === 'file' && typeof att.content === 'string' && att.content.trim()) {
      out.push({
        type: 'file',
        name: String(att.name || 'data.txt').slice(0, 120),
        mimeType: String(att.mimeType || 'text/plain').slice(0, 80),
        content: att.content.slice(0, 24_000),
      });
    }
  }
  return out;
}

export async function chat(messages, mode = 'coach', attachments = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { content: '', error: 'RoadRace AI is not configured. Set OPENAI_API_KEY on the server.' };
  }

  const faqs = await loadRiderAiFaqs();
  const systemPrompt = getSystemPrompt(mode, faqs);
  const normalizedAttachments = normalizeAttachments(attachments);
  const openaiMessages = [{ role: 'system', content: systemPrompt }];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const isLastUser = i === messages.length - 1 && m.role === 'user';
    if (isLastUser && normalizedAttachments.length) {
      openaiMessages.push({
        role: 'user',
        content: buildUserContent(m.content, normalizedAttachments),
      });
    } else {
      openaiMessages.push({ role: m.role, content: m.content });
    }
  }

  const usesVision = normalizedAttachments.some((a) => a.type === 'image');

  try {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: usesVision
        ? process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
        : process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
