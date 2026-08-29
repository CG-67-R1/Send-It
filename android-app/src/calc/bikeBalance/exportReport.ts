/**
 * Citable report for legitimacy / sharing.
 */

import { computeBikeBalance, formatBikeBalanceForAi } from './compute';
import { computeAntiSquatFromGeometry } from './geometryAs';
import { runCrossChecks } from './crossChecks';
import { antiSquatFlagLabel } from './kinematics';
import type { BikeBalanceInputs, CalcResult } from './types';

function formatCalcResult(result: CalcResult): string {
  if (result.value == null) return `unavailable (${result.unavailableReason ?? 'n/a'})`;
  if (result.equationId === 'EQ-AS-FLAG-01') return antiSquatFlagLabel(result.value);
  return `${result.value.toFixed(3)} ${result.unit}`.trim();
}

export function buildCitableReport(
  inputs: BikeBalanceInputs,
  refInputs: BikeBalanceInputs | null
): string {
  const results = computeBikeBalance(inputs);
  const refResults = refInputs ? computeBikeBalance(refInputs) : null;
  const refMap = new Map((refResults ?? []).map((result) => [result.equationId, result]));
  const checks = runCrossChecks(inputs);

  const lines: string[] = [
    '# Bike Balance Setup citable report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Setup: ${inputs.name}`,
    `Position: ${inputs.position}, Lean: ${inputs.leanDeg} deg`,
    `CoG provenance: ${inputs.cogProvenance}`,
    `Anti-squat mode: ${inputs.antiSquatAngleMode}`,
    '',
    'Informational setup aid only. Sources are published books, journals, or public OEM documentation.',
    'Prefer Ref to proposal deltas. Safety-critical work: qualified technician.',
    '',
    '## Results',
    '',
    '| ID | Name | Value | delta vs Ref |',
    '|----|------|------:|---------:|',
  ];

  for (const result of results) {
    const ref = refMap.get(result.equationId);
    let delta = '-';
    if (result.value != null && ref?.value != null && result.equationId !== 'EQ-AS-FLAG-01') {
      const deltaValue = result.value - ref.value;
      delta = `${deltaValue >= 0 ? '+' : ''}${deltaValue.toFixed(3)}`;
    }
    lines.push(`| ${result.equationId} | ${result.name} | ${formatCalcResult(result)} | ${delta} |`);
  }

  lines.push('', '## Equations and sources', '');
  for (const result of results) {
    lines.push(`### ${result.equationId}: ${result.name}`);
    lines.push(`- Formula: \`${result.formula}\``);
    lines.push(`- Value: ${formatCalcResult(result)}`);
    if (result.warning) lines.push(`- Warning: ${result.warning}`);
    for (const ref of result.publicRefs) lines.push(`- Ref: ${ref}`);
    const used = Object.entries(result.inputsUsed)
      .map(([fieldKey, fieldValue]) => `${fieldKey}=${fieldValue}`)
      .join(', ');
    if (used) lines.push(`- Inputs used: ${used}`);
    lines.push('');
  }

  if (inputs.antiSquatAngleMode === 'geometry') {
    lines.push('## Anti-squat geometry', '');
    try {
      const geometryInputs = requireGeometry(inputs);
      if (geometryInputs) {
        const antiSquatGeometry = computeAntiSquatFromGeometry(geometryInputs);
        lines.push(`- Computed AS angle: ${antiSquatGeometry.antiSquatAngleDeg.toFixed(3)} deg`);
        lines.push(`- IFC: (${antiSquatGeometry.ifc.x.toFixed(2)}, ${antiSquatGeometry.ifc.y.toFixed(2)}) mm`);
        lines.push(`- Pivot: (${antiSquatGeometry.pivot.x.toFixed(2)}, ${antiSquatGeometry.pivot.y.toFixed(2)}) mm`);
        lines.push('- Assumptions:');
        for (const assumption of antiSquatGeometry.assumptions) lines.push(`  - ${assumption}`);
      } else {
        lines.push('- Geometry inputs incomplete.');
      }
    } catch (error) {
      lines.push(`- Geometry error: ${error instanceof Error ? error.message : String(error)}`);
    }
    lines.push('');
  }

  lines.push('## Cross-checks', '');
  if (!checks.length) {
    lines.push('- None runnable with current inputs.');
  } else {
    for (const check of checks) {
      lines.push(
        `- ${check.pass ? 'PASS' : 'FAIL'} ${check.id}: ${check.label} (actual ${check.actual.toFixed(3)}, expected ${check.expected.toFixed(3)}, tol ${check.tol})`
      );
    }
  }

  lines.push('', '## Machine handoff block', '', '```');
  lines.push(formatBikeBalanceForAi(inputs, results));
  lines.push('```', '');
  return lines.join('\n');
}

function requireGeometry(inputs: BikeBalanceInputs) {
  const keys = [
    'wheelbaseMm',
    'rearTyreRadiusMm',
    'swingarmLengthMm',
    'swingarmAngleDeg',
    'csFromPivotXMm',
    'csFromPivotYMm',
    'frontSprocketTeeth',
    'rearSprocketTeeth',
    'chainPitchMm',
  ] as const;
  for (const fieldKey of keys) {
    const fieldValue = inputs[fieldKey];
    if (typeof fieldValue !== 'number' || Number.isNaN(fieldValue)) return null;
  }
  return {
    wheelbaseMm: inputs.wheelbaseMm!,
    rearTyreRadiusMm: inputs.rearTyreRadiusMm!,
    swingarmLengthMm: inputs.swingarmLengthMm!,
    swingarmAngleDeg: inputs.swingarmAngleDeg!,
    csFromPivotXMm: inputs.csFromPivotXMm!,
    csFromPivotYMm: inputs.csFromPivotYMm!,
    frontSprocketTeeth: inputs.frontSprocketTeeth!,
    rearSprocketTeeth: inputs.rearSprocketTeeth!,
    chainPitchMm: inputs.chainPitchMm!,
  };
}
