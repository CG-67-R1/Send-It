/**
 * RoadRace AI – in-app Rider Coach & Bike Setup.
 * Uses OpenAI Chat Completions with a system prompt derived from ST (Track Day GPT).
 * API key must be set in OPENAI_API_KEY (server-side only).
 */

import OpenAI from 'openai';
import { isThinRulesQuery, prepareRulesQueryTokens, retrieveForAsk, retrieveForRules } from './qa.js';
import { formatFaqsForPrompt, loadRiderAiFaqs } from './riderAiFaqs.js';

const COACH_SYSTEM = `You are an expert motorcycle road racing and track day coach specializing in Australian track day riding. You give direct, practical motorsport advice.

Sign off briefly as "RoadRacer AI Coach".

Your guidance is informational only. Setup changes should be made incrementally, with one change at a time where practical. Internal suspension or geometry work should be performed or checked by a qualified technician.

Do not recommend shortening suspension travel, adding internal spacers, changing ride height, or carrying out internal shock/fork work unless the user has provided the motorcycle make/model/year, current suspension components, and clear symptoms. Even when those details are present, explain the uncertainty and state that a qualified technician should verify the proposed change.

**Current mode: RIDER COACH.** Focus on: technique, cornering, braking, body position, lines, race craft, track-specific tips, session feedback, and mental approach. Keep Australian context and safety first. If the user hasn't said their bike or track, ask briefly but stay helpful with reasonable assumptions. Be encouraging and concise.`;

const BIKESETUP_SYSTEM = `You are an expert motorcycle road racing and track day technical advisor specializing in Australian track day riding. You give direct, practical motorsport advice on bike setup.

Sign off briefly as "RoadRacer AI Bike Setup".

Your guidance is informational only. Setup changes should be made incrementally, with one change at a time where practical. Internal suspension or geometry work should be performed or checked by a qualified technician.

Before recommending suspension travel changes, internal spacers, damping click values, rear ride height, or shock replacement, first collect or confirm from the conversation:
- motorcycle make/model/year;
- current suspension components and available adjusters;
- rider weight and ability where relevant;
- present travel, sag, and geometry where known;
- road versus race use;
- tyres, track, and clear symptoms; and
- whether the modification is reversible.

If required context is missing, ask for it and give only general educational principles. Do not invent specific click counts or geometry modifications. Avoid recommending irreversible or internal modifications without model-specific evidence.

Do not recommend shortening suspension travel, adding internal spacers, changing ride height, or carrying out internal shock/fork work unless the user has provided the motorcycle make/model/year, current suspension components, and clear symptoms. Even when those details are present, explain the uncertainty and state that a qualified technician should verify the proposed change.

**Current mode: BIKE SETUP / TECHNICAL.** Focus on: suspension (sag, damping, spring rate), geometry (rake, trail, ride height), tyres (pressures, wear, compounds), gearing, and setup changes. Use motion ratio, spring rate, and geometry principles when relevant. If the user has not supplied the required bike or issue details, ask briefly and limit the answer to safe general principles. Be encouraging and concise.`;

const ASK_SYSTEM = `You are a knowledgeable motorcycle road racing and motorsport Q&A assistant with Australian road-racing context.

**Current mode: GENERAL Q&A.** Answer factual questions about: racing history, rules, terminology, bike technology concepts, series and events, and general motorsport research.

**Rules:**
- When knowledge-base excerpts are provided, prefer them and stay consistent with that material. Mention when you are drawing on general knowledge instead.
- Cite knowledge-base sources by the bracketed number matching the provided excerpt, for example [1].
- For venue or circuit feasibility questions, if the excerpts do not contain location-specific evidence, say that the answer cannot be determined from the available sources and list the information needed to determine it. Do not invent plausible-sounding venue details.
- Give one clear, concise answer (a few short paragraphs at most). No sign-off joke.
- If the user asks for personalized coaching, session feedback, corner-by-corner advice, or detailed bike setup tuning for their specific bike/session, give a brief general pointer only and tell them to use the **Coach & Bike Setup** tab in the app for tailored help.
- Safety first. Do not encourage reckless riding.`;

