import { adviceForQuery } from './coachKnowledge.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

export function formatFaqsForPrompt(faqs, mode, _riderSkill = 'novice', query = '', packId = 'au') {
  const sections = [];
  const principles = (faqs.global_principles || []).filter((line) => {
    const text = String(line || '').trim();
    return text && text !== '---';
  });

  if (principles.length) {
    sections.push(`Rules for this reply:\n${principles.map((line) => `- ${line}`).join('\n')}`);
  }

  const advice = adviceForQuery(faqs, mode, query, packId);
  const faqBody = formatFaqBlock(advice.primary);
  if (faqBody) {
    sections.push(
      `Notes for this reply. Use a cause that is written here. Do not add a fact these notes do not contain:\n${faqBody}`
    );
  }
  const otherBody = formatFaqBlock(advice.other);
  if (otherBody) {
    const otherName = mode === 'bikesetup' ? 'Coach' : 'Bike Setup';
    sections.push(
      `The same problem can also be riding or the bike. ${otherName} notes, one line only. Do not give a full second plan:\n${otherBody}`
    );
  }
  if (advice.drill) {
    sections.push(`Drill to write in the reply. Do not promise to explain it later:\n${advice.drill}`);
  }
  if (advice.spansBoth) {
    sections.push(
      mode === 'bikesetup'
        ? 'Start with pressure and what the rider did. If the cause is the line or the throttle, name that and point to Coach.'
        : 'Start with the riding drill. If pressure, wear, or squat is still unknown, name that and point to Bike Setup.'
    );
  }

  if (!sections.length) return '';
  return `\n\n${sections.join('\n\n')}`;
}
