/**
 * RoadRace AI – in-app Rider Coach & Bike Setup.
 * Uses OpenAI Chat Completions with a system prompt derived from ST (Track Day GPT).
 * API key must be set in OPENAI_API_KEY (server-side only).
 */

import OpenAI from 'openai';
import { enrichRulesSources } from './momsOnlineUrls.js';
import { prepareRulesQueryTokens, retrieveForRules } from './qa.js';
import { formatFaqsForPrompt, loadRiderAiFaqs } from './riderAiFaqs.js';
import { getAiPrompts, getPrimaryManifest } from './packLoader.js';
import { stripChatMarkdown } from './stripChatMarkdown.js';

function packAi() {
  return getAiPrompts() || {};
}

function coachHome() {
  return (
    packAi().coachHomeContext ||
    'You are an expert motorcycle road racing and track day coach specializing in Australian track day riding. Keep Australian context and safety first.'
  );
}

function bikeHome() {
  return (
    packAi().bikeSetupHomeContext ||
    'You are an expert motorcycle road racing and track day technical advisor specializing in Australian track day riding.'
  );
}

function askPriority() {
  return (
    packAi().askPriority ||
    'Priority order: Australia first (ASBK, Motorcycling Australia, state/club motorcycle road racing, Australian circuits and riders), then world level (MotoGP, WorldSBK, international motorcycle road racing).'
  );
}

function webSearchCountry() {
  return packAi().webSearchCountry || getPrimaryManifest()?.isoCountries?.[0] || 'AU';
}

function rulesHome() {
  return (
    packAi().rulesHomeContext ||
    'You are an official Manual of Motorcycle Sport (MoMS) rule-check assistant for Australian motorcycle sport.'
  );
}

function rulesModeName() {
  return packAi().rulesModeName || 'Manual of Motorcycle Sport (MoMS)';
}

function localeContextLabel() {
  return getPrimaryManifest()?.displayName || 'Australian';
}

const COACH_SYSTEM = `${coachHome()} You give direct, practical motorsport advice.

Sign off briefly as "RoadRacer AI Coach".

Your guidance is informational only. Setup changes should be made incrementally, with one change at a time where practical. Internal suspension or geometry work should be performed or checked by a qualified technician.

Do not recommend shortening suspension travel, adding internal spacers, changing ride height, or carrying out internal shock/fork work unless the user has provided the motorcycle make/model/year, current suspension components, and clear symptoms. Even when those details are present, explain the uncertainty and state that a qualified technician should verify the proposed change.

Current mode: RIDER COACH. Focus on: technique, cornering, braking, body position, lines, race craft, track-specific tips, session feedback, and mental approach. Keep regional context and safety first. If the user hasn't said their bike or track, ask briefly but stay helpful with reasonable assumptions. Be encouraging and concise.`;

const BIKESETUP_SYSTEM = `${bikeHome()} You give direct, practical motorsport advice on bike setup.

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

Current mode: BIKE SETUP / TECHNICAL. Focus on: suspension (sag, damping, spring rate), geometry (rake, trail, ride height), tyres (pressures, wear, compounds), gearing, and setup changes. Use motion ratio, spring rate, and geometry principles when relevant. If the user has not supplied the required bike or issue details, ask briefly and limit the answer to safe general principles. Be encouraging and concise.`;

const ASK_SYSTEM = `You are a knowledgeable motorcycle road racing Q&A assistant for the Send-It / RoadRace app.

Current mode: GENERAL Q&A WITH WEB SEARCH. Answer factual questions about motorcycle road racing and motorcycle track motorsport only: history, series and events, terminology, bike technology concepts, riders, and circuits.

Scope (critical):
- "Road racing" always means motorcycles on asphalt circuits / closed roads (two wheels), never cars.
- Do not answer about car racing (F1, Formula, IndyCar, NASCAR, V8 Supercars, GT, touring cars, rally cars, etc.) unless the user clearly asks about cars — then say this app covers motorcycle road racing and offer a motorcycle angle if relevant.
- When searching the web, prefer motorcycle terms (motorcycle, bike, MotoGP, WorldSBK, ASBK, superbike) so results are not car series.

Search and priority:
- Use web search for factual claims. Prefer authoritative motorcycle motorsport sources.
- ${askPriority()}
- Stay on motorcycle road racing / motorcycle track motorsport. If the question is off-topic, say briefly and redirect.
- If search finds nothing reliable, say so clearly. Do not invent dates, results, venues, or rules.

Style:
- One clear, concise answer (a few short paragraphs at most). No sign-off joke.
- Mention key sources briefly when useful.
- If the user asks for personalized coaching, session feedback, corner-by-corner advice, or detailed bike setup for their bike/session, give a brief general pointer only and tell them to use the Coach & Bike Setup tab.
- Official ${rulesModeName()} lookups belong in Official rule check? — do not invent clause numbers.
- Safety first. Do not encourage reckless riding.
- Write in plain text for a phone chat bubble. Do not use Markdown. Do not start lines with hash marks. Do not wrap words in asterisks or backticks.`;

