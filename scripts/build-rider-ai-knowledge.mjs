#!/usr/bin/env node
/**
 * Build Rider AI knowledge JSON for API prompts + app FAQ dropdowns.
 *
 * Preferred source: ST/GPTUpload/rider-ai-knowledge-combined.md (single file).
 * Legacy fallback: rider_ai_faqs.source.json + novice-friendly-guidelines.md
 *
 * Usage:
 *   node scripts/build-rider-ai-knowledge.mjs
 *   node scripts/build-rider-ai-knowledge.mjs path/to/combined.md
 *   node scripts/build-rider-ai-knowledge.mjs path/to/faqs.json path/to/guidelines.md
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_COMBINED = path.join(ROOT, 'ST', 'GPTUpload', 'rider-ai-knowledge-combined.md');
const DEFAULT_FAQS = path.join(ROOT, 'api', 'data', 'rider_ai_faqs.source.json');
const DEFAULT_GUIDELINES = path.join(ROOT, 'ST', 'GPTUpload', 'novice-friendly-guidelines.md');
const OUTPUT = path.join(ROOT, 'api', 'data', 'rider_ai_faqs.json');
const APP_OUTPUT = path.join(ROOT, 'app', 'src', 'data', 'rider_ai_faqs.json');

function mapTopicFaqs(items, topic) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const question = (item?.question || '').trim();
      const answer = (item?.answer || '').trim();
      if (!question || !answer) return null;
      return {
        id: item.id || `${topic}_${String(index + 1).padStart(3, '0')}`,
        question,
        answer,
        ...(item.confidence_rule ? { confidence_rule: item.confidence_rule } : {}),
        ...(item.recommended_user_inputs?.length
          ? { recommended_user_inputs: item.recommended_user_inputs }
          : {}),
      };
    })
    .filter(Boolean);
}

function extractCoachAndSetup(raw) {
  if (Array.isArray(raw.coach) && Array.isArray(raw.bikesetup)) {
    return {
      coach: mapTopicFaqs(raw.coach, 'coach'),
      bikesetup: mapTopicFaqs(raw.bikesetup, 'bikesetup'),
    };
  }

  const topics = raw.topics || {};
  const coaching = topics.coaching?.faqs || topics.coach?.faqs || [];
  const bikeSetup = topics.bike_setup?.faqs || topics.bikesetup?.faqs || [];

  return {
    coach: mapTopicFaqs(coaching, 'coach'),
    bikesetup: mapTopicFaqs(bikeSetup, 'bikesetup'),
  };
}

function sectionContent(markdown, heading, endHeading = null) {
  const pattern = new RegExp(`^## ${heading}\\s*$`, 'm');
  const match = pattern.exec(markdown);
  if (!match) return '';

  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  if (endHeading) {
    const endPattern = new RegExp(`^## ${endHeading}\\s*$`, 'm');
    const endMatch = endPattern.exec(rest);
    return (endMatch ? rest.slice(0, endMatch.index) : rest).trim();
  }

  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function parseGlobalPrinciples(markdown) {
  const block = sectionContent(markdown, 'Global Principles');
  return block
    .split('\n')
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

function parseFaqsFromSection(section, topic) {
  const faqs = [];
  const chunks = section.split(/\n(?=### )/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed.startsWith('### ')) continue;

    const lines = trimmed.split('\n');
    const question = lines[0].replace(/^###\s+/, '').trim();
    if (!question) continue;

    const bodyLines = [];
    let confidenceRule = '';
    let recommendedInputs = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '---') continue;

      const confidenceMatch = line.match(/^\*\*Confidence rule:\*\*\s*(.+)$/i);
      if (confidenceMatch) {
        confidenceRule = confidenceMatch[1].trim();
        continue;
      }

      const inputsMatch = line.match(/^\*\*Useful inputs:\*\*\s*(.+)$/i);
      if (inputsMatch) {
        recommendedInputs = inputsMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        continue;
      }

      bodyLines.push(lines[i]);
    }

    const answer = bodyLines.join('\n').trim();
    if (!answer) continue;

    faqs.push({
      id: `${topic}_${String(faqs.length + 1).padStart(3, '0')}`,
      question,
      answer,
      ...(confidenceRule ? { confidence_rule: confidenceRule } : {}),
      ...(recommendedInputs.length ? { recommended_user_inputs: recommendedInputs } : {}),
    });
  }

  return faqs;
}

function parseCombinedMarkdown(markdown) {
  const global_principles = parseGlobalPrinciples(markdown);
  const novice_guidelines = sectionContent(
    markdown,
    'Novice-Friendly Guidelines',
    'Rider AI Coach FAQs'
  );
  const coachSection = sectionContent(markdown, 'Rider AI Coach FAQs');
  const bikesetupSection = sectionContent(markdown, 'Rider AI Bike Setup FAQs');

  return {
    schema_version: '2.0',
    version: 2,
    title: 'Rider AI Coach and Rider AI Setup Knowledge',
    description:
      'Combined FAQ knowledge and novice-friendly response guidelines for Rider AI.',
    intended_use:
      'Injected into RoadRace AI system prompts and FAQ dropdowns in the Rider Coach screen.',
    global_principles,
    novice_guidelines,
    coach: parseFaqsFromSection(coachSection, 'coach'),
    bikesetup: parseFaqsFromSection(bikesetupSection, 'bikesetup'),
  };
}

async function resolveSource(argvPath, fallbacks) {
  if (argvPath) return path.resolve(argvPath);
  for (const candidate of fallbacks) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(`Source not found. Tried: ${fallbacks.join(', ')}`);
}

async function buildFromCombined(combinedPath) {
  const markdown = await fs.readFile(combinedPath, 'utf-8');
  return { combined: parseCombinedMarkdown(markdown), sourceLabel: combinedPath };
}

async function buildFromLegacy(faqsPath, guidelinesPath) {
  const [faqsRaw, guidelinesRaw] = await Promise.all([
    fs.readFile(faqsPath, 'utf-8'),
    fs.readFile(guidelinesPath, 'utf-8'),
  ]);

  const faqsJson = JSON.parse(faqsRaw);
  const { coach, bikesetup } = extractCoachAndSetup(faqsJson);

  const combined = {
    schema_version: '2.0',
    version: 2,
    title: faqsJson.title || 'Rider AI Coach and Rider AI Setup Knowledge',
    description:
      faqsJson.description ||
      'Combined FAQ knowledge and novice-friendly response guidelines for Rider AI.',
    intended_use:
      faqsJson.intended_use ||
      'Injected into RoadRace AI system prompts and FAQ dropdowns in the Rider Coach screen.',
    global_principles: faqsJson.global_principles || [],
    novice_guidelines: guidelinesRaw.trim(),
    coach,
    bikesetup,
  };

  if (faqsJson.topics) combined.topics = faqsJson.topics;

  return {
    combined,
    sourceLabel: `${faqsPath} + ${guidelinesPath}`,
  };
}

const arg1 = process.argv[2];
const arg2 = process.argv[3];

let result;
if (arg2) {
  const faqsPath = await resolveSource(arg1, [DEFAULT_FAQS]);
  const guidelinesPath = await resolveSource(arg2, [DEFAULT_GUIDELINES]);
  result = await buildFromLegacy(faqsPath, guidelinesPath);
} else if (arg1 && arg1.endsWith('.md')) {
  const combinedPath = await resolveSource(arg1, [DEFAULT_COMBINED]);
  result = await buildFromCombined(combinedPath);
} else {
  try {
    await fs.access(DEFAULT_COMBINED);
    result = await buildFromCombined(DEFAULT_COMBINED);
  } catch {
    const faqsPath = await resolveSource(arg1, [
      DEFAULT_FAQS,
      path.join(process.env.USERPROFILE || '', 'Desktop', 'rider_ai_faqs.json'),
      path.join(ROOT, 'api', 'data', 'rider_ai_faqs.json'),
    ]);
    const guidelinesPath = await resolveSource(undefined, [
      DEFAULT_GUIDELINES,
      path.join(process.env.USERPROFILE || '', 'Desktop', 'novice-friendly-guidelines (1).md'),
    ]);
    result = await buildFromLegacy(faqsPath, guidelinesPath);
  }
}

const { combined, sourceLabel } = result;
const output = `${JSON.stringify(combined, null, 2)}\n`;
await fs.writeFile(OUTPUT, output, 'utf-8');
await fs.writeFile(APP_OUTPUT, output, 'utf-8');

console.log('Built combined Rider AI knowledge:');
console.log(`  Source:            ${sourceLabel}`);
console.log(`  Global principles: ${combined.global_principles.length}`);
console.log(`  Coach FAQs:        ${combined.coach.length}`);
console.log(`  Bike setup FAQs:   ${combined.bikesetup.length}`);
console.log(`  Wrote:             ${OUTPUT}`);
console.log(`  Wrote:             ${APP_OUTPUT}`);
