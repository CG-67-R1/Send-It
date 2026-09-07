#!/usr/bin/env node
/**
 * Merge Track Details inventory with RoadRacer Track Coach answers.
 * Writes docs/reviews/track-turn-gpt-review/turns.json and REVIEW.md
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ANSWERS, GPT_SOURCE } from './lib/track-turn-gpt-answers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/reviews/track-turn-gpt-review');
const INV_PATH = path.join(OUT_DIR, 'inventory.json');

spawnSync(process.execPath, [path.join(ROOT, 'scripts/collect-track-detail-turns.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});

const inventory = JSON.parse(await readFile(INV_PATH, 'utf8'));
const missing = [];
const catalogPhraseHits = [];
const tracks = [];
let high = 0;
let medium = 0;
let low = 0;

for (const track of inventory.tracks) {
  const turns = [];
  for (const corner of track.turns) {
    const gpt = ANSWERS[corner.id];
    if (!gpt) {
      missing.push(corner.id);
      continue;
    }
    for (const field of ['shape', 'approach', 'orientation']) {
      const text = String(gpt[field] ?? '');
      if (/from the catalog/i.test(text)) {
        catalogPhraseHits.push(`${corner.id}.${field}`);
      }
    }
    if (gpt.confidence === 'high') high += 1;
    else if (gpt.confidence === 'low') low += 1;
    else medium += 1;
    turns.push({
      id: corner.id,
      number: corner.number,
      label: corner.label,
      mapDirection: corner.direction,
      catalogMatch: corner.catalogMatch,
      current: corner.current,
      proposed: {
        shape: gpt.shape,
        approach: gpt.approach,
        orientation: gpt.orientation,
      },
      confidence: gpt.confidence,
      notes: gpt.notes || '',
      status: 'pending_owner_review',
    });
  }
  tracks.push({
    trackId: track.trackId,
    name: track.name,
    direction: track.direction,
    mapCornerCount: track.mapCornerCount,
    catalogCornerCount: track.catalogCornerCount,
    turns,
  });
}

if (missing.length) {
  console.error(`Missing GPT answers for ${missing.length} turns:\n${missing.join('\n')}`);
  process.exit(1);
}
if (catalogPhraseHits.length) {
  console.error(`Forbidden phrase "from the catalog" in:\n${catalogPhraseHits.join('\n')}`);
  process.exit(1);
}

const doc = {
  status: 'pending_owner_review',
  doNotApplyUntilApproved: true,
  generatedAt: new Date().toISOString(),
  source: GPT_SOURCE,
  wordingRule: 'Never say from the catalog. Use from memory.',
  applyTarget: 'packs/regions/au/tracks/tracks.json fields shape, approachFrom, orientation (then sync bundled copies)',
  counts: {
    tracks: tracks.length,
    turns: inventory.turnCount,
    high,
    medium,
    low,
  },
  tracks,
};

await mkdir(OUT_DIR, { recursive: true });
const jsonPath = path.join(OUT_DIR, 'turns.json');
await writeFile(jsonPath, `${JSON.stringify(doc, null, 2)}\n`);

const md = [];
md.push('# Track Details turn GPT review');
md.push('');
md.push('**Status:** pending owner review. Do not write these into catalog `shape` / `approachFrom` / `orientation` until you approve.');
md.push('');
md.push(`**Coverage:** ${doc.counts.turns} turns on ${doc.counts.tracks} Track Details circuits.`);
md.push('');
md.push(`**Confidence:** ${high} high · ${medium} medium · ${low} low.`);
md.push('');
md.push('**Source:** RoadRacer Track Coach knowledge pack (`docs/gpt-knowledge`, `ST/GPTUpload` track guides) plus model memory. Live OpenAI was not called here (no `OPENAI_API_KEY` in this environment; production `/roadrace-ai` is capped at 10 requests / 15 minutes).');
md.push('');
md.push('**Wording:** replies use **from memory**, never “from the catalog”.');
md.push('');
md.push('After you mark a turn correct, those three strings are what should land on the matching catalog corner (and any new map-only ids you choose to add).');
md.push('');
md.push('## Conflicts to check first');
md.push('');
md.push('- Phillip Island T5–T12 numbering vs geometry JSON’s 12-turn split.');
md.push('- Morgan Park T3: board/ST left “by the wall” vs geometry ASBK right hairpin.');
md.push('- SMP Gardner T2 and T8 hands vs geometry.');
md.push('- The Bend GT: board T1–T9 look like a short 9-turn story; official GT memory is 35 turns / 7.77 km. T10–T35 dots look evenly spaced.');
md.push('- SMP Brabham 18 dots vs ~16-turn geometry; Druitt T4a/T4b and T15–T18 numbering.');
md.push('- Calder Park 10 dots vs Thunderdome 4 banked rights.');
md.push('- Wanneroo board ends at T7; guides often number a separate T8 final sweeper.');
md.push('');

for (const track of tracks) {
  md.push(`## ${track.name}`);
  md.push('');
  md.push(`\`${track.trackId}\` · ${track.direction} · ${track.mapCornerCount} board turns (catalog numbered corners: ${track.catalogCornerCount})`);
  md.push('');
  md.push('| Turn | Label | Shape | Approach | Orientation | Conf |');
  md.push('| ---: | --- | --- | --- | --- | --- |');
  for (const turn of track.turns) {
    const cells = [
      `T${turn.number}`,
      escapeMd(turn.label),
      escapeMd(turn.proposed.shape),
      escapeMd(turn.proposed.approach),
      escapeMd(turn.proposed.orientation),
      turn.confidence,
    ];
    md.push(`| ${cells.join(' | ')} |`);
  }
  md.push('');
}

await writeFile(path.join(OUT_DIR, 'REVIEW.md'), `${md.join('\n')}\n`);
console.log(
  `Wrote ${doc.counts.turns} GPT answers (${high} high / ${medium} medium / ${low} low) → docs/reviews/track-turn-gpt-review/`
);

function escapeMd(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