const RULES_SYSTEM = `${rulesHome()}

Current mode: OFFICIAL RULE CHECK. Answer ONLY from the MoMS excerpts provided in this prompt. Do not use the internet, browsing, or general training knowledge for rule substance. Do not invent clause numbers or requirements.

Required answer format (plain text labels, no Markdown hashes or asterisks):
1) Answer — Plain-language yes/no or short explanation in everyday words (not a raw dump of the clause). Base it only on the excerpts.
2) Quote — Verbatim quotation from the most relevant excerpt (use the excerpt text; do not invent wording).
3) Citation — Exactly: MoMS {edition}, clause {clauseId or Location}, effective {effectiveDate}. If edition/date are in the excerpt headers, use them. Never say only "the latest rule book uploaded".
4) Note — One line: club/series Supplementary Regulations may also apply; guidance only, not legal advice.

Rules:
- Prefer the excerpt whose Location/clauseId best matches the question.
- This index fully covers GCRs (chs 1–5), Road Race (6), Historic Road Race (7), and Appendices (17). Other disciplines may appear only as a reference pointer — if so, say the chapter number/page and that full text is not in this index.
- If excerpts do not cover the question, say you could not find a matching rule in the uploaded MoMS index and do not guess. Still use the heading structure briefly.
- Keep answers concise. No coaching advice, no sign-off joke.
- Write in plain text for a phone chat bubble. Do not use Markdown. Do not start lines with hash marks. Do not wrap words in asterisks or backticks.`;

const SHARED_RULES = `

Style: Friendly, practical, safety first. Never make users feel bad about not knowing. ${localeContextLabel()} context.

Write in plain text for a phone chat bubble. Do not use Markdown. Do not start lines with hash marks. Do not wrap words in asterisks or backticks. Short paragraphs, numbered lists, and simple dashes are fine.

Limitations: You cannot physically inspect bikes or guarantee lap times. Recommend professional help for safety-critical or complex changes.

Rider vs bike ambiguity: Riders often do not know if a problem is riding technique or bike setup. If the user's issue is clearly better handled by the other mode, give a short useful answer in your current mode, then say which tab to try next and why (e.g. body position / lines → Coach; sag / damping / tyre pressure / gearing → Bike Setup). End your reply with exactly one of these markers on its own last line (omit the marker if staying in the current mode):
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
  if (!match) return { content: stripChatMarkdown(text) };
  const suggested = match[1].toLowerCase() === 'bikesetup' ? 'bikesetup' : 'coach';
  const cleaned = stripChatMarkdown(text.replace(SUGGEST_MODE_RE, '').trim());
  if (suggested === currentMode) return { content: cleaned };
  return { content: cleaned, suggestMode: suggested };
}

function summarizeSource(content) {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 120 ? `${normalized.slice(0, 117).trimEnd()}...` : normalized;
}

function formatRulesContext(chunks) {
  if (!chunks.length) {
    return '\n\n**MoMS excerpts:** None matched this question. Tell the user you could not find a matching rule in the uploaded MoMS index.';
  }
  const blocks = chunks.map((c, i) => {
    const loc = c.location || c.title || 'MoMS';
    const clause = c.clauseId ? ` | clauseId: ${c.clauseId}` : '';
    const edition = c.edition ? ` | edition: ${c.edition}` : '';
    const effective = c.effectiveDate ? ` | effectiveDate: ${c.effectiveDate}` : '';
    const page = typeof c.page === 'number' ? ` | page: ${c.page}` : '';
    const origin = c.origin ? ` | file: ${c.origin}` : '';
    return `[${i + 1}] Location: ${loc}${clause}${edition}${effective}${page}${origin}\n${c.content}`;
  });
  return `\n\n**MoMS rule-book excerpts (use Answer / Quote / Citation / Note format; cite Location + edition + effectiveDate):**\n\n${blocks.join('\n\n')}`;
}

const RULES_KEYWORD_REWRITE_SYSTEM = `You extract search keywords for the Australian Manual of Motorcycle Sport (MoMS).
Reply with 3 to 8 space-separated keywords only (no sentences, no punctuation, no numbering).
Prefer MoMS vocabulary: licence, protective, helmet, camera, tyre warmers, examination, eligibility, historic, road race, chapter/clause terms.
Map slang to MoMS terms (e.g. GoPro/lid camera → helmet camera; warming blankets → tyre warmers).
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
 * Build MoMS search strings: always try LLM keywords for natural paraphrases.
 * @param {OpenAI} client
 * @param {string} question
 * @returns {Promise<{ merged: string, keywords: string|null }>}
 */
