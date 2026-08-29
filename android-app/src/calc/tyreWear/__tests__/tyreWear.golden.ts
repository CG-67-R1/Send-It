/**
 * Runnable tests for Tyre Wear Analysis coach seed.
 * Run: npm run test:tyre-wear (from app/)
 */
import { formatTyreWearForCoach, missingTyreWearFacts } from '../index';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

{
  const seed = formatTyreWearForCoach({
    axle: 'rear',
    brandCompound: 'Pirelli SC2',
    hotPressure: '32',
    pressureUnit: 'psi',
    trackTemp: '38',
    ambientTemp: '24',
    sessionLength: '~15 min',
    warmers: 'yes',
    photoTaken: 'cooled',
    trackName: 'Phillip Island',
    bikeLabel: '2017 Yamaha YZF-R6',
    notes: 'Spun on exit of Hayshed',
    photoSlots: ['overview', 'bandFollow'],
  });
  assert('seed names rear axle', seed.includes('Axle: Rear'));
  assert('seed lists overview then band follow', seed.includes('1. Overview; 2. Band follow'));
  assert('seed has hot pressure with unit', seed.includes('32 psi (rear)'));
  assert('seed has compound', seed.includes('Pirelli SC2'));
  assert('seed has track', seed.includes('Phillip Island'));
  assert('seed keeps rider notes', seed.includes('Spun on exit of Hayshed'));
  assert('seed forbids invented wear', seed.includes('do not invent') && seed.includes('not visible in the photos'));
  assert('seed asks for photo protocol', seed.includes('zone (Z0–Z3)'));
}

{
  const seed = formatTyreWearForCoach({
    axle: 'front',
    brandCompound: '',
    hotPressure: '',
    pressureUnit: 'kPa',
    trackTemp: '',
    ambientTemp: '',
    sessionLength: '',
    warmers: 'unknown',
    photoTaken: 'unknown',
    trackName: '',
    bikeLabel: '',
    notes: '',
    photoSlots: ['overview'],
  });
  assert('unknown pressure is not invented', seed.includes('Hot pit-in pressure: unknown — do not invent'));
  assert('unknown compound is not invented', seed.includes('Brand / model / compound: unknown — do not invent'));
  assert('front axle', seed.includes('Axle: Front'));
  assert('overview only listed', seed.includes('1. Overview') && !seed.includes('Band follow'));
}

{
  const missing = missingTyreWearFacts({
    hasBandFollow: false,
    brandCompound: '',
    hotPressure: '',
    trackTemp: '',
    warmers: 'unknown',
    photoTaken: 'unknown',
  });
  assert('flags band-follow photo', missing.includes('band-follow photo'));
  assert('flags hot pressure', missing.includes('hot pit-in pressure'));
  assert('complete intake is empty', missingTyreWearFacts({
    hasBandFollow: true,
    brandCompound: 'SC2',
    hotPressure: '32',
    trackTemp: '30',
    warmers: 'no',
    photoTaken: 'hot_pit_in',
  }).length === 0);
}

if (failed) {
  console.error(`\n${failed} failing assertion(s)`);
  process.exit(1);
}
console.log('\nAll tyre-wear golden checks passed.');
