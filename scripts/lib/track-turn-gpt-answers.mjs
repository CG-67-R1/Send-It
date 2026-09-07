/**
 * RoadRacer Track Coach answers for every Track Details turn.
 * Pending owner review — do not apply to catalog fields until approved.
 * Wording rule: never say "from the catalog"; use "from memory".
 */
export const GPT_SOURCE =
  'RoadRacer Track Coach knowledge (docs/gpt-knowledge + ST/GPTUpload track guides) plus model memory. Live OpenAI was not called in this environment (no OPENAI_API_KEY; production /roadrace-ai is 10 req / 15 min).';

const T = (shape, approach, orientation, confidence, notes = '') => ({
  shape,
  approach,
  orientation,
  confidence,
  notes,
});

/** Answers keyed by Track Details corner id. */
export const ANSWERS = {
  // —— Phillip Island (anticlockwise) ——
  phillip_island_t1: T(
    'Sweeper',
    'Gardner Straight / start-finish — high-speed run, often a bump after the line',
    'Turn 1 is a right from memory — Doohan, late apex, then short drive toward Southern Loop.',
    'high',
    'ST PHILLIP_S01; geometry T1 Doohan R'
  ),
  phillip_island_t2: T(
    'Hairpin',
    'T1 (Doohan) exit — still carrying speed, scrub or one downshift',
    'Turn 2 is a left from memory — Southern Loop, double-apex bowl, do not park mid-corner right.',
    'high',
    'ST PHILLIP_S02'
  ),
  phillip_island_t3: T(
    'Kink',
    'Southern Loop exit — downhill acceleration',
    'Turn 3 is a left from memory — Stoner, high-speed kink, track drops at the apex; set up left for Miller braking.',
    'high',
    'Named Stoner / left. Ignore ST extract that says “flick right”.'
  ),
  phillip_island_t4: T(
    'Hairpin',
    'Stoner exit — downhill, wind-sensitive braking',
    'Turn 4 is a right from memory — Miller (ex Honda), late apex, prime outbrake zone.',
    'high',
    'ST PHILLIP_S04'
  ),
  phillip_island_t5: T(
    'Kink',
    'Miller exit — short drive, stay ready to flick left',
    'Turn 5 is a left from memory — Siberia, tight exit left to set Hayshed; not a full hairpin.',
    'high',
    'Track Details + ST name Siberia as T5 (geometry JSON uses a different 12-turn split).'
  ),
  phillip_island_t6: T(
    'Kink',
    'Siberia exit — short chute under the Hayshed landmark',
    'Turn 6 is a right from memory — Hayshed, fast commitment kink, inside-curb bump; map lists complex.',
    'high',
    'ST PHILLIP_S06; map direction is complex'
  ),
  phillip_island_t7: T(
    'Corner / complex',
    'Hayshed exit — still leaned, uphill toward Lukey',
    'Turn 7 is a left from memory — Lukey Heights entry, uphill left that never quite settles until the crest.',
    'medium',
    'ST PHILLIP_S07'
  ),
  phillip_island_t8: T(
    'Corner / complex',
    'Lukey entry — charge uphill, one downshift before the crest',
    'Turn 8 is a right from memory — Lukey Heights proper, blind crest right, apex on top then drop toward MG.',
    'high',
    'ST PHILLIP_S08'
  ),
  phillip_island_t9: T(
    'Hairpin',
    'Lukey crest exit — steep downhill, front loads hard',
    'Turn 9 is a right from memory — MG Hairpin, downhill, avoid the far-outside entry bump.',
    'high',
    'ST PHILLIP_S09'
  ),
  phillip_island_t10: T(
    'Kink',
    'MG exit — pick the bike up and drive',
    'Turn 10 is a left from memory — shallow kink after MG, more acceleration zone than a aimed-for apex.',
    'medium',
    'ST PHILLIP_S10'
  ),
  phillip_island_t11: T(
    'Sweeper',
    'T10 kink exit — brief straight, then commit left',
    'Turn 11 is a left from memory — sweeping left after MG toward Gardner’s; front can go light over the rise.',
    'medium',
    'Geometry notes a sweeping left after MG; Track Details splits T11 / T12 Gardner’s'
  ),
  phillip_island_t12: T(
    'Sweeper',
    'T11 exit — last left onto Gardner Straight',
    'Turn 12 is a left from memory — Gardner’s, final sweeper onto the main straight; exit drive is the lap.',
    'high',
    'Official 12-turn PI memory; catalog currently folds this into T11 / T-Finish'
  ),

  // —— Mallala (clockwise) ——
  mallala_t1: T(
    'Kink / lead-in complex',
    'Main straight / start-finish — settle early, bump risk at the first apex',
    'Turn 1 is a complex from memory — kink / lead-in, get the bike calm for the left that follows.',
    'medium',
    'ST MALLALA_S01; hand not rider-locked'
  ),
  mallala_t2: T(
    'Tight left / hairpin-ish',
    'T1 kink exit — inner loop',
    'Turn 2 is a left from memory — tight left, late-ish apex, exit matters more than entry.',
    'high',
    'Rider-verified left'
  ),
  mallala_t3: T(
    'Hairpin',
    'T2 exit — short run to the far hairpin',
    'Turn 3 is a right from memory — right hairpin, rider-verified; square it if you need a stable drive.',
    'high',
    'Rider-verified right'
  ),
  mallala_t4: T(
    'Fast sweeper / long radius',
    'T3 hairpin exit — long top section',
    'Turn 4 is a complex from memory — long sweeper / almost a straight; hand not locked.',
    'medium',
    'Map label says straight / not a corner'
  ),
  mallala_t5: T(
    'Medium-speed bend',
    'T4 long section exit',
    'Turn 5 is a complex from memory — northern hairpin / medium bend; hand not locked.',
    'medium'
  ),
  mallala_t6: T(
    'Fast kink / setup',
    'T5 exit — position for the big stop',
    'Turn 6 is a left from memory — setup kink for the hairpin; rider-verified left.',
    'high',
    'Rider-verified left'
  ),
  mallala_t7: T(
    'Tight hairpin / major braking',
    'T6 kink exit — heavy stop',
    'Turn 7 is a right from memory — right hairpin, late apex, rear-spin risk on exit.',
    'high',
    'Rider-verified; ST MALLALA_S07'
  ),
  mallala_t8: T(
    'Kink / transition',
    'T7 hairpin exit — connector',
    'Turn 8 is a complex from memory — kink / connector; hand not locked.',
    'medium'
  ),
  mallala_t9: T(
    'Final turn / drive corner',
    'T8 exit — last corner onto the main straight',
    'Turn 9 is a complex from memory — final drive onto the straight; compression dip on exit in memory.',
    'medium',
    'ST MALLALA_S09; hand not locked'
  ),

  // —— Mac Park (clockwise) ——
  mac_park_t1: T(
    'Hairpin',
    'Main straight / start-finish',
    'Turn 1 is a complex from memory — The Hairpin, first-gear stop after the chute.',
    'high',
    'ST MACPARK_S01'
  ),
  mac_park_t2: T(
    'Corner / complex',
    'Hairpin exit — uphill toward the crest',
    'Turn 2 is a complex from memory — blind crest pair with T3; do not invent a line over the rise.',
    'medium',
    'ST MACPARK_S02'
  ),
  mac_park_t3: T(
    'Kink',
    'T2 crest exit',
    'Turn 3 is a right from memory — linked with the crest; treat T2–T3 as one sequence.',
    'medium'
  ),
  mac_park_t4: T(
    'Corner / complex',
    'T3 exit',
    'Turn 4 is a left from memory — left-hander after the crest pair.',
    'medium',
    'ST MACPARK_S03'
  ),
  mac_park_t5: T(
    'Sweeper',
    'T4 exit',
    'Turn 5 is a right from memory — right-hand sweeper, carry roll speed.',
    'medium',
    'ST MACPARK_S04'
  ),
  mac_park_t6: T(
    'Kink',
    'T5 sweeper exit',
    'Turn 6 is a complex from memory — chicane entry / first half of the 6–7 pair.',
    'medium',
    'ST MACPARK_S05'
  ),
  mac_park_t7: T(
    'Sweeper',
    'T6 chicane exit — often over a crest',
    'Turn 7 is a left from memory — fast left sweeper / crest after the chicane.',
    'medium'
  ),
  mac_park_t8: T(
    'Sweeper',
    'T7 exit',
    'Turn 8 is a right from memory — fast right, spectator / Clubhouse approach in memory.',
    'medium',
    'ST MACPARK_S06'
  ),
  mac_park_t9: T(
    'Hairpin',
    'T8 exit — short straight, serious braking',
    'Turn 9 is a complex from memory — Clubhouse hairpin, off-camber exit in the guide.',
    'medium',
    'ST MACPARK_S07'
  ),
  mac_park_t10: T(
    'Esses / S',
    'Clubhouse hairpin exit',
    'Turn 10 is a left from memory — esses / blind crest, first flick of the 10–11 pair.',
    'medium',
    'ST MACPARK_S08'
  ),
  mac_park_t11: T(
    'Esses / S',
    'T10 left flick exit',
    'Turn 11 is a right from memory — esses right, stay in sequence for the last corner.',
    'medium'
  ),
  mac_park_t12: T(
    'Hairpin',
    'T11 esses exit',
    'Turn 12 is a complex from memory — final left onto the main straight; exit drive is the lap.',
    'medium',
    'ST MACPARK_S09'
  ),

  // —— Morgan Park Circuit K (clockwise) ——
  morgan_park_t1: T(
    'Kink',
    'Main straight / start-finish',
    'Turn 1 is a complex from memory — right-hand decelerating entry, linked with T2 as one arc.',
    'medium',
    'Geometry T1 R; ST treats T1–T2 as right-left sweepers — verify pair'
  ),
  morgan_park_t2: T(
    'Sweeper',
    'T1 exit — still in the opening pair',
    'Turn 2 is a complex from memory — second half of the opening sweep; geometry says right, ST says left of a pair.',
    'low',
    'Catalog has no T2 row; owner should lock the hand'
  ),
  morgan_park_t3: T(
    'Corner / complex',
    'T1–T2 exit — uphill to the wall',
    'Turn 3 is a left from memory — blind left by the wall (Track Details / ST). Geometry ASBK note says T3 right hairpin — do not ship a hand until you pick one.',
    'low',
    'P0 hand conflict: map/ST left vs geometry right hairpin'
  ),
  morgan_park_t4: T(
    'Hairpin',
    'T3 exit — uphill-to-flat heavy stop',
    'Turn 4 is a right from memory — heavy-braking right hairpin, classic slow-in.',
    'medium',
    'ST MORGAN_S03; geometry also T4 L after T3 — numbering may differ'
  ),
  morgan_park_t5: T(
    'Sweeper',
    'T4 hairpin exit',
    'Turn 5 is a left from memory — long sweeping left.',
    'medium',
    'ST MORGAN_S04'
  ),
  morgan_park_t6: T(
    'Kink',
    'T5 sweeper exit',
    'Turn 6 is a right from memory — right-hand flick.',
    'medium',
    'ST MORGAN_S05'
  ),
  morgan_park_t7: T(
    'Hairpin',
    'T6 flick exit',
    'Turn 7 is a left from memory — tight left before the fast esses.',
    'medium',
    'ST MORGAN_S06'
  ),
  morgan_park_t8: T(
    'Esses / S',
    'T7 exit — high-speed transition',
    'Turn 8 is a complex from memory — fast esses entry (often T8–T9 as one S).',
    'medium',
    'ST MORGAN_S07'
  ),
  morgan_park_t9: T(
    'Esses / S',
    'T8 flick exit',
    'Turn 9 is a complex from memory — fast esses exit, then drive to the banked right.',
    'medium'
  ),
  morgan_park_t10: T(
    'Sweeper',
    'Esses exit',
    'Turn 10 is a right from memory — fast banked right, positive camber.',
    'medium',
    'ST MORGAN_S08; geometry T10 R'
  ),
  morgan_park_t11: T(
    'Chicane',
    'T10 banked-right exit',
    'Turn 11 is a complex from memory — final chicane entry; hand not locked on the official diagram.',
    'low',
    'Geometry verify note'
  ),
  morgan_park_t12: T(
    'Chicane',
    'T11 chicane entry exit',
    'Turn 12 is a complex from memory — final chicane onto the main straight; verify the last flick hand.',
    'low'
  ),

  // —— One Raceway / Wakefield (clockwise, post-2024 10-turn memory used here) ——
  wakefield_park_t1: T(
    'Kink',
    'Main straight / start-finish',
    'Turn 1 is a left from memory — left kink, setup not a hero stop.',
    'medium',
    'ST ONERACE_S01; 2024 dual-direction map exists — this is Wakefield/CW memory'
  ),
  wakefield_park_t2: T(
    'Hairpin',
    'T1 kink exit',
    'Turn 2 is a right from memory — right hairpin, first real stop.',
    'medium',
    'ST ONERACE_S02'
  ),
  wakefield_park_t3: T(
    'Corner / complex',
    'T2 hairpin exit — uphill',
    'Turn 3 is a left from memory — left over a crest, front can go light.',
    'medium',
    'ST ONERACE_S03'
  ),
  wakefield_park_t4: T(
    'Corner / complex',
    'T3 crest exit',
    'Turn 4 is a left from memory — second left, keep the bike settled.',
    'medium',
    'ST ONERACE_S04'
  ),
  wakefield_park_t5: T(
    'Corner / complex',
    'T4 exit',
    'Turn 5 is a right from memory — right-hander before the Fish Hook.',
    'medium',
    'ST ONERACE_S05'
  ),
  wakefield_park_t6: T(
    'Hairpin',
    'T5 exit',
    'Turn 6 is a complex from memory — Fish Hook entry, tight pair with T7.',
    'medium',
    'ST ONERACE_S06'
  ),
  wakefield_park_t7: T(
    'Hairpin',
    'T6 Fish Hook entry exit',
    'Turn 7 is a complex from memory — Fish Hook exit; catalog folds 6 & 7 together.',
    'medium'
  ),
  wakefield_park_t8: T(
    'Kink',
    'Fish Hook exit',
    'Turn 8 is a left from memory — left kink, positioning for the fast right.',
    'medium',
    'ST ONERACE_S07'
  ),
  wakefield_park_t9: T(
    'Sweeper',
    'T8 kink exit',
    'Turn 9 is a complex from memory — fast right sweeper; map lists complex.',
    'medium',
    'ST ONERACE_S08'
  ),
  wakefield_park_t10: T(
    'Hairpin',
    'T9 sweeper exit',
    'Turn 10 is a left from memory — final hairpin (“The Sweeper” in the old guide), drive onto the straight.',
    'medium',
    'ST ONERACE_S09'
  ),

  // —— Wanneroo (clockwise; Track Details lists 7, guides often number T8 as the last) ——
  wanneroo_t1: T(
    'Kink',
    'Main straight / start-finish — ~800 m run, dip on turn-in',
    'Turn 1 is a right from memory — Cat Corner, sweeping right, dusty/sandy runoff outside.',
    'high',
    'ST WANNEROO_S01'
  ),
  wanneroo_t2: T(
    'Kink',
    'Cat Corner exit — crest, bike can go light',
    'Turn 2 is a complex from memory — usually a flat-out left link toward T3; positioning corner.',
    'medium',
    'ST WANNEROO_S02'
  ),
  wanneroo_t3: T(
    'Kink',
    'T2 exit — right-left combo starts',
    'Turn 3 is a left from memory — first of the T3–T4 flick; map says left.',
    'medium',
    'ST describes T3 as a right into T4 left — verify this map hand'
  ),
  wanneroo_t4: T(
    'Hairpin',
    'T3 exit — cut back toward the Basin',
    'Turn 4 is a complex from memory — quick left of the T3–T4 pair in the guide; map lists complex.',
    'medium',
    'ST WANNEROO_S04'
  ),
  wanneroo_t5: T(
    'Hairpin',
    'T4 exit — short straight, brake for the Basin',
    'Turn 5 is a right from memory — more a braking-zone / approach right than a slow hairpin.',
    'medium',
    'ST WANNEROO_S05'
  ),
  wanneroo_t6: T(
    'Hairpin',
    'T5 downhill — rear goes light on the brakes',
    'Turn 6 is a complex from memory — Kolb / The Basin, banked bowl, drop in and climb out.',
    'high',
    'ST WANNEROO_S06'
  ),
  wanneroo_t7: T(
    'Kink',
    'Basin climb-out — crest, then last corner onto the straight',
    'Turn 7 is a left from memory — Track Details treats this as the last left onto the straight (guides often split T7 crest + T8 final sweeper).',
    'medium',
    'Catalog still has a separate T8 final sweeper; map does not'
  ),

  // —— Queensland Raceway National (clockwise paperclip) ——
  queensland_raceway_t1: T(
    'Kink',
    'Dick Johnson / main straight — often just a roll',
    'Turn 1 is a right from memory — Kitty’s Corner, fast right, not a big stop.',
    'high',
    'ST QR_S01. Geometry PNG that marks every turn R is a map-read error vs bike National.'
  ),
  queensland_raceway_t2: T(
    'Hairpin',
    'Kitty’s exit — hard straight-line brake, slight uphill',
    'Turn 2 is a left from memory — left hairpin (bike National). Car maps sometimes number this T3.',
    'high',
    'ST QR_S02; Track Details hand left matches the bike guide'
  ),
  queensland_raceway_t3: T(
    'Esses / S',
    'T2 exit — drift right, then the switchback',
    'Turn 3 is a complex from memory — Switchback entry (shallow right kink of the T3–T4 pair).',
    'high',
    'ST QR_S03'
  ),
  queensland_raceway_t4: T(
    'Esses / S',
    'T3 kink exit',
    'Turn 4 is a complex from memory — Switchback left, tighter than T3; clip the left curb in the guide.',
    'high'
  ),
  queensland_raceway_t5: T(
    'Hairpin',
    'Back straight after the switchback — long brake',
    'Turn 5 is a right from memory — Spitfire / Thunderbolt hairpin, mid apex, off-camber exit.',
    'high',
    'ST QR_S04'
  ),
  queensland_raceway_t6: T(
    'Kink',
    'T5 exit — stay left for radius, then stand it up',
    'Turn 6 is a right from memory — final bend onto the main straight; exit speed is the lap.',
    'high',
    'ST QR_S05'
  ),

  // —— SMP Gardner (anticlockwise per 2026 geometry; T1 left ~200 km/h) ——
  smp_gardner_t1: T(
    'Sweeper',
    'Main straight / start-finish — pit-wall end, old drag-strip bumps',
    'Turn 1 is a left from memory — fastest SMSP corner, long fast left; do not over-slow.',
    'high',
    'Geometry + ST shape. ST header said clockwise — superseded by 2026-08-11 anticlockwise note.'
  ),
  smp_gardner_t2: T(
    'Hairpin',
    'T1 exit — hard straight-line brake',
    'Turn 2 is a left from memory on the Track Details board (Southern Hairpin). Geometry says a right hairpin — lock the hand before apply.',
    'low',
    'P0 hand conflict: map left vs geometry right'
  ),
  smp_gardner_t3: T(
    'Corner / complex',
    'T2 exit — first right of the lap in the ST guide, over the tunnel',
    'Turn 3 is a right from memory — medium right over the tunnel; front light on the crest.',
    'medium',
    'ST SMP_S03; geometry T3 L — mild conflict'
  ),
  smp_gardner_t4: T(
    'Sweeper',
    'Tunnel / T3 exit',
    'Turn 4 is a right from memory — Corporate Hill entry sweeper, early apex over an inside bump.',
    'medium',
    'ST SMP_S04'
  ),
  smp_gardner_t5: T(
    'Corner / complex',
    'T4 exit — keep tight to set the left flick',
    'Turn 5 is a left from memory — fast left flick uphill, throttle early in the guide.',
    'medium',
    'ST SMP_S05'
  ),
  smp_gardner_t6: T(
    'Kink',
    'T5 exit',
    'Turn 6 is a left from memory — BMW / MotoRide, late apex; drive sets up the hill.',
    'medium',
    'ST SMP_S06'
  ),
  smp_gardner_t7: T(
    'Corner / complex',
    'T6 drive — uphill, blind',
    'Turn 7 is a right from memory — Corporate Hill, long blind right over a rise. Not a left.',
    'high',
    'Geometry + coaching pitfall: Corporate Hill is RIGHT'
  ),
  smp_gardner_t8: T(
    'Kink',
    'Corporate Hill exit — short chute',
    'Turn 8 is a right from memory on the board — slight kink toward the T9 hairpin. Geometry says left kink; verify.',
    'low',
    'Map right vs geometry left'
  ),
  smp_gardner_t9: T(
    'Hairpin',
    'T8 chute — downhill, very fast approach',
    'Turn 9 is a right from memory — sharp hairpin at the bottom of the hill, outbrake zone.',
    'high',
    'ST SMP_S09'
  ),
  smp_gardner_t10: T(
    'Corner / complex',
    'T9 hairpin exit — reset left for the last corner',
    'Turn 10 is a left from memory — left after the hairpin; high inside curb in the guide.',
    'medium',
    'ST SMP_S10'
  ),
  smp_gardner_t11: T(
    'Hairpin',
    'T10 exit — late from the far right, V the corner',
    'Turn 11 is a left from memory — final hairpin onto the main straight; off-camber, crest on exit.',
    'high',
    'ST SMP_S11; geometry T11 L'
  ),

  // —— Broadford (clockwise) ——
  broadford_t1: T(
    'Double-apex',
    'Chute / main straight — far right, slight uphill',
    'Turn 1 is a left from memory — opening uphill left of the Honda-named pair (name is Broadford’s, not PI).',
    'medium',
    'ST BROADFORD_S01; AU KB warns this is not Phillip Island Honda'
  ),
  broadford_t2: T(
    'Double-apex',
    'T1 left exit — off-camber, do not coast',
    'Turn 2 is a complex from memory — tighter left that finishes the T1–T2 double-apex; off-camber exit.',
    'medium'
  ),
  broadford_t3: T(
    'Kink',
    'T2 exit — crest then downhill',
    'Turn 3 is a complex from memory — slight right kink on the back run; fast line often straight-lines T3–T4.',
    'medium',
    'ST BROADFORD_S02'
  ),
  broadford_t4: T(
    'Kink',
    'T3 kink — still downhill toward T5',
    'Turn 4 is a complex from memory — slight left kink / back straight; not a braking corner.',
    'medium'
  ),
  broadford_t5: T(
    'Hairpin',
    'Back straight / ramp — uphill brake',
    'Turn 5 is a right from memory — uphill hairpin, hill helps the stop, off-camber exit.',
    'high',
    'ST BROADFORD_S03'
  ),
  broadford_t6: T(
    'Kink',
    'T5 downhill — courage test into T7',
    'Turn 6 is a complex from memory — fast right kink at the bottom; barely a turn, drop-off outside.',
    'medium',
    'ST BROADFORD_S04'
  ),
  broadford_t7: T(
    'Chicane',
    'T6 exit / short chute — downhill then flat',
    'Turn 7 is a complex from memory — Flip-Flop entry, first right of the 7–8–9 esses.',
    'medium',
    'ST BROADFORD_S05–S06'
  ),
  broadford_t8: T(
    'Esses / S',
    'T7 right flick',
    'Turn 8 is a complex from memory — Flip-Flop left, snap the bike; off-camber toward T9.',
    'medium'
  ),
  broadford_t9: T(
    'Esses / S',
    'T8 left flick',
    'Turn 9 is a complex from memory — Flip-Flop exit, drive uphill to the twin-apex rights.',
    'medium'
  ),
  broadford_t10: T(
    'Double-apex',
    'T9 drive — uphill, roll not a big stop',
    'Turn 10 is a right from memory — first of the cambered twin-apex rights.',
    'high',
    'ST BROADFORD_S07'
  ),
  broadford_t11: T(
    'Double-apex',
    'T10 sweeper exit',
    'Turn 11 is a complex from memory — second right of the twin-apex pair; use all the exit for T12.',
    'medium'
  ),
  broadford_t12: T(
    'Corner / complex',
    'T10–T11 exit — downhill, off-camber',
    'Turn 12 is a left from memory — final downhill off-camber left onto the chute; wall outside.',
    'high',
    'ST BROADFORD_S08'
  ),

  // —— Hidden Valley (anticlockwise) ——
  hidden_valley_t1: T(
    'Hairpin',
    'Long main straight (~1.1 km) — big stop',
    'Turn 1 is a left from memory — tight hairpin off the straight, multiple lines.',
    'medium',
    'Geometry HV T1 L'
  ),
  hidden_valley_t2: T(
    'Esses / S',
    'T1 hairpin exit — uphill esses start',
    'Turn 2 is a left from memory — esses / uphill sector.',
    'medium'
  ),
  hidden_valley_t3: T(
    'Esses / S',
    'T2 exit',
    'Turn 3 is a right from memory — middle of the esses.',
    'medium'
  ),
  hidden_valley_t4: T(
    'Esses / S',
    'T3 exit',
    'Turn 4 is a left from memory — esses exit.',
    'medium'
  ),
  hidden_valley_t5: T(
    'Corner / complex',
    'Esses exit',
    'Turn 5 is a right from memory — ~90° , passing zone in the geometry notes.',
    'medium'
  ),
  hidden_valley_t6: T(
    'Hairpin',
    'T5 exit',
    'Turn 6 is a left from memory — very slow hairpin.',
    'medium'
  ),
  hidden_valley_t7: T(
    'Corner / complex',
    'T6 hairpin exit',
    'Turn 7 is a right from memory — local name Ducati in the geometry notes; blind / late-apex stories.',
    'medium'
  ),
  hidden_valley_t8: T(
    'Corner / complex',
    'T7 exit',
    'Turn 8 is a right from memory — linked with T9.',
    'medium'
  ),
  hidden_valley_t9: T(
    'Esses / S',
    'T8 exit',
    'Turn 9 is a left from memory — flip-flop with T8.',
    'medium'
  ),
  hidden_valley_t10: T(
    'Corner / complex',
    'T9 exit',
    'Turn 10 is a left from memory — commitment, off-camber noted in media.',
    'medium'
  ),
  hidden_valley_t11: T(
    'Corner / complex',
    'T10 exit',
    'Turn 11 is a left from memory — linked final sector.',
    'medium'
  ),
  hidden_valley_t12: T(
    'Kink',
    'T11 exit',
    'Turn 12 is a right from memory — flick sequence with T13.',
    'medium'
  ),
  hidden_valley_t13: T(
    'Kink',
    'T12 flick exit',
    'Turn 13 is a right from memory — second flick before the last left.',
    'medium'
  ),
  hidden_valley_t14: T(
    'Corner / complex',
    'T13 exit',
    'Turn 14 is a left from memory — onto the main straight; exit drive is the lap.',
    'medium'
  ),

  // —— The Bend International (clockwise, 18) ——
  the_bend_international_t1: T(
    'Hairpin',
    '1 km uphill main straight — crest then level, 300/200/100 boards on the left',
    'Turn 1 is a right from memory — Big Stop hairpin, first-gear right, depth-perception trap on the wide entry.',
    'high',
    'ST BEND_INT_S01'
  ),
  the_bend_international_t2: T(
    'Kink',
    'T1 hairpin exit — rise and dip',
    'Turn 2 is a left from memory — first of the T2–T3 left-right; do not rush T2 and kill T3.',
    'medium',
    'ST BEND_INT_S02; geometry T2 R — conflict, prefer ST/Track Details left'
  ),
  the_bend_international_t3: T(
    'Corner / complex',
    'T2 exit — bike still transitioning',
    'Turn 3 is a right from memory — tight / hairpin-style right of the T2–T3 pair; exit drive matters.',
    'medium',
    'Geometry T3 R tight'
  ),
  the_bend_international_t4: T(
    'Sweeper',
    'T3 exit — short drive, almost flat',
    'Turn 4 is a complex from memory — slight right kink, nearly flat-out; ST and geometry disagree on the hand (ST right kink vs geometry left kink).',
    'low',
    'ST BEND_INT_S03 vs geometry T4 L kink'
  ),
  the_bend_international_t5: T(
    'Sweeper',
    'T4 kink — still quick, crest/drop',
    'Turn 5 is a complex from memory — fast sweeper; ST says left, geometry says right kink. Camber falls off outside.',
    'low',
    'Catalog skips a standalone T5 row'
  ),
  the_bend_international_t6: T(
    'Hairpin',
    'Short straight after T5 — 150/100 boards, hard brake',
    'Turn 6 is a left from memory — long off-camber left that comes back on itself; do not hug inside too early.',
    'high',
    'ST BEND_INT_S04; geometry T6 L sharp'
  ),
  the_bend_international_t7: T(
    'Esses / S',
    'T6 exit — uphill, blind entry to the hardest sector',
    'Turn 7 is a complex from memory — esses entry (guide: fast kink over a crest into 7–10).',
    'medium',
    'ST BEND_INT_S05'
  ),
  the_bend_international_t8: T(
    'Esses / S',
    'T7 crest — still in the blind sequence',
    'Turn 8 is a complex from memory — second esses element; one mistake cascades.',
    'medium'
  ),
  the_bend_international_t9: T(
    'Corner / complex',
    'T8 exit — start shedding speed',
    'Turn 9 is a complex from memory — esses right, brush the brakes as you swap lean.',
    'medium',
    'ST BEND_INT_S06'
  ),
  the_bend_international_t10: T(
    'Esses / S',
    'T9 exit — sequence tightens',
    'Turn 10 is a complex from memory — esses exit, hug the right apex in the guide, then a short straight.',
    'medium',
    'ST BEND_INT_S07'
  ),
  the_bend_international_t11: T(
    'Sweeper',
    'Short run after T10 — crest, stay left until the kerb appears',
    'Turn 11 is a right from memory — fast right after a crest; tall inside kerb, do not turn in early.',
    'high',
    'ST BEND_INT_S08'
  ),
  the_bend_international_t12: T(
    'Corner / complex',
    'T11 exit — quick downshift, little runoff on exit',
    'Turn 12 is a left from memory — left onto the back straight; exit has no extra asphalt.',
    'high',
    'ST BEND_INT_S09; geometry T12 L tight'
  ),
  the_bend_international_t13: T(
    'Hairpin',
    'Back straight — uphill, on-camber entry',
    'Turn 13 is a right from memory — hairpin at the end of the back straight; camber falls off on exit.',
    'high',
    'ST BEND_INT_S10'
  ),
  the_bend_international_t14: T(
    'Hairpin',
    'T13 exit — upright and brake immediately',
    'Turn 14 is a right from memory — slow right hairpin, late apex, passing only if already alongside.',
    'high',
    'ST BEND_INT_S11'
  ),
  the_bend_international_t15: T(
    'Esses / S',
    'T14 exit — S-pair starts',
    'Turn 15 is a complex from memory — first of 15–16, tightens more than a kink.',
    'medium',
    'ST BEND_INT_S12'
  ),
  the_bend_international_t16: T(
    'Esses / S',
    'T15 exit — use all the track, then left',
    'Turn 16 is a complex from memory — second of the S; carry speed if T15 was honest.',
    'medium'
  ),
  the_bend_international_t17: T(
    'Hairpin',
    'Short burst out of T16 — 100 m board, last-lap pass zone',
    'Turn 17 is a right from memory — heavy-braking right hairpin.',
    'high',
    'ST BEND_INT_S13'
  ),
  the_bend_international_t18: T(
    'Corner / complex',
    'T17 exit — immediate left onto the 1 km straight',
    'Turn 18 is a left from memory — flowing final left, ~120 km/h class in the guide; exit is the straight.',
    'high',
    'ST BEND_INT_S14; map lists complex'
  ),

  // —— The Bend GT: T1–T9 follow the Track Details short labels; T10–T35 follow 7.77 km participant-map memory ——
  the_bend_gt_t1: T(
    'Sweeper',
    'Main straight / start-finish',
    'Turn 1 is a right from memory on this board — right sweeper / entry. Official 7.77 km GT T1 is a sharp right; confirm this dot is that corner.',
    'low',
    'Board T1–T9 look like a short 9-turn story; official GT is 35 turns / 7.77 km'
  ),
  the_bend_gt_t2: T(
    'Hairpin',
    'T1 exit',
    'Turn 2 is a left from memory on this board — left hairpin. Official GT T2 is a sweeping right — do not apply until the board is reconciled.',
    'low'
  ),
  the_bend_gt_t3: T(
    'Hairpin',
    'T2 exit',
    'Turn 3 is a right from memory on this board — right hairpin (official GT T3 is a tight right).',
    'low'
  ),
  the_bend_gt_t4: T(
    'Sweeper',
    'T3 exit',
    'Turn 4 is a right from memory on this board — infield-loop sweeper (official GT T4 is a left kink).',
    'low'
  ),
  the_bend_gt_t5: T(
    'Hairpin',
    'T4 exit',
    'Turn 5 is a left from memory on this board — left hairpin (official GT T5 is a long left sweeper).',
    'low'
  ),
  the_bend_gt_t6: T(
    'Esses / S',
    'T5 exit',
    'Turn 6 is a complex from memory on this board — infield esses (official GT T6 is a right).',
    'low'
  ),
  the_bend_gt_t7: T(
    'Hairpin',
    'T6 exit',
    'Turn 7 is a right from memory on this board — right hairpin / back section (official GT T7 is a left).',
    'low'
  ),
  the_bend_gt_t8: T(
    'Hairpin',
    'T7 exit',
    'Turn 8 is a left from memory on this board — left hairpin (official GT T8 is a right).',
    'low'
  ),
  the_bend_gt_t9: T(
    'Sweeper',
    'T8 exit',
    'Turn 9 is a right from memory on this board — right sweeper (official GT T9 is a sharp right).',
    'low'
  ),
  the_bend_gt_t10: T(
    'Corner / complex',
    'Official GT sector 2 — after T9',
    'Turn 10 is a left from memory on the 7.77 km GT participant map. This Track Details dot is evenly spaced — treat as unverified against the board.',
    'low',
    'Geometry bend_gt_7770m T10 L'
  ),
  the_bend_gt_t11: T(
    'Corner / complex',
    'Official GT T10 exit',
    'Turn 11 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t12: T(
    'Corner / complex',
    'Official GT T11 exit',
    'Turn 12 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t13: T(
    'Corner / complex',
    'Official GT T12 exit',
    'Turn 13 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t14: T(
    'Corner / complex',
    'Official GT T13 exit',
    'Turn 14 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t15: T(
    'Corner / complex',
    'Official GT T14 exit',
    'Turn 15 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t16: T(
    'Corner / complex',
    'Official GT T15 exit',
    'Turn 16 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t17: T(
    'Corner / complex',
    'Official GT T16 exit',
    'Turn 17 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t18: T(
    'Corner / complex',
    'Official GT T17 exit',
    'Turn 18 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t19: T(
    'Corner / complex',
    'Official GT T18 exit',
    'Turn 19 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t20: T(
    'Corner / complex',
    'Official GT T19 exit',
    'Turn 20 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t21: T(
    'Corner / complex',
    'Official GT T20 exit',
    'Turn 21 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t22: T(
    'Corner / complex',
    'Official GT sector 3 — after T21',
    'Turn 22 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t23: T(
    'Corner / complex',
    'Official GT T22 exit',
    'Turn 23 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t24: T(
    'Corner / complex',
    'Official GT T23 exit',
    'Turn 24 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t25: T(
    'Corner / complex',
    'Official GT T24 exit',
    'Turn 25 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t26: T(
    'Corner / complex',
    'Official GT T25 exit',
    'Turn 26 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t27: T(
    'Corner / complex',
    'Official GT T26 exit',
    'Turn 27 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t28: T(
    'Corner / complex',
    'Official GT T27 exit',
    'Turn 28 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t29: T(
    'Corner / complex',
    'Official GT T28 exit',
    'Turn 29 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t30: T(
    'Corner / complex',
    'Official GT T29 exit',
    'Turn 30 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t31: T(
    'Corner / complex',
    'Official GT T30 exit',
    'Turn 31 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t32: T(
    'Corner / complex',
    'Official GT T31 exit',
    'Turn 32 is a right from memory — tight on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t33: T(
    'Corner / complex',
    'Official GT T32 exit',
    'Turn 33 is a left from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t34: T(
    'Corner / complex',
    'Official GT T33 exit',
    'Turn 34 is a right from memory on the 7.77 km GT map. Board placement unverified.',
    'low'
  ),
  the_bend_gt_t35: T(
    'Corner / complex',
    'Official GT T34 exit',
    'Turn 35 is a right from memory — onto the main straight on the 7.77 km GT map. Board placement unverified.',
    'low',
    'Geometry T35 R onto main straight'
  ),

  // —— SMP Brabham (anticlockwise; Gardner + southern extension) ——
  smp_brabham_t1: T(
    'Sweeper',
    'Main straight / start-finish — same T1 as Gardner',
    'Turn 1 is a left from memory — same fast left as Gardner.',
    'medium',
    'Geometry Brabham T1 L'
  ),
  smp_brabham_t2: T(
    'Hairpin',
    'T1 exit',
    'Turn 2 is a complex from memory — hairpin after T1; Gardner board says left, geometry says right. Lock before apply.',
    'low'
  ),
  smp_brabham_t3: T(
    'Sweeper',
    'T2 exit',
    'Turn 3 is a complex from memory — left in the Brabham geometry notes.',
    'medium'
  ),
  smp_brabham_t4: T(
    'Sweeper',
    'T3 exit',
    'Turn 4 is a complex from memory — right in the Brabham geometry notes.',
    'medium'
  ),
  smp_brabham_t5: T(
    'Hairpin',
    'T4 exit',
    'Turn 5 is a complex from memory — left sweeper in the geometry notes (catalog says hairpin).',
    'low'
  ),
  smp_brabham_t6: T(
    'Hairpin',
    'T5 exit',
    'Turn 6 is a complex from memory — right in the geometry notes.',
    'medium'
  ),
  smp_brabham_t7: T(
    'Hairpin',
    'T6 exit',
    'Turn 7 is a complex from memory — Corporate Hill, long blind right over a rise.',
    'medium',
    'Geometry names T7 Corporate Hill R'
  ),
  smp_brabham_t8: T(
    'Kink',
    'Corporate Hill exit — Amaroo South extension begins in the geometry note',
    'Turn 8 is a complex from memory — left as the southern extension starts.',
    'low',
    'Verify on official Brabham map'
  ),
  smp_brabham_t9: T(
    'Hairpin',
    'T8 exit',
    'Turn 9 is a complex from memory — right in the geometry notes.',
    'low'
  ),
  smp_brabham_t10: T(
    'Kink',
    'T9 exit',
    'Turn 10 is a complex from memory — left in the geometry notes.',
    'low'
  ),
  smp_brabham_t11: T(
    'Hairpin',
    'T10 exit',
    'Turn 11 is a complex from memory — right in the geometry notes.',
    'low'
  ),
  smp_brabham_t12: T(
    'Corner / complex',
    'T11 exit — southern infield',
    'Turn 12 is a complex from memory — left southern infield; verify on the official Brabham map. Track Details lists 18 dots vs geometry ~16.',
    'low'
  ),
  smp_brabham_t13: T(
    'Corner / complex',
    'T12 exit',
    'Turn 13 is a complex from memory — right southern infield; verify.',
    'low'
  ),
  smp_brabham_t14: T(
    'Corner / complex',
    'T13 exit',
    'Turn 14 is a complex from memory — left southern infield; verify.',
    'low'
  ),
  smp_brabham_t15: T(
    'Corner / complex',
    'T14 exit',
    'Turn 15 is a complex from memory — right southern infield; verify.',
    'low'
  ),
  smp_brabham_t16: T(
    'Corner / complex',
    'T15 exit',
    'Turn 16 is a complex from memory — geometry’s last left onto the main straight; extra board dots after this are unverified.',
    'low'
  ),
  smp_brabham_t17: T(
    'Corner / complex',
    'Beyond the 16-turn geometry count',
    'Turn 17 is a complex from memory — no locked Brabham 17 in the geometry file. Do not invent a racing line.',
    'low',
    'Map has 18 corners; official count ~16'
  ),
  smp_brabham_t18: T(
    'Corner / complex',
    'Beyond the 16-turn geometry count',
    'Turn 18 is a complex from memory — extra board dot after the geometry lap. Verify or drop before apply.',
    'low'
  ),

  // —— SMP Druitt (northern loop; board uses T1–T4b then T15–T18) ——
  smp_druitt_t1: T(
    'Kink',
    'Main straight / start-finish — shared with Gardner',
    'Turn 1 is a complex from memory — same fast left as Gardner.',
    'medium'
  ),
  smp_druitt_t2: T(
    'Sweeper',
    'T1 exit',
    'Turn 2 is a complex from memory — right in the Druitt geometry notes.',
    'medium'
  ),
  smp_druitt_t3: T(
    'Kink',
    'T2 exit',
    'Turn 3 is a complex from memory — left in the Druitt geometry notes.',
    'medium'
  ),
  smp_druitt_t4: T(
    'Hairpin',
    'T3 exit',
    'Turn 4a is a complex from memory — first half of the northern-loop hairpin / T4 pair.',
    'low',
    'Board splits T4a / T4b; geometry has a single T4 R'
  ),
  smp_druitt_t4b: T(
    'Hairpin',
    'T4a exit',
    'Turn 4b is a complex from memory — second half of the T4 pair; not a separate official number.',
    'low'
  ),
  smp_druitt_t15: T(
    'Corner / complex',
    'Northern loop — board jumps to Gardner-style late numbers',
    'Turn 15 is a complex from memory — Druitt board reuses late Gardner numbers; geometry’s northern loop is T5–T9. Verify against the official Druitt map.',
    'low'
  ),
  smp_druitt_t16: T(
    'Corner / complex',
    'T15 exit on this board',
    'Turn 16 is a complex from memory — late Druitt board number; treat as northern-loop, not Gardner T16.',
    'low'
  ),
  smp_druitt_t17: T(
    'Corner / complex',
    'T16 exit on this board',
    'Turn 17 is a complex from memory — late Druitt board number; verify.',
    'low'
  ),
  smp_druitt_t18: T(
    'Corner / complex',
    'T17 exit on this board',
    'Turn 18 is a complex from memory — board’s final onto the straight; geometry’s last Druitt is T9 left.',
    'low'
  ),

  // —— Sandown National (anticlockwise, 13) ——
  sandown_t1: T(
    'Hairpin',
    'Pit straight — 90° stop onto the back straight',
    'Turn 1 is a right from memory — 90° right off the pit straight (geometry). Catalog also says hairpin.',
    'medium',
    'Geometry Sandown T1 R'
  ),
  sandown_t2: T(
    'Kink',
    'T1 exit — back-straight complex, fastest sector',
    'Turn 2 is a right from memory — right of the T2–T4 back-straight complex.',
    'medium'
  ),
  sandown_t3: T(
    'Sweeper',
    'T2 exit',
    'Turn 3 is a right from memory — right hairpin at the end of the back straight, passing zone.',
    'medium',
    'Geometry T3 R hairpin; catalog says sweeper — prefer geometry for this apply'
  ),
  sandown_t4: T(
    'Kink',
    'T3 hairpin exit',
    'Turn 4 is a left from memory — left sweeper out of the hairpin.',
    'medium'
  ),
  sandown_t5: T(
    'Corner / complex',
    'T4 exit — infield starts; GPX-approximate from here',
    'Turn 5 is a left from memory — left; verify on a Supercars / venue map.',
    'low',
    'Geometry T5–T12 marked approximate'
  ),
  sandown_t6: T(
    'Kink',
    'T5 exit',
    'Turn 6 is a right from memory — right kink; verify.',
    'low'
  ),
  sandown_t7: T(
    'Corner / complex',
    'T6 exit',
    'Turn 7 is a left from memory — verify on the official National map.',
    'low'
  ),
  sandown_t8: T(
    'Corner / complex',
    'T7 exit',
    'Turn 8 is a right from memory — verify.',
    'low'
  ),
  sandown_t9: T(
    'Corner / complex',
    'T8 exit',
    'Turn 9 is a left from memory — verify.',
    'low'
  ),
  sandown_t10: T(
    'Corner / complex',
    'T9 exit',
    'Turn 10 is a right from memory — verify.',
    'low'
  ),
  sandown_t11: T(
    'Corner / complex',
    'T10 exit',
    'Turn 11 is a left from memory — left infield; verify.',
    'low'
  ),
  sandown_t12: T(
    'Corner / complex',
    'T11 exit',
    'Turn 12 is a right from memory — right before the final hairpin; verify.',
    'low'
  ),
  sandown_t13: T(
    'Hairpin',
    'T12 exit',
    'Turn 13 is a left from memory — final left hairpin onto the pit straight; exit drive is the lap.',
    'medium'
  ),

  // —— Winton National (clockwise, 12) ——
  winton_t1: T(
    'Chicane',
    'BP Ultimate / main straight — opening esses in current memory',
    'Turn 1 is a complex from memory — Motorsport News Esses entry; hand not locked.',
    'medium',
    'Geometry winton T1–T2 esses; PitBoard numbering has moved over the years'
  ),
  winton_t2: T(
    'Chicane',
    'T1 esses entry exit',
    'Turn 2 is a complex from memory — Esses exit onto the climb toward Honda.',
    'medium'
  ),
  winton_t3: T(
    'Sweeper',
    'Esses exit / old-grid run',
    'Turn 3 is a left from memory — Honda Corner (PitBoard “Turn three” / old Turn 1).',
    'medium',
    'Geometry T3 Honda L'
  ),
  winton_t4: T(
    'Sweeper',
    'Honda exit',
    'Turn 4 is a right from memory — Nissan Corner, immediate right after Honda.',
    'medium'
  ),
  winton_t5: T(
    'Hairpin',
    'Foott Waste Straight',
    'Turn 5 is a left from memory — Roll Over, long left, time-gain zone in PitBoard memory.',
    'medium'
  ),
  winton_t6: T(
    'Corner / complex',
    'Roll Over exit',
    'Turn 6 is a right from memory — Penrite, sharp right before Kitome.',
    'medium'
  ),
  winton_t7: T(
    'Sweeper',
    'T6 exit',
    'Turn 7 is a left from memory — Kitome northern hairpin, passing spot. Board groups 7–9.',
    'medium'
  ),
  winton_t8: T(
    'Hairpin',
    'Kitome exit / Shannons Straight in map memory',
    'Turn 8 is a right from memory — Northern BM; linked riding in PitBoard. Exact National numbering can drift.',
    'low',
    'Geometry t8_t12_uncertainty'
  ),
  winton_t9: T(
    'Corner / complex',
    'T8 exit — eastern complex',
    'Turn 9 is a complex from memory — Advanced Petroleum infield entry; approximate.',
    'low'
  ),
  winton_t10: T(
    'Corner / complex',
    'T9 exit',
    'Turn 10 is a complex from memory — Advanced Petroleum mid; JSON sub-split, confirm on an official map.',
    'low'
  ),
  winton_t11: T(
    'Corner / complex',
    'Eastern complex exit',
    'Turn 11 is a complex from memory — return / white-line discipline toward the S/F straight.',
    'low'
  ),
  winton_t12: T(
    'Corner / complex',
    'T11 exit',
    'Turn 12 is a complex from memory — last link, trail-brake then open onto BP Ultimate Straight.',
    'low'
  ),

  // —— Calder Park: Thunderdome memory is 4 banked rights; board has 10 dots ——
  calder_park_t1: T(
    'Hairpin',
    'Front straight / start-finish',
    'Turn 1 is a right from memory if this is the Thunderdome — 24° banked right. Club-circuit T1 may differ.',
    'low',
    'Geometry Thunderdome 4 turns all R; board has 10 dots'
  ),
  calder_park_t2: T(
    'Corner / complex',
    'T1 exit',
    'Turn 2 is a right from memory on the Thunderdome (banked). Extra board dots are not in that 4-turn memory.',
    'low'
  ),
  calder_park_t3: T(
    'Hairpin',
    'T2 exit',
    'Turn 3 is a right from memory on the Thunderdome (banked).',
    'low'
  ),
  calder_park_t4: T(
    'Corner / complex',
    'T3 exit',
    'Turn 4 is a right from memory on the Thunderdome — last banked right onto the front straight.',
    'low'
  ),
  calder_park_t5: T(
    'Unknown — verify',
    'Not in Thunderdome 4-turn memory',
    'Turn 5 is a complex from memory — no locked Calder road-course T5. Do not invent a racing line.',
    'low'
  ),
  calder_park_t6: T(
    'Unknown — verify',
    'Not in Thunderdome 4-turn memory',
    'Turn 6 is a complex from memory — unverified board dot.',
    'low'
  ),
  calder_park_t7: T(
    'Unknown — verify',
    'Not in Thunderdome 4-turn memory',
    'Turn 7 is a complex from memory — unverified board dot.',
    'low'
  ),
  calder_park_t8: T(
    'Unknown — verify',
    'Not in Thunderdome 4-turn memory',
    'Turn 8 is a complex from memory — unverified board dot.',
    'low'
  ),
  calder_park_t9: T(
    'Unknown — verify',
    'Not in Thunderdome 4-turn memory',
    'Turn 9 is a complex from memory — unverified board dot.',
    'low'
  ),
  calder_park_t10: T(
    'Unknown — verify',
    'Not in Thunderdome 4-turn memory',
    'Turn 10 is a complex from memory — unverified board dot.',
    'low'
  ),

  // —— Lakeside (named corners; geometry file has no Lakeside entry) ——
  lakeside_t1: T(
    'Corner / complex',
    'Main straight / start-finish',
    'Turn 1 is a complex from memory — BP Bend, first stop after the straight.',
    'medium',
    'Named from memory; no track_geometry_australia Lakeside block'
  ),
  lakeside_t2: T(
    'Sweeper',
    'BP Bend exit',
    'Turn 2 is a complex from memory — The Karussell, banked bowl.',
    'medium'
  ),
  lakeside_t3: T(
    'Corner / complex',
    'Karussell exit',
    'Turn 3 is a complex from memory — link toward the Bus Stop; hand not locked.',
    'low'
  ),
  lakeside_t4: T(
    'Chicane',
    'T3 exit',
    'Turn 4 is a complex from memory — Bus Stop entry.',
    'medium'
  ),
  lakeside_t5: T(
    'Chicane',
    'Bus Stop entry exit',
    'Turn 5 is a complex from memory — Bus Stop exit. Catalog approach text still says Hungry — numbering drift.',
    'low',
    'Catalog approachFrom on T6 still says Hungry — board names Dunlop Bridge there'
  ),
  lakeside_t6: T(
    'Corner / complex',
    'Bus Stop exit',
    'Turn 6 is a complex from memory — Dunlop Bridge on this board (older notes used Hungry / Shell Bridge here).',
    'low'
  ),
  lakeside_t7: T(
    'Corner / complex',
    'Dunlop Bridge exit',
    'Turn 7 is a complex from memory — Hungry Corner on this board.',
    'medium'
  ),
  lakeside_t8: T(
    'Sweeper',
    'Hungry exit',
    'Turn 8 is a complex from memory — Eastern Loop.',
    'medium'
  ),
  lakeside_t9: T(
    'Corner / complex',
    'Eastern Loop exit',
    'Turn 9 is a complex from memory — Ford Corner, last onto the main straight. Catalog has no T9 row.',
    'medium'
  ),

  // —— Baskerville (anticlockwise; no geometry JSON block) ——
  baskerville_t1: T(
    'Corner / complex',
    'Main straight / start-finish — downhill / crest character in memory',
    'Turn 1 is a complex from memory — opening corner, hilly; hand not locked.',
    'low',
    'No track_geometry_australia Baskerville block'
  ),
  baskerville_t2: T(
    'Esses / S',
    'T1 exit',
    'Turn 2 is a complex from memory — Esses entry.',
    'medium'
  ),
  baskerville_t3: T(
    'Esses / S',
    'T2 exit',
    'Turn 3 is a complex from memory — Esses exit.',
    'medium'
  ),
  baskerville_t4: T(
    'Corner / complex',
    'Esses exit',
    'Turn 4 is a complex from memory — link toward Dunlop; hand not locked.',
    'low'
  ),
  baskerville_t5: T(
    'Corner / complex',
    'T4 exit',
    'Turn 5 is a complex from memory — Dunlop entry.',
    'medium'
  ),
  baskerville_t6: T(
    'Corner / complex',
    'Dunlop entry exit',
    'Turn 6 is a complex from memory — Dunlop exit.',
    'medium'
  ),
  baskerville_t7: T(
    'Corner / complex',
    'Dunlop exit',
    'Turn 7 is a complex from memory — Calvins.',
    'medium'
  ),
  baskerville_t8: T(
    'Corner / complex',
    'Calvins exit',
    'Turn 8 is a complex from memory — Shell Corner.',
    'medium'
  ),
  baskerville_t9: T(
    'Corner / complex',
    'Shell Corner exit',
    'Turn 9 is a complex from memory — Holden, last named board corner before T10.',
    'medium'
  ),
  baskerville_t10: T(
    'Corner / complex',
    'Holden exit',
    'Turn 10 is a complex from memory — extra board dot after Holden; catalog stops at T9. Verify before apply.',
    'low'
  ),
};