async function prepareRulesSearchQuery(client, question) {
  const rewritten = await rewriteRulesKeywords(client, question);
  if (rewritten && prepareRulesQueryTokens(rewritten).length > 0) {
    return { merged: `${question} ${rewritten}`.trim(), keywords: rewritten };
  }
  return { merged: question, keywords: null };
}

/**
 * Rerank lexical MoMS candidates with a cheap LLM pick (falls back to input order).
 * @param {OpenAI} client
 * @param {string} question
 * @param {Array<object>} candidates
 * @param {number} [limit=6]
 */
async function rerankRulesChunks(client, question, candidates, limit = 6) {
  if (!Array.isArray(candidates) || candidates.length <= limit) {
    return (candidates || []).slice(0, limit);
  }
  const catalog = candidates.slice(0, 14).map((c, i) => {
    const loc = c.location || c.title || 'MoMS';
    const snippet = String(c.content || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
    return `${i + 1}. ${loc} — ${snippet}`;
  });
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You rank Manual of Motorcycle Sport (MoMS) excerpts for relevance to the user question. Reply with up to 6 comma-separated excerpt numbers only (e.g. 3,1,7). Prefer excerpts that answer the question; skip boilerplate that only shares common words like "permitted".',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nExcerpts:\n${catalog.join('\n')}`,
        },
      ],
      max_tokens: 32,
      temperature: 0,
    });
    const raw = completion.choices?.[0]?.message?.content?.trim() || '';
    const nums = [...raw.matchAll(/\d+/g)]
      .map((m) => Number(m[0]))
      .filter((n) => n >= 1 && n <= catalog.length);
    const seen = new Set();
    const picked = [];
    for (const n of nums) {
      if (seen.has(n)) continue;
      seen.add(n);
      picked.push(candidates[n - 1]);
      if (picked.length >= limit) break;
    }
    if (picked.length > 0) return picked;
  } catch (err) {
    console.warn('Rules rerank failed:', err?.message || err);
  }
  return candidates.slice(0, limit);
}

function mapRulesSources(chunks) {
  return chunks.map((c) => ({
    title: c.title,
    origin: c.origin,
    ...(c.location ? { location: c.location } : {}),
    ...(c.clauseId ? { clauseId: c.clauseId } : {}),
    ...(c.edition ? { edition: c.edition } : {}),
    ...(c.effectiveDate ? { effectiveDate: c.effectiveDate } : {}),
    ...(typeof c.page === 'number' ? { page: c.page } : {}),
    ...(summarizeSource(c.content) ? { summary: summarizeSource(c.content) } : {}),
  }));
}

function getSystemPrompt(mode, faqs) {
  const base = mode === 'bikesetup' ? BIKESETUP_SYSTEM : COACH_SYSTEM;
  return base + SHARED_RULES + formatFaqsForPrompt(faqs, mode);
}

/**
 * Collect URL citations / web_search sources from a Responses API payload.
 * @param {object} response
 * @returns {Array<{ title: string, origin?: string, onlineUrl?: string }>}
 */
function extractWebSources(response) {
  const sources = [];
  const seen = new Set();

  const push = (url, title) => {
    const href = typeof url === 'string' ? url.trim() : '';
    if (!href || seen.has(href)) return;
    seen.add(href);
    let host = href;
    try {
      host = new URL(href).hostname.replace(/^www\./, '');
    } catch {
      /* keep href */
    }
    sources.push({
      title: (typeof title === 'string' && title.trim()) || host || href,
      origin: href,
      onlineUrl: href,
    });
  };

  for (const item of response?.output || []) {
    if (item?.type === 'message') {
      for (const part of item.content || []) {
        for (const ann of part.annotations || []) {
          if (ann?.type === 'url_citation' && ann.url) {
            push(ann.url, ann.title);
          }
        }
      }
    }
    if (item?.type === 'web_search_call') {
      const actionSources = item.action?.sources;
      if (Array.isArray(actionSources)) {
        for (const s of actionSources) {
          if (typeof s === 'string') push(s);
          else if (s && typeof s === 'object') push(s.url || s.href, s.title);
        }
      }
    }
  }

  return sources.slice(0, 8);
}