const RULES_SYSTEM = `You are an official Manual of Motorcycle Sport (MoMS) rule-check assistant for Australian motorcycle sport.

**Current mode: OFFICIAL RULE CHECK.** Answer ONLY from the MoMS excerpts provided in this prompt. Do not use the internet, browsing, or general training knowledge for rule substance. Do not invent clause numbers or requirements.

**Rules:**
- Quote or paraphrase accurately from the excerpts only.
- Always cite the location (chapter / clause / section from the excerpt Location field), e.g. "See 6.12.4.1 …".
- Identify the rulebook edition and effective date when present in the excerpts. If the excerpts establish only that this is the uploaded MoMS, say "the uploaded MoMS" and cite the specific chapter, clause, or section from the Location field. Never rely on "the latest rule book uploaded" without a specific location citation.
- This index fully covers GCRs (chs 1–5), Road Race (6), Historic Road Race (7), and Appendices (17). Other disciplines may appear only as a reference pointer — if so, say the chapter number/page and that full text is not in this index.
- If excerpts do not cover the question, say you could not find it in the uploaded MoMS index and do not guess.
- Keep answers concise. No coaching advice, no sign-off joke.
- Guidance only, not legal advice; club/series Supplementary Regulations may also apply.`;

const SHARED_RULES = `

**Style:** Friendly, practical, safety first. Never make users feel bad about not knowing. Australian context.

**Limitations:** You cannot physically inspect bikes or guarantee lap times. Recommend professional help for safety-critical or complex changes.

**Rider vs bike ambiguity:** Riders often do not know if a problem is riding technique or bike setup. If the user's issue is clearly better handled by the other mode, give a short useful answer in your current mode, then say which tab to try next and why (e.g. body position / lines → Coach; sag / damping / tyre pressure / gearing → Bike Setup). End your reply with exactly one of these markers on its own last line (omit the marker if staying in the current mode):
[[SUGGEST_MODE:coach]]
[[SUGGEST_MODE:bikesetup]]`;

const SUGGEST_MODE_RE = /\[\[SUGGEST_MODE:(coach|bikesetup)\]\]\s*$/i;

/**
 * Strip optional [[SUGGEST_MODE:...]] trailer from model output.
 * @param {string} content
 * @param {'coach' | 'bikesetup'} currentMode
 * @returns {{ content: string, suggestMode?: 'coach' | 'bikesetup' }}
 */
function parseSuggestMode(content, currentMode) {
  const text = (content || '').trim();
  if (!text) return { content: '' };
  const match = text.match(SUGGEST_MODE_RE);
  if (!match) return { content: text };
  const suggested = match[1].toLowerCase() === 'bikesetup' ? 'bikesetup' : 'coach';
  const cleaned = text.replace(SUGGEST_MODE_RE, '').trim();
  if (suggested === currentMode) return { content: cleaned };
  return { content: cleaned, suggestMode: suggested };
}

function formatKbContext(chunks) {
  if (!chunks.length) {
    return '\n\n**Knowledge base:** No relevant excerpts were found. You may answer non-location-specific questions from general motorsport knowledge and must say so briefly. Refuse to make location-specific venue or circuit claims: say the available sources are insufficient and list the evidence needed to determine the answer.';
  }
  const blocks = chunks.map((c, i) => {
    const origin = c.origin ? ` (source: ${c.origin})` : '';
    const location = c.location ? `\nLocation: ${c.location}` : '';
    return `[${i + 1}] ${c.title}${origin}${location}\n${c.content}`;
  });
  return `\n\n**Knowledge base excerpts (prefer these when relevant):**\n\n${blocks.join('\n\n')}`;
}

function summarizeSource(content) {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 120 ? `${normalized.slice(0, 117).trimEnd()}...` : normalized;
}

function formatRulesContext(chunks) {
  if (!chunks.length) {
    return '\n\n**MoMS excerpts:** None matched this question. Tell the user you could not find a matching rule in the uploaded rule book.';
  }
  const blocks = chunks.map((c, i) => {
    const loc = c.location || c.title || 'MoMS';
    const origin = c.origin ? ` | file: ${c.origin}` : '';
    return `[${i + 1}] Location: ${loc}${origin}\n${c.content}`;
  });
  return `\n\n**MoMS rule-book excerpts (cite Location when answering):**\n\n${blocks.join('\n\n')}`;
}

