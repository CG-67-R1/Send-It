import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripChatMarkdown } from './stripChatMarkdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FAQ_FILE = path.join(__dirname, 'data', 'rider_ai_faqs.json');

let cached = null;
let cachedAt = 0;
const CACHE_MS = 60 * 1000;

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const question = (item?.question || item?.q || '').trim();
      const answer = (item?.answer || item?.a || '').trim();
      if (!question || !answer) return null;
      const normalized = {
        id: item.id || `faq-${index + 1}`,
        question,
        answer,
      };
      if (item.confidence_rule) normalized.confidence_rule = item.confidence_rule;
      if (Array.isArray(item.recommended_user_inputs) && item.recommended_user_inputs.length) {
        normalized.recommended_user_inputs = item.recommended_user_inputs;
      }
      return normalized;
    })
    .filter(Boolean);
}

function topicFaqs(raw, topicKey) {
  const topics = raw?.topics;
  if (!topics || typeof topics !== 'object') return [];
  const topic = topics[topicKey];
  return normalizeItems(topic?.faqs);
}

function normalizePayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      version: 1,
      coach: [],
      bikesetup: [],
      global_principles: [],
      novice_guidelines: '',
    };
  }

  const coach =
  normalizeItems(
    raw.coach || raw.rider_coach || raw.riderCoach || raw['Rider Coach'] || raw.coach_faqs
  ).length > 0
    ? normalizeItems(
        raw.coach || raw.rider_coach || raw.riderCoach || raw['Rider Coach'] || raw.coach_faqs
      )
    : topicFaqs(raw, 'coaching');

  const bikesetup =
  normalizeItems(
    raw.bikesetup ||
      raw.bike_setup ||
      raw.bikeSetup ||
      raw['Bike Setup'] ||
      raw.bikesetup_faqs ||
      raw.setup
  ).length > 0
    ? normalizeItems(
        raw.bikesetup ||
          raw.bike_setup ||
          raw.bikeSetup ||
          raw['Bike Setup'] ||
          raw.bikesetup_faqs ||
          raw.setup
      )
    : topicFaqs(raw, 'bike_setup');

  return {
    version: raw.schema_version ?? raw.version ?? 1,
    coach,
    bikesetup,
    global_principles: Array.isArray(raw.global_principles) ? raw.global_principles : [],
    novice_guidelines:
      typeof raw.novice_guidelines === 'string' ? raw.novice_guidelines.trim() : '',
  };
}

export async function loadRiderAiFaqs(force = false) {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_MS) return cached;
  try {
    const raw = await fs.readFile(FAQ_FILE, 'utf-8');
    cached = normalizePayload(JSON.parse(raw));
    cachedAt = now;
    return cached;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('rider_ai_faqs load error:', e.message);
    cached = {
      version: 1,
      coach: [],
      bikesetup: [],
      global_principles: [],
      novice_guidelines: '',
    };
    cachedAt = now;
    return cached;
  }
}

export function faqsForMode(faqs, mode) {
  return mode === 'bikesetup' ? faqs.bikesetup : faqs.coach;
}

function formatFaqBlock(items) {
  if (!items.length) return '';
  return items
    .map((item) => {
      let block = `Q: ${item.question}\nA: ${item.answer}`;
      if (item.confidence_rule) block += `\nConfidence: ${item.confidence_rule}`;
      if (item.recommended_user_inputs?.length) {
        block += `\nUseful inputs: ${item.recommended_user_inputs.join(', ')}`;
      }
      return block;
    })
    .join('\n\n');
}

export function formatFaqsForPrompt(faqs, mode) {
  const sections = [];

  if (faqs.global_principles?.length) {
    sections.push(
      `Global principles (always follow):\n${faqs.global_principles.map((p) => `- ${p}`).join('\n')}`
    );
  }

  if (faqs.novice_guidelines) {
    sections.push(
      `Novice-friendly response guidelines:\n${stripChatMarkdown(faqs.novice_guidelines)}`
    );
  }

  const items = faqsForMode(faqs, mode);
  const faqBody = formatFaqBlock(items);
  if (faqBody) {
    sections.push(
      `Reference FAQs (ground truth for interrogation — when a user question matches these topics, align your answer with this guidance; you may expand with context but do not contradict it):\n${faqBody}`
    );
  }

  if (!sections.length) return '';
  return `\n\n${sections.join('\n\n')}`;
}
