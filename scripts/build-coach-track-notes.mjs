#!/usr/bin/env node
/**
 * Compact track notes for Coach / Bike Setup prompts.
 * Source is the GPT geometry and coaching-bias files. Output lives under api/data
 * so the Render service (rootDir: api) can read it. Hands are copied, never inferred.
 *
 * Usage: node scripts/build-coach-track-notes.mjs
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'data', 'coach-track-notes.json');
const VERIFICATION_FILE = path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json');

const GENERIC_LAYOUT_WORDS = new Set([
  'circuit',
  'grand',
  'prix',
  'extended',
  'north',
  'south',
  'international',
  'the',
  'motorsport',
  'park',
  'raceway',
  'layout',
]);

async function load(rel) {
  return JSON.parse(await fs.readFile(path.join(ROOT, rel), 'utf8'));
}

function hand(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'l' || raw === 'left') return 'left';
  if (raw === 'r' || raw === 'right') return 'right';
  return '';
}

function phrase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const next = phrase(item);
    if (next.length < 4 || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

function layoutTokens(name) {
  return phrase(name)
    .split(' ')
    .filter((word) => word.length >= 3 && !GENERIC_LAYOUT_WORDS.has(word));
}

function verificationKey(id, layoutName = '') {
  const layout = phrase(layoutName);
  if (id === 'sydney_motorsport_park') {
    if (layout.includes('gardner')) return 'smp_gardner';
    if (layout.includes('brabham')) return 'smp_brabham';
    if (layout.includes('druitt')) return 'smp_druitt';
  }
  if (id === 'the_bend_motorsport_park') {
    if (layout.includes('gt')) return 'the_bend_gt';
    if (layout.includes('international')) return 'the_bend_international';
  }
  if (id === 'one_raceway' && layout.includes('wakefield')) return 'wakefield_park';
  if (id === 'queensland_raceway_national') return 'queensland_raceway';
  if (id === 'winton_motor_raceway') return 'winton';
  return id;
}

function verifiedHandsFor(verification, id, layoutName) {
  const key = verificationKey(id, layoutName);
  if (!key || verification.forceAllComplex?.includes(key)) return new Map();
  const allowed = new Set(verification.allowedSourceMethods || []);
  const banned = new Set(verification.bannedSourceMethods || []);
  const byNumber = verification.handSources?.[key] || {};
  const out = new Map();
  for (const [n, source] of Object.entries(byNumber)) {
    const side = hand(source?.hand);
    const method = String(source?.method || '');
    const locked = hand(verification.verifiedHands?.[key]?.[n]);
    if (!side || side !== locked) continue;
    if (!allowed.has(method) || banned.has(method)) continue;
    out.set(Number(n), side);
  }
  return out;
}

function turnsFrom(container, verifiedHands) {
  const rows = Array.isArray(container?.turns) ? container.turns : [];
  return rows
    .map((turn) => {
      const n = Number(turn.turn ?? turn.number);
      const side = verifiedHands.get(n);
      if (!Number.isFinite(n) || !side) return null;
      const label = typeof turn.label === 'string' ? turn.label.trim() : '';
      return { n, hand: side, ...(label ? { label } : {}) };
    })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n);
}

function biasLine(bias) {
  if (!bias) return '';
  const bits = [];
  if (bias.surface_characteristics?.length) {
    bits.push(`surface ${bias.surface_characteristics.slice(0, 4).join(', ').replaceAll('_', ' ')}`);
  }
  if (bias.known_issues?.length) {
    bits.push(`issues ${bias.known_issues.slice(0, 3).join(', ').replaceAll('_', ' ')}`);
  }
  const priority = bias.bias_rules?.setup_priority;
  if (priority?.length) {
    bits.push(`priority ${priority.slice(0, 2).join(', ').replaceAll('_', ' ')}`);
  }
  return bits.join('. ');
}

function entryFromTurns(pack, id, venue, match, layoutName, layoutMatch, source, bias, verification) {
  const turns = turnsFrom(source, verifiedHandsFor(verification, id, layoutName));
  return {
    pack,
    id,
    group: id,
    venue,
    ...(layoutName ? { layout: layoutName } : {}),
    match,
    layoutMatch: layoutMatch || [],
    lengthKm: source.length_km ?? source.lengthKm ?? null,
    turnCount: source.turn_count ?? source.turnCount ?? turns.length,
    direction: source.direction || '',
    turns,
    bias: biasLine(bias),
  };
}

const EXTRA_MATCH = {
  the_bend_motorsport_park: ['the bend'],
  sydney_motorsport_park: ['smsp', 'eastern creek'],
  queensland_raceway_national: ['queensland raceway'],
  winton_motor_raceway: ['winton'],
  mount_panorama: ['bathurst', 'mount panorama'],
  hidden_valley: ['hidden valley', 'darwin'],
  one_raceway: ['wakefield', 'wakefield park'],
};

function trackEntries(pack, geometry, biasFile, verification) {
  const entries = [];
  const biasTracks = biasFile?.tracks || {};
  for (const [id, track] of Object.entries(geometry.tracks || {})) {
    const venue = track.venue || id;
    const match = unique([
      venue,
      id,
      track.former_name,
      ...(track.former_names || []),
      ...(track.aliases || []),
      ...(EXTRA_MATCH[id] || []),
    ]);
    const bias = biasTracks[id] || (id === 'sydney_motorsport_park' ? biasTracks.smsp : null);
    const layouts = Array.isArray(track.layouts) ? track.layouts : [];
    const turnKeys = Object.keys(track).filter((key) => key.startsWith('turns'));

    if (layouts.length) {
      for (const layout of layouts) {
        const name = layout.name || layout.id || '';
        entries.push(
          entryFromTurns(pack, id, venue, match, name, layoutTokens(name), layout, bias, verification)
        );
      }
      continue;
    }

    if (turnKeys.length > 1) {
      for (const key of turnKeys) {
        const name = key.replace(/^turns_/, '').replaceAll('_', ' ');
        entries.push(
          entryFromTurns(pack, id, venue, match, name, layoutTokens(name), { turns: track[key] }, bias, verification)
        );
      }
      continue;
    }

    const source = turnKeys.length === 1 ? { ...track, turns: track[turnKeys[0]] } : track;
    const keyName = turnKeys[0]?.replace(/^turns_/, '').replaceAll('_', ' ') || '';
    const layoutName = keyName && keyName !== 'turns' ? keyName : '';
    entries.push(
      entryFromTurns(
        pack,
        id,
        venue,
        match,
        layoutName,
        layoutName ? layoutTokens(layoutName) : [],
        source,
        bias,
        verification
      )
    );
  }

  for (const [id, bias] of Object.entries(biasTracks)) {
    const covered =
      entries.some((item) => item.id === id) ||
      (id === 'smsp' && entries.some((item) => item.id === 'sydney_motorsport_park'));
    if (covered) continue;
    const venue = id.replaceAll('_', ' ');
    entries.push({
      pack,
      id,
      group: id,
      venue,
      match: unique([venue]),
      layoutMatch: [],
      lengthKm: null,
      turnCount: null,
      direction: '',
      turns: [],
      bias: biasLine(bias),
    });
  }

  return entries;
}

const auGeo = await load('docs/gpt-knowledge/track_geometry_australia.json');
const ukGeo = await load('docs/gpt-knowledge/track_geometry_uk.json');
const auBias = await load('docs/gpt-knowledge/TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json');
const ukBias = await load('docs/gpt-knowledge/TRACK_SPECIFIC_DIAGNOSTIC_UK_v1.json');
const verification = JSON.parse(await fs.readFile(VERIFICATION_FILE, 'utf8'));

const tracks = [
  ...trackEntries('au', auGeo, auBias, verification),
  ...trackEntries('uk', ukGeo, ukBias, verification),
];

await fs.writeFile(OUT, `${JSON.stringify({ tracks }, null, 2)}\n`);
console.log(`Wrote ${tracks.length} track notes to ${path.relative(ROOT, OUT)}`);
