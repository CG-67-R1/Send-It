#!/usr/bin/env node
/**
 * Owner: Corners list = one row per number on the Track Details picture.
 * Mallala skips picture T4 (not a corner). Mac Park stays 12 (picture is short).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRACKS = path.join(ROOT, 'app/src/data/tracks.json');
const MAPS = path.join(ROOT, 'app/src/data/trackInfo/maps');
const PROOF = path.join(ROOT, 'app/src/data/trackInfo/mapProof.json');

function C(id, number, label, direction, extra = {}) {
  return {
    id,
    number,
    label,
    shape: extra.shape ?? 'Corner / complex',
    direction,
    approachFrom: extra.approachFrom ?? (number === 1 ? 'main straight / start-finish' : `T${number - 1} exit`),
  };
}

function finish(trackId, lastNum) {
  return {
    id: `${trackId}_t_finish`,
    number: null,
    label: 'T-Finish',
    shape: 'Straight',
    direction: 'straight',
    approachFrom: `T${lastNum} exit onto main straight`,
    isFinish: true,
  };
}

function turns(trackId, count, named = {}, hands = {}) {
  const list = [];
  for (let n = 1; n <= count; n++) {
    list.push(
      C(`${trackId}_t${n}`, n, named[n] ?? `Turn ${n}`, hands[n] ?? 'complex')
    );
  }
  list.push(finish(trackId, count));
  return list;
}

const LISTS = {
  phillip_island: [
    C('phillip_island_t1', 1, 'Doohan Corner', 'right', { shape: 'Sweeper' }),
    C('phillip_island_t2', 2, 'Southern Loop', 'left', { shape: 'Hairpin' }),
    C('phillip_island_t3', 3, 'Stoner Corner', 'left', { shape: 'Kink' }),
    C('phillip_island_t4', 4, 'Miller Corner (formerly Honda Corner)', 'right', { shape: 'Hairpin' }),
    C('phillip_island_t5', 5, 'Siberia', 'left', { shape: 'Kink' }),
    C('phillip_island_t6', 6, 'Hayshed', 'complex', { shape: 'Kink' }),
    C('phillip_island_t7', 7, 'Lukey Heights entry', 'complex'),
    C('phillip_island_t8', 8, 'Lukey Heights proper', 'complex'),
    C('phillip_island_t9', 9, 'MG Hairpin', 'right', { shape: 'Hairpin' }),
    C('phillip_island_t10', 10, 'Turn 10', 'complex', { shape: 'Kink' }),
    C('phillip_island_t11', 11, 'Turn 11', 'complex', { shape: 'Sweeper' }),
    C('phillip_island_t12', 12, "Gardner's", 'complex', { shape: 'Sweeper' }),
    finish('phillip_island', 12),
  ],
  mallala: [
    C('mallala_t1', 1, 'Turn 1', 'complex', { shape: 'Kink' }),
    C('mallala_t2', 2, 'Turn 2 (tight left)', 'left', { shape: 'Hairpin' }),
    C('mallala_t3', 3, 'Turn 3 (right hairpin)', 'right', { shape: 'Hairpin' }),
    C('mallala_t4', 4, 'Turn 4 (straight / not a corner)', 'complex', { shape: 'Straight' }),
    C('mallala_t5', 5, 'Turn 5 (northern hairpin)', 'complex', { shape: 'Hairpin' }),
    C('mallala_t6', 6, 'Turn 6', 'complex', { shape: 'Sweeper' }),
    C('mallala_t7', 7, 'Turn 7', 'complex'),
    C('mallala_t8', 8, 'Turn 8', 'complex'),
    C('mallala_t9', 9, 'Turn 9 (onto main straight)', 'complex'),
    finish('mallala', 9),
  ],
  wanneroo: [
    C('wanneroo_t1', 1, 'Cat Corner', 'right', { shape: 'Hairpin' }),
    C('wanneroo_t2', 2, 'Turn 2', 'complex', { shape: 'Kink' }),
    C('wanneroo_t3', 3, 'Turn 3', 'left', { shape: 'Kink' }),
    C('wanneroo_t4', 4, 'Turn 4', 'complex'),
    C('wanneroo_t5', 5, 'Turn 5', 'right'),
    C('wanneroo_t6', 6, 'Kolb Corner (The Basin)', 'complex', { shape: 'Hairpin' }),
    C('wanneroo_t7', 7, 'Turn 7 (final onto main straight)', 'left', { shape: 'Kink' }),
    finish('wanneroo', 7),
  ],
  lakeside: [
    C('lakeside_t1', 1, 'BP Bend', 'complex'),
    C('lakeside_t2', 2, 'The Karrussell', 'complex'),
    C('lakeside_t3', 3, 'Turn 3', 'complex'),
    C('lakeside_t4', 4, 'The Bus Stop', 'complex'),
    C('lakeside_t5', 5, 'The Bus Stop', 'complex'),
    C('lakeside_t6', 6, 'Dunlop Bridge', 'complex'),
    C('lakeside_t7', 7, 'Hungry Corner', 'complex'),
    C('lakeside_t8', 8, 'Eastern Loop', 'complex'),
    C('lakeside_t9', 9, 'Ford Corner', 'complex'),
    finish('lakeside', 9),
  ],
  calder_park: turns('calder_park', 10),
  sandown: turns('sandown', 13),
  winton: turns('winton', 12, {
    7: 'Turn 7 (often grouped with 8–9)',
    8: 'Turn 8 (often grouped with 7–9)',
    9: 'Turn 9 (often grouped with 7–8)',
  }),
  smp_gardner: [
    C('smp_gardner_t1', 1, 'Turn 1', 'left'),
    C('smp_gardner_t2', 2, 'Turn 2 (Southern Hairpin)', 'left', { shape: 'Hairpin' }),
    C('smp_gardner_t3', 3, 'Turn 3 (medium-speed right over tunnel)', 'right'),
    C('smp_gardner_t4', 4, 'Turn 4 (right-hand sweeper, Corporate Hill entry)', 'right', { shape: 'Sweeper' }),
    C('smp_gardner_t5', 5, 'Turn 5', 'left'),
    C('smp_gardner_t6', 6, 'Turn 6 (BMW / MotoRide corner)', 'left'),
    C('smp_gardner_t7', 7, 'Turn 7 (Corporate Hill)', 'right'),
    C('smp_gardner_t8', 8, 'Turn 8 (right kink / chute to T9)', 'right', { shape: 'Kink' }),
    C('smp_gardner_t9', 9, 'Turn 9 (Hairpin)', 'right', { shape: 'Hairpin' }),
    C('smp_gardner_t10', 10, 'Turn 10', 'left'),
    C('smp_gardner_t11', 11, 'Turn 11 (final corner)', 'left'),
    finish('smp_gardner', 11),
  ],
  smp_brabham: turns('smp_brabham', 18),
  smp_druitt: [
    C('smp_druitt_t1', 1, 'Turn 1', 'complex'),
    C('smp_druitt_t2', 2, 'Turn 2', 'complex'),
    C('smp_druitt_t3', 3, 'Turn 3', 'complex'),
    C('smp_druitt_t4', 4, 'Turn 4a', 'complex'),
    C('smp_druitt_t4b', 4, 'Turn 4b', 'complex', { approachFrom: 'T4a exit' }),
    C('smp_druitt_t15', 15, 'Turn 15', 'complex', { approachFrom: 'T4b exit' }),
    C('smp_druitt_t16', 16, 'Turn 16', 'complex', { approachFrom: 'T15 exit' }),
    C('smp_druitt_t17', 17, 'Turn 17', 'complex', { approachFrom: 'T16 exit' }),
    C('smp_druitt_t18', 18, 'Turn 18 (final)', 'complex', { approachFrom: 'T17 exit' }),
    finish('smp_druitt', 18),
  ],
  the_bend_international: [
    C('the_bend_international_t1', 1, 'Turn 1 (Big Stop hairpin)', 'right', { shape: 'Hairpin' }),
    C('the_bend_international_t2', 2, 'Turn 2', 'left', { shape: 'Kink' }),
    C('the_bend_international_t3', 3, 'Turn 3', 'right'),
    C('the_bend_international_t4', 4, 'Turn 4', 'complex', { shape: 'Kink' }),
    C('the_bend_international_t5', 5, 'Turn 5', 'complex', { shape: 'Sweeper' }),
    C('the_bend_international_t6', 6, 'Turn 6 (long left hairpin, off-camber)', 'left', { shape: 'Hairpin' }),
    C('the_bend_international_t7', 7, 'Turn 7', 'complex', { shape: 'Esses / S' }),
    C('the_bend_international_t8', 8, 'Turn 8', 'complex', { shape: 'Esses / S' }),
    C('the_bend_international_t9', 9, 'Turn 9', 'complex', { shape: 'Esses / S' }),
    C('the_bend_international_t10', 10, 'Turn 10', 'complex', { shape: 'Esses / S' }),
    C('the_bend_international_t11', 11, 'Turn 11 (fast right after crest)', 'right', { shape: 'Sweeper' }),
    C('the_bend_international_t12', 12, 'Turn 12 (left, leads to back straight)', 'left'),
    C('the_bend_international_t13', 13, 'Turn 13 (hairpin end of back straight)', 'right', { shape: 'Hairpin' }),
    C('the_bend_international_t14', 14, 'Turn 14 (right hairpin)', 'right', { shape: 'Hairpin' }),
    C('the_bend_international_t15', 15, 'Turn 15', 'complex', { shape: 'Esses / S' }),
    C('the_bend_international_t16', 16, 'Turn 16', 'complex', { shape: 'Esses / S' }),
    C('the_bend_international_t17', 17, 'Turn 17 (right hairpin, heavy braking)', 'right', { shape: 'Hairpin' }),
    C('the_bend_international_t18', 18, 'Turn 18 (final left onto main straight)', 'complex'),
    finish('the_bend_international', 18),
  ],
  the_bend_gt: turns(
    'the_bend_gt',
    35,
    {
      1: 'Turn 1 (right sweeper / entry)',
      2: 'Turn 2 (left hairpin)',
      3: 'Turn 3 (right hairpin)',
      4: 'Turn 4 (right sweeper / infield loop)',
      5: 'Turn 5 (left hairpin)',
      6: 'Turn 6 (infield complex / esses)',
      7: 'Turn 7 (right hairpin / back section)',
      8: 'Turn 8 (left hairpin)',
      9: 'Turn 9 (right sweeper)',
    },
    { 1: 'right', 2: 'left', 3: 'right', 4: 'right', 5: 'left', 7: 'right', 8: 'left', 9: 'right' }
  ),
  morgan_park: [
    C('morgan_park_t1', 1, 'Turn 1', 'complex', { shape: 'Sweeper' }),
    C('morgan_park_t2', 2, 'Turn 2', 'complex', { shape: 'Sweeper' }),
    C('morgan_park_t3', 3, 'Turn 3 (Blind Left-hander by the Wall)', 'left'),
    C('morgan_park_t4', 4, 'Turn 4 (Heavy Braking Right-Hairpin)', 'right', { shape: 'Hairpin' }),
    C('morgan_park_t5', 5, 'Turn 5 (Long Sweeping Left)', 'left', { shape: 'Sweeper' }),
    C('morgan_park_t6', 6, 'Turn 6 (Right-Hand Flick)', 'right', { shape: 'Kink' }),
    C('morgan_park_t7', 7, 'Turn 7 (Left-hand tight corner)', 'left', { shape: 'Hairpin' }),
    C('morgan_park_t8', 8, 'Turn 8 (Fast Esses)', 'complex', { shape: 'Esses / S' }),
    C('morgan_park_t9', 9, 'Turn 9 (Fast Esses)', 'complex', { shape: 'Esses / S' }),
    C('morgan_park_t10', 10, 'Turn 10 (Fast Banked Right)', 'right', { shape: 'Sweeper' }),
    C('morgan_park_t11', 11, 'Turn 11 (Final Chicane)', 'complex', { shape: 'Chicane' }),
    C('morgan_park_t12', 12, 'Turn 12 (Final Chicane onto Main Straight)', 'complex', { shape: 'Chicane' }),
    finish('morgan_park', 12),
  ],
  wakefield_park: [
    C('wakefield_park_t1', 1, 'Turn 1 (Left Kink)', 'left', { shape: 'Kink' }),
    C('wakefield_park_t2', 2, 'Turn 2 (Right Hairpin)', 'right', { shape: 'Hairpin' }),
    C('wakefield_park_t3', 3, 'Turn 3 (Left Bend over Crest)', 'left'),
    C('wakefield_park_t4', 4, 'Turn 4 (Left-hander)', 'left'),
    C('wakefield_park_t5', 5, 'Turn 5 (Right-hander)', 'right'),
    C('wakefield_park_t6', 6, 'Turn 6 (The Fish Hook)', 'complex', { shape: 'Hairpin' }),
    C('wakefield_park_t7', 7, 'Turn 7 (The Fish Hook)', 'complex', { shape: 'Hairpin' }),
    C('wakefield_park_t8', 8, 'Turn 8 (Left kink)', 'left', { shape: 'Kink' }),
    C('wakefield_park_t9', 9, 'Turn 9 (Fast Right Sweeper)', 'complex', { shape: 'Sweeper' }),
    C('wakefield_park_t10', 10, 'Turn 10 (Final Hairpin, The Sweeper)', 'left', { shape: 'Hairpin' }),
    finish('wakefield_park', 10),
  ],
  queensland_raceway: [
    C('queensland_raceway_t1', 1, "Turn 1 (Kitty's Corner)", 'right'),
    C('queensland_raceway_t2', 2, 'Turn 2 (left hairpin)', 'left', { shape: 'Hairpin' }),
    C('queensland_raceway_t3', 3, 'Turn 3 (The Switchback)', 'complex', { shape: 'Esses / S' }),
    C('queensland_raceway_t4', 4, 'Turn 4 (The Switchback)', 'complex', { shape: 'Esses / S' }),
    C('queensland_raceway_t5', 5, 'Turn 5 (Spitfire / Thunderbolt hairpin)', 'right', { shape: 'Hairpin' }),
    C('queensland_raceway_t6', 6, 'Turn 6 (final corner onto main straight)', 'right'),
    finish('queensland_raceway', 6),
  ],
  broadford: [
    C('broadford_t1', 1, 'Turn 1 (Honda Corner)', 'left'),
    C('broadford_t2', 2, 'Turn 2 (Honda Corner)', 'complex'),
    C('broadford_t3', 3, 'Turn 3 (Back Kink)', 'complex'),
    C('broadford_t4', 4, 'Turn 4 (Back Straight)', 'complex'),
    C('broadford_t5', 5, 'Turn 5 (Uphill Hairpin)', 'right', { shape: 'Hairpin' }),
    C('broadford_t6', 6, 'Turn 6 (The Kink)', 'complex'),
    C('broadford_t7', 7, 'Turn 7 (Flip-Flop)', 'complex', { shape: 'Esses / S' }),
    C('broadford_t8', 8, 'Turn 8 (Flip-Flop)', 'complex', { shape: 'Esses / S' }),
    C('broadford_t9', 9, 'Turn 9 (Flip-Flop)', 'complex', { shape: 'Esses / S' }),
    C('broadford_t10', 10, 'Turn 10 (Twin Apex Rights)', 'right'),
    C('broadford_t11', 11, 'Turn 11 (Twin Apex Rights)', 'complex'),
    C('broadford_t12', 12, 'Turn 12 (final left onto straight)', 'left'),
    finish('broadford', 12),
  ],
  baskerville: turns('baskerville', 10, {
    2: 'Turn 2 (Esses)',
    3: 'Turn 3 (Esses)',
    5: 'Turn 5 (Dunlop)',
    6: 'Turn 6 (Dunlop)',
    7: 'Turn 7 (Calvins)',
    8: 'Turn 8 (Shell Corner)',
    9: 'Turn 9 (Holden)',
  }),
};

function pointAt(poly, s) {
  if (!poly?.length) return [50, 50];
  const t = Math.min(1, Math.max(0, s)) * (poly.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = poly[i];
  const b = poly[Math.min(i + 1, poly.length - 1)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

function syncMapCorners(map, corners) {
  const prev = new Map((map.corners || []).map((c) => [c.id, c]));
  const numbered = corners.filter((c) => !c.isFinish && c.number != null);
  map.corners = numbered.map((c, idx) => {
    const old = prev.get(c.id);
    if (old) {
      return {
        ...old,
        number: c.number,
        label: c.label,
        direction: c.direction,
      };
    }
    const s = (idx + 1) / (numbered.length + 1);
    const [xPct, yPct] = pointAt(map.polyline, s);
    return {
      id: c.id,
      number: c.number,
      label: c.label,
      direction: c.direction,
      sNorm: Math.round(s * 10000) / 10000,
      xPct: Math.round(xPct * 100) / 100,
      yPct: Math.round(yPct * 100) / 100,
    };
  });
}

const catalog = JSON.parse(fs.readFileSync(TRACKS, 'utf8'));
const proof = JSON.parse(fs.readFileSync(PROOF, 'utf8'));

for (const track of catalog.tracks) {
  const next = LISTS[track.id];
  if (!next) continue;
  track.corners = next;
  const n = next.filter((c) => !c.isFinish).length;
  const mapPath = path.join(MAPS, `${track.id}.json`);
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  syncMapCorners(map, next);
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
  if (proof.layouts[track.id]) {
    proof.layouts[track.id].catalogDotCount = n;
    if (track.id !== 'mallala' && track.id !== 'smp_druitt') {
      proof.layouts[track.id].publishedBoardCount = n;
    }
    if (track.id === 'mallala') proof.layouts[track.id].publishedBoardCount = 9;
    if (track.id === 'smp_druitt') proof.layouts[track.id].publishedBoardCount = 9;
  }
  console.log(`${track.id}: ${n} list rows`);
}

fs.writeFileSync(TRACKS, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(PROOF, JSON.stringify(proof, null, 2) + '\n');

const androidData = path.join(ROOT, 'android-app/src/data');
fs.copyFileSync(TRACKS, path.join(androidData, 'tracks.json'));
fs.copyFileSync(PROOF, path.join(androidData, 'trackInfo/mapProof.json'));
for (const id of Object.keys(LISTS)) {
  fs.copyFileSync(path.join(MAPS, `${id}.json`), path.join(androidData, 'trackInfo/maps', `${id}.json`));
}
console.log('mirrored to android-app');
