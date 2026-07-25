/**
 * Citable Markdown report for legitimacy / sharing.
 */

import { computeBikeBalance, formatBikeBalanceForAi } from './compute';
import { computeAntiSquatFromGeometry } from './geometryAs';
import { runCrossChecks } from './crossChecks';
import { antiSquatFlagLabel } from './kinematics';
import type { BikeBalanceInputs, CalcResult } from './types';

function fmt(r: CalcResult): string {
  if (r.value == null) return `unavailable (${r.unavailableReason ?? 'n/a'})`;
  if (r.equationId === 'EQ-AS-FLAG-01') return antiSquatFlagLabel(r.value);
  return `${r.value.toFixed(3)} ${r.unit}`.trim();
}

export function buildCitableReport(
  inputs: BikeBalanceInputs,
  refInputs: BikeBalanceInputs | null
): string {
  const results = computeBikeBalance(inputs);
  const refResults = refInputs ? computeBikeBalance(refInputs) : null;
  const refMap = new Map((refResults ?? []).map((r) => [r.equationId, r]));
  const checks = runCrossChecks(inputs);

  const lines: string[] = [
    '# Bike Balance Setup — citable report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Setup: ${inputs.name}`,
    `Position: ${inputs.position} · Lean: ${inputs.leanDeg}°`,
    `CoG provenance: ${inputs.cogProvenance}`,
    `Anti-squat mode: ${inputs.antiSquatAngleMode}`,
    '',
    '> Informational setup aid only. Not affiliated with Zero Chassis Software.',
    '> Prefer Ref→proposal deltas. Safety-critical work: qualified technician.',
    '',
    '## Results',
    '',
    '| ID | Name | Value | Δ vs Ref |',
    '|----|------|------:|---------:|',
  ];

  for (const r of results) {
    const ref = refMap.get(r.equationId);
    let delta = '—';
    if (r.value != null && ref?.value != null && r.equationId !== 'EQ-AS-FLAG-01') {
      const d = r.value - ref.value;
      delta = `${d >= 0 ? '+' : ''}${d.toFixed(3)}`;
    }
    lines.push(`| ${r.equationId} | ${r.name} | ${fmt(r)} | ${delta} |`);
  }

  lines.push('', '## Equations & sources', '');
  for (const r of results) {
    lines.push(`### ${r.equationId} — ${r.name}`);
    lines.push(`- Formula: \`${r.formula}\``);
    lines.push(`- Value: ${fmt(r)}`);
    if (r.warning) lines.push(`- Warning: ${r.warning}`);
    for (const ref of r.publicRefs) lines.push(`- Ref: ${ref}`);
    const used = Object.entries(r.inputsUsed)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    if (used) lines.push(`- Inputs used: ${used}`);
    lines.push('');
  }

  if (inputs.antiSquatAngleMode === 'geometry') {
    lines.push('## Anti-squat geometry', '');
    try {
      const g = requireGeometry(inputs);
      if (g) {
        const as = computeAntiSquatFromGeometry(g);
        lines.push(`- Computed AS angle: ${as.antiSquatAngleDeg.toFixed(3)}°`);
        lines.push(`- IFC: (${as.ifc.x.toFixed(2)}, ${as.ifc.y.toFixed(2)}) mm`);
        lines.push(`- Pivot: (${as.pivot.x.toFixed(2)}, ${as.pivot.y.toFixed(2)}) mm`);
        lines.push('- Assumptions:');
        for (const a of as.assumptions) lines.push(`  - ${a}`);
      } else {
        lines.push('- Geometry inputs incomplete.');
      }
    } catch (e) {
      lines.push(`- Geometry error: ${e instanceof Error ? e.message : String(e)}`);
    }
    lines.push('');
  }

  lines.push('## Cross-checks', '');
  if (!checks.length) {
    lines.push('- None runnable with current inputs.');
  } else {
    for (const c of checks) {
      lines.push(
        `- ${c.pass ? 'PASS' : 'FAIL'} ${c.id}: ${c.label} (actual ${c.actual.toFixed(3)}, expected ${c.expected.toFixed(3)}, tol ${c.tol})`
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
  for (const k of keys) {
    const v = inputs[k];
    if (typeof v !== 'number' || Number.isNaN(v)) return null;
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
