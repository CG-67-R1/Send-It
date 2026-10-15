#!/usr/bin/env node
/**
 * Side-by-side Coach/Ask comparison: gpt-4o-mini vs gpt-6-luna (or overrides).
 *
 * Manual only. Requires OPENAI_API_KEY. Do not run in CI. Do not commit the report
 * (default path is tmp/, which is gitignored).
 *
 *   cd api
 *   # key in api/.env or the environment
 *   npm run compare-coach-models
 *
 * Optional env:
 *   COMPARE_BASE_MODEL          default gpt-4o-mini
 *   COMPARE_CANDIDATE_MODEL     default gpt-6-luna
 *   COMPARE_OUT                 default ../tmp/coach-model-compare.md
 *   COACH_REASONING_EFFORT      default none for GPT-6 (see getCoachReasoningEffort)
 *   COMPARE_ALLOW_CI=1          emergency override if you really mean to run in CI
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askChat, chat, getCoachReasoningEffort } from '../roadraceAi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PROMPTS_PATH = path.join(__dirname, 'coachModelComparePrompts.json');

const BASE = (process.env.COMPARE_BASE_MODEL || 'gpt-4o-mini').trim();
const CANDIDATE = (process.env.COMPARE_CANDIDATE_MODEL || 'gpt-6-luna').trim();
const OUT =
  process.env.COMPARE_OUT ||
  path.join(ROOT, 'tmp', 'coach-model-compare.md');

/** USD per 1M tokens. Cached input is listed separately when the API reports it. */
const PRICES = {
  'gpt-4o-mini': { input: 0.15, output: 0.6, cached: 0.075 },
  'gpt-6-luna': { input: 0.1, output: 0.5, cached: 0.01 },
};

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