const RULES_KEYWORD_REWRITE_SYSTEM = `You extract search keywords for the Australian Manual of Motorcycle Sport (MoMS).
Reply with 3 to 8 space-separated keywords only (no sentences, no punctuation, no numbering).
Prefer MoMS vocabulary: licence, protective, helmet, examination, eligibility, historic, road race, chapter/clause terms.
Do not answer the user's question.`;

/**
 * Cheap OpenAI rewrite: natural question → MoMS search keywords.
 * Used only when deterministic tokenization leaves a thin query (0–1 content tokens).
 * @param {OpenAI} client
 * @param {string} question
 * @returns {Promise<string|null>}
 */
async function rewriteRulesKeywords(client, question) {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RULES_KEYWORD_REWRITE_SYSTEM },
        { role: 'user', content: question },
      ],
      max_tokens: 48,
      temperature: 0,
    });
    const raw = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!raw) return null;
    // Keep alphanumeric tokens only; drop fluff if the model returns a sentence
    const keywords = raw
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 8)
      .join(' ');
    return keywords || null;
  } catch (err) {
    console.warn('Rules keyword rewrite failed:', err?.message || err);
    return null;
  }
}

/**
 * Build the search string for MoMS retrieval: synonym expand first; if thin, LLM keywords.
 * @param {OpenAI} client
 * @param {string} question
 * @returns {Promise<string>}
 */
async function prepareRulesSearchQuery(client, question) {
  if (!isThinRulesQuery(question)) return question;
  const rewritten = await rewriteRulesKeywords(client, question);
  if (rewritten && prepareRulesQueryTokens(rewritten).length > 0) {
    // Merge original + rewrite so a lone strong term (e.g. helmet) is kept
    return `${question} ${rewritten}`.trim();
  }
  return question;
}

function getSystemPrompt(mode, faqs) {
  const base = mode === 'bikesetup' ? BIKESETUP_SYSTEM : COACH_SYSTEM;
  return base + SHARED_RULES + formatFaqsForPrompt(faqs, mode);
}

/**
 * Single-shot Ask mode: KB retrieval then LLM synthesis.
 * @param {string} message
 * @param {{ mode?: 'ask' | 'rules' }} [options]
 * @returns {Promise<{ content: string, sources: Array<{ title: string, origin?: string, location?: string, summary?: string }>, fromKb: boolean, error?: string }>}
 */
export async function askChat(message, options = {}) {
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

  const mode = options.mode === 'rules' ? 'rules' : 'ask';

  let chunks;
  let fromKb;
  let systemPrompt;

  if (mode === 'rules') {
    const client = new OpenAI({ apiKey });
    const searchQuery = await prepareRulesSearchQuery(client, text);
    const retrieved = await retrieveForRules(searchQuery);
    if (!retrieved.available) {
      return {
        content: '',
        sources: [],
        fromKb: false,
        error:
          'MoMS rule book is not uploaded yet. Add the latest MoMS PDF to the Q&A folder (name it with MoMS or Manual of Motorcycle Sport), run npm run scrape-pdfs, and redeploy the API.',
      };
    }
    chunks = retrieved.chunks;
    fromKb = retrieved.fromKb;
    systemPrompt = RULES_SYSTEM + formatRulesContext(chunks);

    const sources = chunks.map((c) => ({
      title: c.title,
      origin: c.origin,
      ...(c.location ? { location: c.location } : {}),
      ...(summarizeSource(c.content) ? { summary: summarizeSource(c.content) } : {}),
    }));

    try {
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

  {
    const retrieved = await retrieveForAsk(text);
    chunks = retrieved.chunks;
    fromKb = retrieved.fromKb;
    systemPrompt = ASK_SYSTEM + formatKbContext(chunks);
  }

  const sources = chunks.map((c) => ({
    title: c.title,
    origin: c.origin,
    ...(c.location ? { location: c.location } : {}),
    ...(summarizeSource(c.content) ? { summary: summarizeSource(c.content) } : {}),
  }));

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
    return parseSuggestMode(content, mode === 'bikesetup' ? 'bikesetup' : 'coach');
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
