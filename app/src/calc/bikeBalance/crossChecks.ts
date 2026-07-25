import { computeBikeBalance } from './compute';
import {
  antiSquatPercent,
  frontWheelForceN,
  frontWheelRateNPerMm,
  frontWheelTravelMm,
  loadTransferAngleDeg,
  rearNormalTrailMm,
  rearWheelForceN,
  rearWheelRateNPerMm,
  springForceCentreMm,
  springRateCentreMm,
  weightSplitPct,
} from './kinematics';
import {
  forkForceFromWheelForceN,
  shockForceFromWheelForceN,
} from './positions';
import type { BikeBalanceInputs, CrossCheckItem } from './types';
import { SECTION8_EXT_EXAMPLE, SECTION8_LADEN_EXAMPLE } from './types';

function near(actual: number, expected: number, tol: number): boolean {
  return Math.abs(actual - expected) <= tol;
}

/** Run §8-style identities against current inputs + engine outputs. */
export function runCrossChecks(inputs: BikeBalanceInputs): CrossCheckItem[] {
  const results = computeBikeBalance(inputs);
  const byId = Object.fromEntries(results.map((r) => [r.equationId, r]));
  const checks: CrossCheckItem[] = [];

  if (inputs.forkTravelMm != null && inputs.rakeDeg != null) {
    const expected = frontWheelTravelMm(inputs.forkTravelMm, inputs.rakeDeg);
    const actual = byId['EQ-FW-TRAVEL-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-FW-TRAVEL',
        label: 'Fw travel = fork × cos(rake)',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-FW-TRAVEL-01',
      });
    }
  }

  if (inputs.forkRateNPerMm != null && inputs.rakeDeg != null) {
    const expected = frontWheelRateNPerMm(inputs.forkRateNPerMm, inputs.rakeDeg);
    const actual = byId['EQ-FW-RATE-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-FW-RATE',
        label: 'Fw rate = fork rate / cos²(rake)',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-FW-RATE-01',
      });
    }
  }

  if (inputs.forkForceN != null && inputs.rakeDeg != null) {
    const expected = frontWheelForceN(inputs.forkForceN, inputs.rakeDeg);
    const actual = byId['EQ-FW-FORCE-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-FW-FORCE',
        label: 'Fw force = fork force / cos(rake)',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-FW-FORCE-01',
      });
    }
  }

  if (inputs.shockForceN != null && inputs.linkRatio != null) {
    const expected = rearWheelForceN(inputs.shockForceN, inputs.linkRatio);
    const actual = byId['EQ-RW-FORCE-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-RW-FORCE',
        label: 'Rw force = shock force / link ratio',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-RW-FORCE-01',
      });
    }
  }

  if (inputs.shockRateNPerMm != null && inputs.linkRatio != null) {
    const expected = rearWheelRateNPerMm(inputs.shockRateNPerMm, inputs.linkRatio);
    const actual = byId['EQ-RW-RATE-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-RW-RATE',
        label: 'Rw rate = shock rate / link_ratio²',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-RW-RATE-01',
      });
    }
  }

  if (inputs.wheelbaseMm != null && inputs.trailMm != null && inputs.rakeDeg != null) {
    const expected = rearNormalTrailMm(inputs.wheelbaseMm, inputs.trailMm, inputs.rakeDeg);
    const actual = byId['EQ-REAR-NTRAIL-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-REAR-NTRAIL',
        label: 'Rear normal trail = (WB + trail) × cos(rake)',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-REAR-NTRAIL-01',
      });
    }
  }

  if (inputs.cogYMm != null && inputs.wheelbaseMm != null) {
    const expected = loadTransferAngleDeg(inputs.cogYMm, inputs.wheelbaseMm);
    const actual = byId['EQ-LT-ANGLE-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-LT-ANGLE',
        label: 'LT angle = atan(CoG_Y / WB)',
        expected,
        actual,
        tol: 0.02,
        pass: near(actual, expected, 0.02),
        equationId: 'EQ-LT-ANGLE-01',
      });
    }
  }

  {
    const asAngle = byId['EQ-AS-GEO-01']?.value;
    if (asAngle != null && inputs.cogYMm != null && inputs.wheelbaseMm != null) {
      const lt = loadTransferAngleDeg(inputs.cogYMm, inputs.wheelbaseMm);
      const expected = antiSquatPercent(asAngle, lt);
      const actual = byId['EQ-AS-PCT-01']?.value;
      if (actual != null) {
        checks.push({
          id: 'CHK-AS-PCT',
          label: 'AS% = tan(AS)/tan(LT)×100',
          expected,
          actual,
          tol: 0.05,
          pass: near(actual, expected, 0.05),
          equationId: 'EQ-AS-PCT-01',
        });
      }
    }
  }

  if (inputs.cogXMm != null && inputs.wheelbaseMm != null) {
    const expected = weightSplitPct(inputs.cogXMm, inputs.wheelbaseMm).rearPct;
    const actual = byId['EQ-WEIGHT-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-WEIGHT',
        label: 'R% = CoG_X / WB',
        expected,
        actual,
        tol: 0.02,
        pass: near(actual, expected, 0.02),
        equationId: 'EQ-WEIGHT-01',
      });
    }
  }

  if (
    inputs.forkRateNPerMm != null &&
    inputs.rakeDeg != null &&
    inputs.shockRateNPerMm != null &&
    inputs.linkRatio != null &&
    inputs.wheelbaseMm != null
  ) {
    const fw = frontWheelRateNPerMm(inputs.forkRateNPerMm, inputs.rakeDeg);
    const rw = rearWheelRateNPerMm(inputs.shockRateNPerMm, inputs.linkRatio);
    const expected = springRateCentreMm(fw, rw, inputs.wheelbaseMm);
    const actual = byId['EQ-SRC-01']?.value;
    if (actual != null) {
      checks.push({
        id: 'CHK-SRC',
        label: 'SRC from Fw/Rw rates',
        expected,
        actual,
        tol: 0.05,
        pass: near(actual, expected, 0.05),
        equationId: 'EQ-SRC-01',
      });
    }
  }

  return checks;
}