if ((process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') && process.env.COMPARE_ALLOW_CI !== '1') {
  die('compareCoachModels is manual-only and refuses to run in CI.', 2);
}

if (!process.env.OPENAI_API_KEY) {
  die(
    'OPENAI_API_KEY is not set. Copy api/.env.example to api/.env, add a key, then: npm run compare-coach-models'
  );
}

function priceFor(model) {
  return PRICES[model] || PRICES['gpt-4o-mini'];
}

function estimateCost(model, usage) {
  if (!usage) return null;
  const p = priceFor(model);
  const cached = Math.min(usage.cached || 0, usage.input || 0);
  const uncached = Math.max(0, (usage.input || 0) - cached);
  return (uncached * p.input + cached * p.cached + (usage.output || 0) * p.output) / 1_000_000;
}

function usd(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  if (n < 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function mdEscape(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

async function runOne(model, item) {
  const prev = process.env.COACH_MODEL;
  process.env.COACH_MODEL = model;
  const started = Date.now();
  try {
    if (item.surface === 'ask') {
      const result = await askChat(item.prompt, { mode: item.mode || 'ask' });
      return {
        ok: !result.error && Boolean(result.content),
        content: result.content || '',
        error: result.error || '',
        usage: result.usage || null,
        model: result.model || model,
        latencyMs: Date.now() - started,
        sources: result.sources || [],
      };
    }
    const result = await chat(
      [{ role: 'user', content: item.prompt }],
      item.mode || 'coach',
      [],
      item.skill || 'novice'
    );
    return {
      ok: !result.error && Boolean(result.content),
      content: result.content || '',
      error: result.error || '',
      usage: result.usage || null,
      model: result.model || model,
      latencyMs: Date.now() - started,
      suggestMode: result.suggestMode,
    };
  } catch (err) {
    return {
      ok: false,
      content: '',
      error: err?.message || String(err),
      usage: null,
      model,
      latencyMs: Date.now() - started,
    };
  } finally {
    if (prev === undefined) delete process.env.COACH_MODEL;
    else process.env.COACH_MODEL = prev;
  }
}

function usageLine(run) {
  const u = run.usage;
  if (!u) return 'tokens n/a';
  const bits = [`in ${u.input}`, `out ${u.output}`];
  if (u.cached) bits.push(`cached ${u.cached}`);
  if (u.reasoning) bits.push(`reasoning ${u.reasoning}`);
  return bits.join(', ');
}

function summarise(rows, model) {
  let latency = 0;
  let input = 0;
  let output = 0;
  let cached = 0;
  let reasoning = 0;
  let cost = 0;
  let ok = 0;
  for (const row of rows) {
    const run = row.runs[model];
    if (run.ok) ok += 1;
    latency += run.latencyMs;
    if (run.usage) {
      input += run.usage.input;
      output += run.usage.output;
      cached += run.usage.cached;
      reasoning += run.usage.reasoning;
    }
    const c = estimateCost(model, run.usage);
    if (c != null) cost += c;
  }
  return { ok, n: rows.length, latency, input, output, cached, reasoning, cost };
}

const prompts = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8'));
if (!Array.isArray(prompts) || prompts.length < 1) {
  die(`No prompts in ${PROMPTS_PATH}`);
}

console.log(`Comparing ${BASE} vs ${CANDIDATE} (${prompts.length} prompts)`);
console.log(`GPT-6 reasoning effort (if used): ${getCoachReasoningEffort(CANDIDATE) || '(n/a)'}`);

const rows = [];
for (const item of prompts) {
  process.stdout.write(`  ${item.id} … `);
  const baseRun = await runOne(BASE, item);
  const candRun = await runOne(CANDIDATE, item);
  rows.push({ item, runs: { [BASE]: baseRun, [CANDIDATE]: candRun } });
  console.log(
    `${baseRun.ok ? 'ok' : 'FAIL'}/${candRun.ok ? 'ok' : 'FAIL'}  ${baseRun.latencyMs}ms / ${candRun.latencyMs}ms`
  );
}

const startedAt = new Date().toISOString();
const baseSum = summarise(rows, BASE);
const candSum = summarise(rows, CANDIDATE);

const lines = [];
lines.push('# Coach/Ask model comparison');
lines.push('');
lines.push(`Generated: ${startedAt}`);
lines.push(`Prompts: \`${path.relative(ROOT, PROMPTS_PATH)}\``);
lines.push(`Base: \`${BASE}\` · Candidate: \`${CANDIDATE}\``);
lines.push(
  `GPT-6 reasoning effort for candidate: \`${getCoachReasoningEffort(CANDIDATE) || 'n/a'}\` (Chat Completions / Responses).`
);
lines.push('');
lines.push(
  'Token cost only (USD list price). Ask also incurs hosted `web_search` fees that this table does not estimate.'
);
lines.push('Do not commit this file if a live key or rider-identifying text is present.');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push('| Model | OK | Latency (sum) | Input | Output | Cached | Reasoning | Est. token $ |');
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const [model, sum] of [
  [BASE, baseSum],
  [CANDIDATE, candSum],
]) {
  lines.push(
    `| \`${model}\` | ${sum.ok}/${sum.n} | ${sum.latency} ms | ${sum.input} | ${sum.output} | ${sum.cached} | ${sum.reasoning} | ${usd(sum.cost)} |`
  );
}
lines.push('');

for (const row of rows) {
  const { item } = row;
  lines.push(`## ${item.id}`);
  lines.push('');
  lines.push(`Surface: **${item.surface}**${item.skill ? ` · skill \`${item.skill}\`` : ''}`);
  lines.push('');
  lines.push('Prompt:');
  lines.push('');
  lines.push('```');
  lines.push(mdEscape(item.prompt));
  lines.push('```');
  lines.push('');
  lines.push('| | `' + BASE + '` | `' + CANDIDATE + '` |');
  lines.push('| --- | --- | --- |');
  const a = row.runs[BASE];
  const b = row.runs[CANDIDATE];
  lines.push(`| Latency | ${a.latencyMs} ms | ${b.latencyMs} ms |`);
  lines.push(`| Tokens | ${usageLine(a)} | ${usageLine(b)} |`);
  lines.push(`| Est. token $ | ${usd(estimateCost(BASE, a.usage))} | ${usd(estimateCost(CANDIDATE, b.usage))} |`);
  lines.push(`| OK | ${a.ok ? 'yes' : 'NO'} | ${b.ok ? 'yes' : 'NO'} |`);
  if (a.suggestMode || b.suggestMode) {
    lines.push(`| Suggest mode | ${a.suggestMode || '—'} | ${b.suggestMode || '—'} |`);
  }
  lines.push('');
  lines.push(`### ${BASE}`);
  lines.push('');
  lines.push(a.error ? `Error: ${a.error}` : mdEscape(a.content) || '_(empty)_');
  lines.push('');
  lines.push(`### ${CANDIDATE}`);
  lines.push('');
  lines.push(b.error ? `Error: ${b.error}` : mdEscape(b.content) || '_(empty)_');
  lines.push('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
console.log(`\nWrote ${OUT}`);
console.log(
  `Token $  ${BASE} ${usd(baseSum.cost)}  vs  ${CANDIDATE} ${usd(candSum.cost)}  (Ask web_search fees extra)`
);
