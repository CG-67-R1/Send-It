/**
 * Runnable golden tests for Bike Balance §8 identities + v0.3 geometry/travels.
 * Run: npm run test:bike-balance (from app/)
 */
import {
  GEOMETRY_AS_FIXTURE,
  R6_2020_PUBLIC_CHASSIS,
  SECTION8_LADEN_EXAMPLE,
  applyPositionPreset,
  buildCitableReport,
  computeAntiSquatFromGeometry,
  computeBikeBalance,
  createR6_2020StartingInputs,
  getDataGuideProgress,
  rememberTravelsForPosition,
  section8GoldenAssertions,
  type BikeBalanceInputs,
} from '../index';

let failed = 0;
const assertions = section8GoldenAssertions();
for (const a of assertions) {
  const mark = a.pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${a.name}  (${a.detail})`);
  if (!a.pass) failed += 1;
}

const results = computeBikeBalance(SECTION8_LADEN_EXAMPLE);
const unavailable = results.filter((r) => r.value == null);
if (unavailable.length) {
  console.log('FAIL  laden example should compute all outputs');
  for (const u of unavailable) console.log(`  - ${u.equationId}: ${u.unavailableReason}`);
  failed += 1;
} else {
  console.log(`PASS  computeBikeBalance returns ${results.length} results`);
}

const requiredIds = [
  'EQ-SFC-01',
  'EQ-SRC-PCT-01',
  'EQ-WEIGHT-F-01',
  'EQ-AS-FLAG-01',
  'EQ-AS-GEO-01',
];
for (const id of requiredIds) {
  const hit = results.find((r) => r.equationId === id);
  if (!hit || hit.value == null) {
    console.log(`FAIL  missing ${id}`);
    failed += 1;
  } else {
    console.log(`PASS  ${id} = ${hit.value}`);
  }
}

// Geometry AS self-consistency
{
  const geometryInputs = {
    wheelbaseMm: GEOMETRY_AS_FIXTURE.wheelbaseMm!,
    rearTyreRadiusMm: GEOMETRY_AS_FIXTURE.rearTyreRadiusMm!,
    swingarmLengthMm: GEOMETRY_AS_FIXTURE.swingarmLengthMm!,
    swingarmAngleDeg: GEOMETRY_AS_FIXTURE.swingarmAngleDeg!,
    csFromPivotXMm: GEOMETRY_AS_FIXTURE.csFromPivotXMm!,
    csFromPivotYMm: GEOMETRY_AS_FIXTURE.csFromPivotYMm!,
    frontSprocketTeeth: GEOMETRY_AS_FIXTURE.frontSprocketTeeth!,
    rearSprocketTeeth: GEOMETRY_AS_FIXTURE.rearSprocketTeeth!,
    chainPitchMm: GEOMETRY_AS_FIXTURE.chainPitchMm!,
  };
  const direct = computeAntiSquatFromGeometry(geometryInputs);
  const viaEngine = computeBikeBalance(GEOMETRY_AS_FIXTURE).find((r) => r.equationId === 'EQ-AS-GEO-01');
  if (!viaEngine?.value || Math.abs(viaEngine.value - direct.antiSquatAngleDeg) > 1e-9) {
    console.log('FAIL  geometry AS engine != direct');
    failed += 1;
  } else {
    console.log(`PASS  geometry AS angle = ${direct.antiSquatAngleDeg.toFixed(3)}°`);
  }
  if (!(direct.antiSquatAngleDeg > 5 && direct.antiSquatAngleDeg < 60)) {
    console.log(`FAIL  geometry AS angle out of plausible range (${direct.antiSquatAngleDeg})`);
    failed += 1;
  } else {
    console.log('PASS  geometry AS angle in plausible superbike window');
  }
}

// Per-position travels
{
  let bike: BikeBalanceInputs = {
    ...SECTION8_LADEN_EXAMPLE,
    position: 'static',
    forkTravelMm: 56.6,
    shockTravelMm: 21,
  };
  bike = rememberTravelsForPosition(bike);
  const toBrake = applyPositionPreset(bike, 'braking');
  // After leaving static, static slot should retain 56.6/21; braking may keep prior if empty
  const back = applyPositionPreset(toBrake.inputs, 'static');
  if (back.inputs.forkTravelMm !== 56.6 || back.inputs.shockTravelMm !== 21) {
    console.log(
      `FAIL  travels round-trip static (${back.inputs.forkTravelMm}/${back.inputs.shockTravelMm})`
    );
    failed += 1;
  } else {
    console.log('PASS  per-position travels round-trip static → brake → static');
  }
}

// Export
{
  const reportMarkdown = buildCitableReport(SECTION8_LADEN_EXAMPLE, null);
  if (!reportMarkdown.includes('EQ-AS-PCT-01') || !reportMarkdown.includes('citable report')) {
    console.log('FAIL  citable report missing expected content');
    failed += 1;
  } else {
    console.log('PASS  citable report builds');
  }
}

// R6 public chassis guide shell
{
  const r6 = createR6_2020StartingInputs();
  const okChassis =
    r6.rakeDeg === R6_2020_PUBLIC_CHASSIS.rakeDeg &&
    r6.trailMm === R6_2020_PUBLIC_CHASSIS.trailMm &&
    r6.wheelbaseMm === R6_2020_PUBLIC_CHASSIS.wheelbaseMm;
  const workshopEmpty =
    r6.forkTravelMm == null &&
    r6.shockTravelMm == null &&
    r6.forkRateNPerMm == null &&
    r6.linkRatio == null &&
    r6.cogXMm == null &&
    r6.antiSquatAngleDeg == null &&
    r6.swingarmLengthMm == null;
  if (!okChassis) {
    console.log('FAIL  R6 shell missing public chassis numbers');
    failed += 1;
  } else if (!workshopEmpty) {
    console.log('FAIL  R6 shell must leave workshop fields blank');
    failed += 1;
  } else {
    console.log('PASS  R6 public chassis shell prefills only OEM numbers');
  }

  const progress = getDataGuideProgress(r6);
  if (progress.completeCount < 1) {
    console.log('FAIL  R6 shell should complete chassis step');
    failed += 1;
  } else {
    console.log(
      `PASS  R6 guide progress ${progress.completeCount}/${progress.totalSteps} after public shell`
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nAll bike-balance golden tests passed.');