/** Golden assertions vs published §8 numbers (laden example). */
export function section8GoldenAssertions(): { name: string; pass: boolean; detail: string }[] {
  const i = SECTION8_LADEN_EXAMPLE;
  const out: { name: string; pass: boolean; detail: string }[] = [];

  const fwTravel = frontWheelTravelMm(i.forkTravelMm!, i.rakeDeg!);
  out.push({
    name: 'Fw travel ≈ 51.6',
    pass: near(fwTravel, 51.6, 0.2),
    detail: `${fwTravel.toFixed(3)}`,
  });

  const fwRate = frontWheelRateNPerMm(i.forkRateNPerMm!, i.rakeDeg!);
  out.push({
    name: 'Fw rate ≈ 28',
    pass: near(fwRate, 28.0, 0.2),
    detail: `${fwRate.toFixed(3)}`,
  });

  const fwForce = frontWheelForceN(i.forkForceN!, i.rakeDeg!);
  out.push({
    name: 'Fw force ≈ 1692',
    pass: near(fwForce, 1692, 5),
    detail: `${fwForce.toFixed(2)}`,
  });

  const rwForce = rearWheelForceN(i.shockForceN!, i.linkRatio!);
  out.push({
    name: 'Rw force ≈ 1798',
    pass: near(rwForce, 1798, 3),
    detail: `${rwForce.toFixed(2)}`,
  });

  const rwRate = rearWheelRateNPerMm(i.shockRateNPerMm!, i.linkRatio!);
  out.push({
    name: 'Rw rate (instantaneous MR) ≈ 24.63',
    pass: near(rwRate, 24.63, 0.15),
    detail: `${rwRate.toFixed(3)}`,
  });

  const ntrail = rearNormalTrailMm(i.wheelbaseMm!, i.trailMm!, i.rakeDeg!);
  out.push({
    name: 'Rear normal trail ≈ 1401.5',
    pass: near(ntrail, 1401.5, 0.5),
    detail: `${ntrail.toFixed(2)}`,
  });

  const lt = loadTransferAngleDeg(i.cogYMm!, i.wheelbaseMm!);
  out.push({
    name: 'LT angle ≈ 25.2°',
    pass: near(lt, 25.2, 0.05),
    detail: `${lt.toFixed(3)}`,
  });

  const asPct = antiSquatPercent(i.antiSquatAngleDeg!, lt);
  out.push({
    name: 'AS% ≈ 98.4',
    pass: near(asPct, 98.4, 0.3),
    detail: `${asPct.toFixed(3)}`,
  });

  const split = weightSplitPct(i.cogXMm!, i.wheelbaseMm!);
  out.push({
    name: 'R% ≈ 49.01',
    pass: near(split.rearPct, 49.01, 0.02),
    detail: `${split.rearPct.toFixed(3)}`,
  });

  // SRC using guide's displayed wheel rates 28 / 26
  const srcGuide = springRateCentreMm(28, 26, i.wheelbaseMm!);
  out.push({
    name: 'SRC (guide rates 28/26) ≈ 686.8',
    pass: near(srcGuide, 686.8, 0.5),
    detail: `${srcGuide.toFixed(2)}`,
  });

  const sfcGuide = springForceCentreMm(1692.3, 1798.4, i.wheelbaseMm!);
  out.push({
    name: 'SFC from guide Fw/Rw forces',
    pass: near(sfcGuide, (1798.4 / (1692.3 + 1798.4)) * 1426, 0.5),
    detail: `${sfcGuide.toFixed(2)}`,
  });

  // Ext dataset identities
  const e = SECTION8_EXT_EXAMPLE;
  const ltExt = loadTransferAngleDeg(e.cogYMm!, e.wheelbaseMm!);
  out.push({
    name: 'Ext LT angle ≈ 26.7°',
    pass: near(ltExt, 26.7, 0.1),
    detail: `${ltExt.toFixed(3)}`,
  });
  const asExt = antiSquatPercent(e.antiSquatAngleDeg!, ltExt);
  out.push({
    name: 'Ext AS% ≈ 117.4',
    pass: near(asExt, 117.4, 0.3),
    detail: `${asExt.toFixed(3)}`,
  });
  const ntrailExt = rearNormalTrailMm(e.wheelbaseMm!, e.trailMm!, e.rakeDeg!);
  out.push({
    name: 'Ext rear normal trail ≈ 1398.9',
    pass: near(ntrailExt, 1398.9, 0.5),
    detail: `${ntrailExt.toFixed(2)}`,
  });

  // Position force inverses (Static 950/950)
  const forkFromWheel = forkForceFromWheelForceN(950, 24);
  const shockFromWheel = shockForceFromWheelForceN(950, 2.07);
  out.push({
    name: 'Static preset fork force = 950×cos(24°)',
    pass: near(forkFromWheel, 950 * Math.cos((24 * Math.PI) / 180), 0.01),
    detail: `${forkFromWheel.toFixed(2)}`,
  });
  out.push({
    name: 'Static preset shock force = 950×2.07',
    pass: near(shockFromWheel, 950 * 2.07, 0.01),
    detail: `${shockFromWheel.toFixed(2)}`,
  });

  return out;
}