/**
 * Single-shot Ask: web search (Responses API). Rules mode: MoMS local JSON only.
 * @param {string} message
 * @param {{ mode?: 'ask' | 'rules' }} [options]
 * @returns {Promise<{ content: string, sources: Array<object>, fromKb: boolean, momsOnline?: object, error?: string }>}
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
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (mode === 'rules') {
    const { merged: searchQuery, keywords } = await prepareRulesSearchQuery(client, text);
    const primary = await retrieveForRules(searchQuery, 12);
    if (!primary.available) {
      return {
        content: '',
        sources: [],
        fromKb: false,
        error:
          'MoMS rule book is not uploaded yet. Add the latest MoMS PDF to the Q&A folder (name it with MoMS or Manual of Motorcycle Sport), run npm run scrape-moms, and redeploy the API.',
      };
    }
    const passes = [primary];
    if (keywords) passes.push(await retrieveForRules(keywords, 12));
    if (searchQuery !== text) passes.push(await retrieveForRules(text, 12));
    const seen = new Set();
    let candidates = [];
    for (const pass of passes) {
      for (const c of pass.candidates?.length ? pass.candidates : pass.chunks) {
        const key = `${c.clauseId || c.location}|${(c.content || '').slice(0, 80)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(c);
      }
    }
    candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    candidates = candidates.slice(0, 14);
    const chunks = await rerankRulesChunks(client, text, candidates, 6);
    const fromKb = chunks.length > 0;
    const systemPrompt = RULES_SYSTEM + formatRulesContext(chunks);
    const { sources, momsOnline } = await enrichRulesSources(mapRulesSources(chunks));

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        max_tokens: 1024,
      });

      const content = stripChatMarkdown(completion.choices?.[0]?.message?.content?.trim() || '');
      return { content, sources, fromKb, momsOnline };
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

  // General Ask: Responses API + hosted web search (Australia-first, then world).
  try {
    const response = await client.responses.create({
      model,
      instructions: ASK_SYSTEM,
      input: text,
      tools: [
        {
          type: 'web_search',
          user_location: {
            type: 'approximate',
            country: webSearchCountry(),
          },
          search_context_size: 'medium',
          filters: {
            blocked_domains: ['reddit.com', 'quora.com'],
          },
        },
      ],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      max_output_tokens: 1024,
    });

    const content = stripChatMarkdown((response.output_text || '').trim());
    if (!content) {
      return {
        content: '',
        sources: [],
        fromKb: false,
        error: 'Ask returned an empty response.',
      };
    }
    const sources = extractWebSources(response);
    return { content, sources, fromKb: false };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('RoadRace AI ask web-search error:', msg);
    // Retry once without include/filters if the model rejects newer web_search options
    if (/unknown|unsupported|invalid|include|filters|search_context/i.test(msg)) {
      try {
        const fallback = await client.responses.create({
          model,
          instructions: ASK_SYSTEM,
          input: text,
          tools: [
            {
              type: 'web_search',
              user_location: {
                type: 'approximate',
                country: webSearchCountry(),
              },
            },
          ],
          tool_choice: 'auto',
          max_output_tokens: 1024,
        });
        const content = stripChatMarkdown((fallback.output_text || '').trim());
        if (!content) {
          return {
            content: '',
            sources: [],
            fromKb: false,
            error: 'Ask returned an empty response.',
          };
        }
        return { content, sources: extractWebSources(fallback), fromKb: false };
      } catch (err2) {
        console.error('RoadRace AI ask web-search fallback error:', err2?.message || err2);
      }
    }
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

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'text/plain',
  'application/json',
  'text/csv',
  'text/xml',
  'application/gpx+xml',
];

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
      const rawMime = String(att.mimeType || 'image/jpeg').toLowerCase();
      const mime = ALLOWED_IMAGE_TYPES.includes(rawMime) ? rawMime : 'image/jpeg';
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
      const rawMime = String(att.mimeType || 'image/jpeg').slice(0, 80).toLowerCase();
      const mime = ALLOWED_IMAGE_TYPES.includes(rawMime) ? rawMime : 'image/jpeg';
      out.push({
        type: 'image',
        name: String(att.name || 'photo.jpg').slice(0, 120),
        mimeType: mime,
        data: att.data,
      });
    } else if (att.type === 'file' && typeof att.content === 'string' && att.content.trim()) {
      const rawMime = String(att.mimeType || 'text/plain').slice(0, 80).toLowerCase();
      const mime = ALLOWED_FILE_TYPES.includes(rawMime) ? rawMime : 'text/plain';
      out.push({
        type: 'file',
        name: String(att.name || 'data.txt').slice(0, 120),
        mimeType: mime,
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
