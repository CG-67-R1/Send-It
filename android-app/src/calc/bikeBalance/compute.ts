import {
  antiSquatFlag,
  antiSquatFlagLabel,
  antiSquatPercent,
  frontWheelForceN,
  frontWheelRateNPerMm,
  frontWheelTravelMm,
  loadTransferAngleDeg,
  pctOfWheelbase,
  rearNormalTrailMm,
  rearWheelForceN,
  rearWheelRateNPerMm,
  rearWheelTravelMm,
  springForceCentreMm,
  springRateCentreMm,
  weightSplitPct,
} from './kinematics';
import { PUBLIC_ENGINEERING } from './citations';
import { computeAntiSquatFromGeometry } from './geometryAs';
import type { BikeBalanceInputs, CalcResult } from './types';

function geometryInputOrNull(inputs: BikeBalanceInputs) {
  const needKeys = [
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
  for (const fieldKey of needKeys) {
    if (typeof inputs[fieldKey] !== 'number' || Number.isNaN(inputs[fieldKey] as number)) return null;
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

/** Resolve AS angle: geometry mode computes; manual uses entered value. */
export function resolveAntiSquatAngle(inputs: BikeBalanceInputs): {
  angleDeg: number | null;
  fromGeometry: boolean;
  geometryError?: string;
  assumptions?: string[];
} {
  if (inputs.antiSquatAngleMode === 'geometry') {
    const geometryInputs = geometryInputOrNull(inputs);
    if (!geometryInputs) {
      return {
        angleDeg: null,
        fromGeometry: true,
        geometryError: 'Needs swingarm, CS offset, tyre radius, sprocket teeth, chain pitch, wheelbase',
      };
    }
    try {
      const antiSquatGeometry = computeAntiSquatFromGeometry(geometryInputs);
      return {
        angleDeg: antiSquatGeometry.antiSquatAngleDeg,
        fromGeometry: true,
        assumptions: antiSquatGeometry.assumptions,
      };
    } catch (error) {
      return {
        angleDeg: null,
        fromGeometry: true,
        geometryError: error instanceof Error ? error.message : String(error),
      };
    }
  }
  if (inputs.antiSquatAngleDeg == null || Number.isNaN(inputs.antiSquatAngleDeg)) {
    return { angleDeg: null, fromGeometry: false };
  }
  return { angleDeg: inputs.antiSquatAngleDeg, fromGeometry: false };
}

function need(
  inputs: BikeBalanceInputs,
  keys: (keyof BikeBalanceInputs)[]
): { ok: true; values: Record<string, number> } | { ok: false; reason: string } {
  const values: Record<string, number> = {};
  const missing: string[] = [];
  for (const key of keys) {
    const fieldValue = inputs[key];
    if (typeof fieldValue !== 'number' || Number.isNaN(fieldValue)) {
      missing.push(String(key));
    } else {
      values[String(key)] = fieldValue;
    }
  }
  if (missing.length) {
    return { ok: false, reason: `Needs input: ${missing.join(', ')}` };
  }
  return { ok: true, values };
}

function baseMeta(
  equationId: string,
  name: string,
  group: CalcResult['group'],
  unit: string,
  riderLabel: string,
  riderMeaning: string,
  formula: string,
  publicRefs: string[]
): Omit<CalcResult, 'value' | 'unavailableReason' | 'warning' | 'inputsUsed'> {
  return { equationId, name, group, unit, riderLabel, riderMeaning, formula, publicRefs };
}

/** Compute all MVP results from inputs. Missing fields → unavailable, never invented. */
export function computeBikeBalance(inputs: BikeBalanceInputs): CalcResult[] {
  const results: CalcResult[] = [];

  // EQ-FW-TRAVEL-01
  {
    const meta = baseMeta(
      'EQ-FW-TRAVEL-01',
      'Front wheel travel',
      'travel',
      'mm',
      'Front travel at the tyre',
      'How far the front tyre has moved vertically: what the road feels, not just fork stroke.',
      'Fw_travel = fork_travel x cos(rake)',
      [PUBLIC_ENGINEERING.forkRakeWheelTravel]
    );
    const req = need(inputs, ['forkTravelMm', 'rakeDeg']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      results.push({
        ...meta,
        value: frontWheelTravelMm(req.values.forkTravelMm, req.values.rakeDeg),
        inputsUsed: req.values,
      });
    }
  }

  // EQ-FW-RATE-01
  {
    const meta = baseMeta(
      'EQ-FW-RATE-01',
      'Front wheel rate',
      'rates',
      'N/mm',
      'Front stiffness at the tyre',
      'The spring rate the front tyre feels. Geometry changes can move this even without changing springs.',
      'Fw_rate = fork_rate / cos^2(rake)',
      [PUBLIC_ENGINEERING.forkRakeWheelRate]
    );
    const req = need(inputs, ['forkRateNPerMm', 'rakeDeg']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      results.push({
        ...meta,
        value: frontWheelRateNPerMm(req.values.forkRateNPerMm, req.values.rakeDeg),
        inputsUsed: req.values,
      });
    }
  }

  // EQ-FW-FORCE-01
  {
    const meta = baseMeta(
      'EQ-FW-FORCE-01',
      'Front wheel force',
      'rates',
      'N',
      'Front load from springs',
      'Vertical spring force at the front contact. Sanity-check against corner weights.',
      'Fw_force = fork_force / cos(rake)',
      [PUBLIC_ENGINEERING.forkRakeWheelForce]
    );
    const req = need(inputs, ['forkForceN', 'rakeDeg']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      results.push({
        ...meta,
        value: frontWheelForceN(req.values.forkForceN, req.values.rakeDeg),
        inputsUsed: req.values,
      });
    }
  }

  // EQ-RW-TRAVEL-01
  {
    const meta = baseMeta(
      'EQ-RW-TRAVEL-01',
      'Rear wheel travel',
      'travel',
      'mm',
      'Rear travel at the tyre',
      'Vertical rear wheel movement for the current shock stroke and linkage ratio.',
      'Rw_travel = shock_travel x link_ratio',
      [PUBLIC_ENGINEERING.linkageMotionRatioTravel]
    );
    const req = need(inputs, ['shockTravelMm', 'linkRatio']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      results.push({
        ...meta,
        value: rearWheelTravelMm(req.values.shockTravelMm, req.values.linkRatio),
        inputsUsed: req.values,
      });
    }
  }

  // EQ-RW-FORCE-01
  {
    const meta = baseMeta(
      'EQ-RW-FORCE-01',
      'Rear wheel force',
      'rates',
      'N',
      'Rear load from springs',
      'Vertical spring force at the rear contact after the linkage.',
      'Rw_force = shock_force / link_ratio',
      [PUBLIC_ENGINEERING.linkageMotionRatioForce]
    );
    const req = need(inputs, ['shockForceN', 'linkRatio']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      results.push({
        ...meta,
        value: rearWheelForceN(req.values.shockForceN, req.values.linkRatio),
        inputsUsed: req.values,
      });
    }
  }

  // EQ-RW-RATE-01
  let rwRate: number | null = null;
  {
    const meta = baseMeta(
      'EQ-RW-RATE-01',
      'Rear wheel rate',
      'rates',
      'N/mm',
      'Rear stiffness at the tyre',
      'The spring rate the rear tyre feels. Linkage ratio enters squared.',
      'Rw_rate = shock_rate / link_ratio^2',
      [PUBLIC_ENGINEERING.linkageMotionRatioRate]
    );
    const req = need(inputs, ['shockRateNPerMm', 'linkRatio']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      rwRate = rearWheelRateNPerMm(req.values.shockRateNPerMm, req.values.linkRatio);
      results.push({ ...meta, value: rwRate, inputsUsed: req.values });
    }
  }

  let fwRate: number | null = null;
  const fwRateResult = results.find((result) => result.equationId === 'EQ-FW-RATE-01');
  if (fwRateResult?.value != null) fwRate = fwRateResult.value;

  // EQ-REAR-NTRAIL-01
  {
    const meta = baseMeta(
      'EQ-REAR-NTRAIL-01',
      'Rear normal trail',
      'geometry',
      'mm',
      'Rear steering influence',
      'How strongly rear lateral force can steer the chassis (rear-steer effect).',
      'rear_normal_trail = (WB + trail) x cos(rake)',
      [PUBLIC_ENGINEERING.rearNormalTrail]
    );
    const req = need(inputs, ['wheelbaseMm', 'trailMm', 'rakeDeg']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      results.push({
        ...meta,
        value: rearNormalTrailMm(req.values.wheelbaseMm, req.values.trailMm, req.values.rakeDeg),
        inputsUsed: req.values,
      });
    }
  }

  // EQ-LT-ANGLE-01
  let ltAngle: number | null = null;
  {
    const meta = baseMeta(
      'EQ-LT-ANGLE-01',
      'Load-transfer angle',
      'antiSquat',
      'deg',
      'Acceleration squat demand',
      'How hard throttle tries to squat the rear, from mass height over wheelbase.',
      'LT_angle = atan(CoG_Y / WB)',
      [PUBLIC_ENGINEERING.loadTransferAngle]
    );
    const req = need(inputs, ['cogYMm', 'wheelbaseMm']);
    if (!req.ok) {
      results.push({ ...meta, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      ltAngle = loadTransferAngleDeg(req.values.cogYMm, req.values.wheelbaseMm);
      results.push({ ...meta, value: ltAngle, inputsUsed: req.values });
    }
  }

  // EQ-AS-GEO-01 + EQ-AS-PCT-01 + EQ-AS-FLAG-01
  {
    const resolved = resolveAntiSquatAngle(inputs);
    const geoMeta = baseMeta(
      'EQ-AS-GEO-01',
      'Anti-squat angle',
      'antiSquat',
      'deg',
      'Anti-squat angle',
      resolved.fromGeometry
        ? 'From swingarm and top chain run (IFC). Pure geometry. Preferred when CoG is estimated.'
        : 'Manual anti-squat angle (workshop or other analysis). Switch mode to Geometry to compute from layout.',
      resolved.fromGeometry
        ? 'AS_angle = atan2(IFC_y, WB - IFC_x); IFC = swingarm intersect top chain tangent'
        : 'AS_angle = user-entered',
      [PUBLIC_ENGINEERING.antiSquatIfc]
    );

    if (resolved.fromGeometry) {
      if (resolved.angleDeg == null) {
        results.push({
          ...geoMeta,
          value: null,
          unavailableReason: resolved.geometryError ?? 'Geometry incomplete',
          inputsUsed: {},
        });
      } else {
        results.push({
          ...geoMeta,
          value: resolved.angleDeg,
          inputsUsed: {
            wheelbaseMm: inputs.wheelbaseMm!,
            swingarmLengthMm: inputs.swingarmLengthMm!,
            swingarmAngleDeg: inputs.swingarmAngleDeg!,
          },
          warning: resolved.assumptions?.length
            ? 'See Sources for geometry assumptions (tangent chain model).'
            : undefined,
        });
      }
    } else if (resolved.angleDeg == null) {
      results.push({
        ...geoMeta,
        value: null,
        unavailableReason: 'Needs input: antiSquatAngleDeg (or switch to Geometry mode)',
        inputsUsed: {},
      });
    } else {
      results.push({
        ...geoMeta,
        value: resolved.angleDeg,
        inputsUsed: { antiSquatAngleDeg: resolved.angleDeg },
      });
    }

    const asAngle = resolved.angleDeg;
    const meta = baseMeta(
      'EQ-AS-PCT-01',
      'Anti-squat percent',
      'antiSquat',
      '%',
      'Throttle squat vs extend',
      'Near 100% holds rear height under drive; under 100% squats; over 100% extends.',
      'AS% = tan(AS_angle) / tan(LT_angle) x 100',
      [PUBLIC_ENGINEERING.antiSquatPercent]
    );
    const flagMeta = baseMeta(
      'EQ-AS-FLAG-01',
      'Accel squat / extend',
      'antiSquat',
      '',
      'Throttle: squat or extend?',
      'Quick read of anti-squat %: Extend when >100%, Squat when <100%, Hold near 100%.',
      'flag = sign(AS% - 100)',
      [PUBLIC_ENGINEERING.asFlag]
    );

    if (asAngle == null) {
      results.push({
        ...meta,
        value: null,
        unavailableReason: resolved.geometryError ?? 'Needs anti-squat angle',
        inputsUsed: {},
      });
      results.push({
        ...flagMeta,
        value: null,
        unavailableReason: resolved.geometryError ?? 'Needs anti-squat angle',
        inputsUsed: {},
      });
    } else if (ltAngle == null) {
      results.push({
        ...meta,
        value: null,
        unavailableReason: 'Needs input: cogYMm, wheelbaseMm (for LT angle)',
        inputsUsed: {},
      });
      results.push({
        ...flagMeta,
        value: null,
        unavailableReason: 'Needs input: cogYMm, wheelbaseMm (for LT angle)',
        inputsUsed: {},
      });
    } else {
      const warning =
        inputs.cogProvenance !== 'measured'
          ? 'CoG is not marked measured. Prefer anti-squat angle (EQ-AS-GEO-01) over % until CoG is verified.'
          : undefined;
      const asPct = antiSquatPercent(asAngle, ltAngle);
      results.push({
        ...meta,
        value: asPct,
        warning,
        inputsUsed: {
          antiSquatAngleDeg: asAngle,
          ltAngleDeg: ltAngle,
        },
      });

      const flag = antiSquatFlag(asPct);
      results.push({
        ...flagMeta,
        value: flag,
        riderMeaning: `${antiSquatFlagLabel(flag)} under acceleration (from AS ${asPct.toFixed(1)}%).`,
        inputsUsed: { asPct: asPct, flag },
        warning,
      });
    }
  }

  // EQ-WEIGHT-01 rear + EQ-WEIGHT-F-01 front
  {
    const metaR = baseMeta(
      'EQ-WEIGHT-01',
      'Rear weight share',
      'mass',
      '%',
      'Rear weight share',
      'Static rear axle load share. Drive-grip side of the split.',
      'R% = CoG_X / WB x 100',
      [PUBLIC_ENGINEERING.weightSplit]
    );
    const metaF = baseMeta(
      'EQ-WEIGHT-F-01',
      'Front weight share',
      'mass',
      '%',
      'Front weight share',
      'Static front axle load share. Front-biased setups aid turn-in confidence.',
      'F% = 100 - R%',
      [PUBLIC_ENGINEERING.weightSplit]
    );
    const req = need(inputs, ['cogXMm', 'wheelbaseMm']);
    if (!req.ok) {
      results.push({ ...metaR, value: null, unavailableReason: req.reason, inputsUsed: {} });
      results.push({ ...metaF, value: null, unavailableReason: req.reason, inputsUsed: {} });
    } else {
      const split = weightSplitPct(req.values.cogXMm, req.values.wheelbaseMm);
      results.push({
        ...metaR,
        value: split.rearPct,
        riderMeaning: `Rear ${split.rearPct.toFixed(2)}%, Front ${split.frontPct.toFixed(2)}%.`,
        inputsUsed: req.values,
      });
      results.push({
        ...metaF,
        value: split.frontPct,
        riderMeaning: `Front ${split.frontPct.toFixed(2)}%, Rear ${split.rearPct.toFixed(2)}%.`,
        inputsUsed: req.values,
      });
    }
  }

  // EQ-SRC-01 + EQ-SRC-PCT-01
  let srcMm: number | null = null;
  {
    const meta = baseMeta(
      'EQ-SRC-01',
      'Spring rate centre',
      'rates',
      'mm',
      'Spring balance point',
      'Where combined wheel-rate stiffness is centred. Compare to CoG X for pitch balance.',
      'SRC = Rw_rate / (Fw_rate + Rw_rate) x WB',
      [PUBLIC_ENGINEERING.springRateCentre]
    );
    if (fwRate == null || rwRate == null || inputs.wheelbaseMm == null) {
      results.push({
        ...meta,
        value: null,
        unavailableReason: 'Needs input: forkRateNPerMm, rakeDeg, shockRateNPerMm, linkRatio, wheelbaseMm',
        inputsUsed: {},
      });
    } else {
      srcMm = springRateCentreMm(fwRate, rwRate, inputs.wheelbaseMm);
      results.push({
        ...meta,
        value: srcMm,
        inputsUsed: { fwRate, rwRate, wheelbaseMm: inputs.wheelbaseMm },
      });
      results.push({
        ...baseMeta(
          'EQ-SRC-PCT-01',
          'Spring rate centre %',
          'rates',
          '% WB',
          'Spring balance (% of wheelbase)',
          'SRC as % of wheelbase. Compare directly with CoG X %.',
          'SRC% = SRC / WB x 100',
          [PUBLIC_ENGINEERING.springRateCentre]
        ),
        value: pctOfWheelbase(srcMm, inputs.wheelbaseMm),
        inputsUsed: { srcMm, wheelbaseMm: inputs.wheelbaseMm },
      });
    }
  }

  // EQ-SFC-01 — spring force centre from computed wheel forces
  {
    const meta = baseMeta(
      'EQ-SFC-01',
      'Spring force centre',
      'rates',
      'mm',
      'Load balance point (now)',
      'Where current front/rear wheel spring forces balance. In static, should sit near CoG X. Divergence hints preload imbalance.',
      'SFC = Rw_force / (Fw_force + Rw_force) x WB',
      [PUBLIC_ENGINEERING.springForceCentre]
    );
    const fwForce = results.find((result) => result.equationId === 'EQ-FW-FORCE-01')?.value ?? null;
    const rwForce = results.find((result) => result.equationId === 'EQ-RW-FORCE-01')?.value ?? null;
    if (fwForce == null || rwForce == null || inputs.wheelbaseMm == null) {
      results.push({
        ...meta,
        value: null,
        unavailableReason: 'Needs fork/shock force, rake, link ratio, wheelbase',
        inputsUsed: {},
      });
    } else {
      const sfc = springForceCentreMm(fwForce, rwForce, inputs.wheelbaseMm);
      let warning: string | undefined;
      if (inputs.cogXMm != null) {
        const drift = Math.abs(sfc - inputs.cogXMm);
        if (drift > 20) {
          warning = `SFC is ${drift.toFixed(0)} mm from CoG X. Check preload balance / position.`;
        }
      }
      results.push({
        ...meta,
        value: sfc,
        warning,
        inputsUsed: { fwForce, rwForce, wheelbaseMm: inputs.wheelbaseMm },
      });
    }
  }

  // Lean context note (not a formula change without leaned geometry inputs)
  if (inputs.leanDeg !== 0) {
    const trail = results.find((result) => result.equationId === 'EQ-REAR-NTRAIL-01');
    if (trail && trail.value != null) {
      trail.warning =
        (trail.warning ? `${trail.warning} ` : '') +
        `Lean context ${inputs.leanDeg} deg. Effective trail/WB change with lean. Enter leaned geometry when available.`;
    }
  }

  return results;
}

export function formatBikeBalanceForAi(inputs: BikeBalanceInputs, results: CalcResult[]): string {
  const lines: string[] = [
    'Bike Balance Setup (engine outputs; do not invent replacement numbers):',
    `Bike: ${inputs.name}`,
    `Position: ${inputs.position}, Lean: ${inputs.leanDeg} deg`,
    `CoG provenance: ${inputs.cogProvenance}`,
    '',
    'Inputs:',
  ];
  lines.push(`Anti-squat mode: ${inputs.antiSquatAngleMode}`);
  const resolved = resolveAntiSquatAngle(inputs);
  if (resolved.angleDeg != null) {
    lines.push(`Anti-squat angle (effective): ${resolved.angleDeg.toFixed(3)} deg`);
  }
  const inputEntries: [string, number | null][] = [
    ['rakeDeg', inputs.rakeDeg],
    ['trailMm', inputs.trailMm],
    ['wheelbaseMm', inputs.wheelbaseMm],
    ['forkTravelMm', inputs.forkTravelMm],
    ['shockTravelMm', inputs.shockTravelMm],
    ['forkRateNPerMm', inputs.forkRateNPerMm],
    ['shockRateNPerMm', inputs.shockRateNPerMm],
    ['linkRatio', inputs.linkRatio],
    ['forkForceN', inputs.forkForceN],
    ['shockForceN', inputs.shockForceN],
    ['cogXMm', inputs.cogXMm],
    ['cogYMm', inputs.cogYMm],
    ['antiSquatAngleDeg', inputs.antiSquatAngleDeg],
    ['rearTyreRadiusMm', inputs.rearTyreRadiusMm],
    ['swingarmLengthMm', inputs.swingarmLengthMm],
    ['swingarmAngleDeg', inputs.swingarmAngleDeg],
    ['csFromPivotXMm', inputs.csFromPivotXMm],
    ['csFromPivotYMm', inputs.csFromPivotYMm],
    ['frontSprocketTeeth', inputs.frontSprocketTeeth],
    ['rearSprocketTeeth', inputs.rearSprocketTeeth],
    ['chainPitchMm', inputs.chainPitchMm],
  ];
  for (const [fieldKey, fieldValue] of inputEntries) {
    if (fieldValue != null) lines.push(`- ${fieldKey}: ${fieldValue}`);
  }
  lines.push('', 'Results:');
  for (const result of results) {
    if (result.value == null) {
      lines.push(`- ${result.equationId} ${result.name}: unavailable (${result.unavailableReason ?? 'n/a'})`);
    } else if (result.equationId === 'EQ-AS-FLAG-01') {
      lines.push(`- ${result.equationId} ${result.name}: ${antiSquatFlagLabel(result.value)}`);
    } else {
      lines.push(
        `- ${result.equationId} ${result.name}: ${result.value.toFixed(3)} ${result.unit}${result.warning ? ` [${result.warning}]` : ''}`
      );
    }
  }
  return lines.join('\n');
}
