/**
 * Runnable tests for Gearing Guide math + coach seed.
 * Run: npm run test:gearing (from app/)
 */
import {
  driveSpeedPercents,
  finalDriveRatio,
  formatGearingForCoach,
  formatRatio,
  matchBikePowerbandRef,
  nearbyPairs,
  parseSprocketPair,
  parseTeethInRange,
  sprocketTeethError,
  resolveBikeProvenance,
} from '../index';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert('45/14 ratio 3.21', formatRatio(finalDriveRatio(14, 45)) === '3.21');
assert('45/13 ratio 3.46', formatRatio(finalDriveRatio(13, 45)) === '3.46');
assert('48/14 ratio 3.43', formatRatio(finalDriveRatio(14, 48)) === '3.43');

{
  const pct = driveSpeedPercents(finalDriveRatio(14, 45), finalDriveRatio(13, 45));
  assert('drive% and speed% opposite sign', Math.abs(pct.drivePct + pct.speedPct) < 1e-9);
  assert('shorter gearing raises drive%', pct.drivePct > 0);
}

assert('parse 16/43', (() => {
  const parsed = parseSprocketPair('16/43');
  return parsed?.front === 16 && parsed?.rear === 43;
})());
assert('parse rejects junk', parseSprocketPair('sprockets') == null);
assert('parse rejects out-of-range front', parseSprocketPair('5/43') == null);

{
  assert('parseTeethInRange accepts 16', parseTeethInRange('16', 11, 20) === 16);
  assert('parseTeethInRange rejects 5', parseTeethInRange('5', 11, 20) == null);
  assert('sprocketTeethError empty is null', sprocketTeethError('', 11, 20, 'New front') == null);
  assert(
    'sprocketTeethError out of range',
    sprocketTeethError('5', 11, 20, 'New front') === 'New front must be 11–20 teeth.'
  );
}

{
  const rows = nearbyPairs(16, 43);
  const current = rows.find((row) => row.kind === 'current');
  assert('nearby includes current', current?.front === 16 && current?.rear === 43);
  assert('nearby includes +1 rear', rows.some((row) => row.front === 16 && row.rear === 44));
  assert('nearby includes -1 front', rows.some((row) => row.front === 15 && row.rear === 43));
}

{
  const r6 = matchBikePowerbandRef('yamaha r6');
  assert('alias matches R6', r6?.id === 'yamaha_yzf_r6_2017');
  assert('unknown bike does not invent a row', matchBikePowerbandRef('random trike 99') == null);
}

{
  const r6 = matchBikePowerbandRef('R6');
  const seed = formatGearingForCoach({
    manufacturer: 'Yamaha',
    family: 'YZF-R6',
    yearFrom: '2017',
    yearTo: '2025',
    capacityCc: '599',
    engineConfig: 'I4',
    peakTorqueRpm: '10500',
    peakPowerRpm: '14500',
    powerbandRpmFrom: '10500',
    powerbandRpmTo: '14500',
    provenance: 'catalog',
    catalog: r6,
    front: 16,
    rear: 43,
    newFront: null,
    newRear: null,
    goalId: 'limiter_early',
    requestText: 'Keep 6th for Gardner',
    trackName: 'Phillip Island',
  });
  assert('seed has current ratio', seed.includes('16/43') && seed.includes('2.69'));
  assert('seed has goal', seed.includes('Hitting the limiter too early'));
  assert('seed has verbatim request', seed.includes('Keep 6th for Gardner'));
  assert('seed has catalog provenance', seed.includes('Identity provenance: catalog'));
}

{
  const r6 = matchBikePowerbandRef('R6');
  const provenance = resolveBikeProvenance({
    manufacturer: 'Yamaha',
    family: 'YZF-R6',
    yearFrom: '2017',
    yearTo: '2025',
    capacityCc: '599',
    engineConfig: 'I4',
    peakTorqueRpm: '11000',
    peakPowerRpm: '14500',
    powerbandRpmFrom: '10500',
    powerbandRpmTo: '14500',
    catalog: r6,
    front: 16,
    rear: 43,
    newFront: null,
    newRear: null,
    goalId: 'more_drive',
    requestText: '',
    trackName: '',
  });
  assert('override wins over catalog', provenance === 'user_override');
}

{
  const seed = formatGearingForCoach({
    manufacturer: 'Homebuilt',
    family: 'Special',
    yearFrom: '',
    yearTo: '',
    capacityCc: '600',
    engineConfig: 'I4',
    peakTorqueRpm: '',
    peakPowerRpm: '',
    powerbandRpmFrom: '',
    powerbandRpmTo: '',
    provenance: 'manual',
    catalog: null,
    front: 15,
    rear: 45,
    newFront: null,
    newRear: null,
    goalId: 'more_drive',
    requestText: '',
    trackName: '',
  });
  assert('missing RPM is labelled unknown', seed.includes('Peak power RPM: unknown — do not invent'));
  assert('manual provenance in seed', seed.includes('Identity provenance: manual'));
}

if (failed) {
  console.error(`\n${failed} failing assertion(s)`);
  process.exit(1);
}
console.log('\nAll gearing tests passed');
