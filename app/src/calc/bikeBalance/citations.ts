/**
 * Allowed user-facing citations for Bike Balance Setup.
 * Policy: published books/journals or publicly accessible OEM documentation only.
 */

export const PUBLIC_BOOKS = {
  cossalterMotorcycleDynamics:
    'Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.). ISBN 978-1-4303-0861-4.',
  foaleMotorcycleHandling:
    'Foale, T. (2006). Motorcycle Handling and Chassis Design: The Art and Science (2nd ed.). ISBN 978-84-933354-3-4.',
} as const;

export const PUBLIC_OEM_DOCS = {
  yamahaYzfR6_2020Chassis:
    'Yamaha Motor Co. public product / dealer technical specifications for YZF-R6 (2020 model year): rake, trail, wheelbase, tyre sizes.',
} as const;

/** Equation-related sources. Math symbols allowed; prose stays plain. */
export const PUBLIC_ENGINEERING = {
  forkRakeWheelTravel:
    'Public motorcycle kinematics: Fw_travel = fork_travel x cos(rake). See Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.).',
  forkRakeWheelRate:
    'Public suspension kinematics: Fw_rate = fork_rate / cos^2(rake). See Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.).',
  forkRakeWheelForce:
    'Public force resolution: Fw_force = fork_force / cos(rake). See Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.).',
  linkageMotionRatioForce:
    'Public linkage kinematics: Rw_force = shock_force / motion_ratio.',
  linkageMotionRatioRate:
    'Public linkage kinematics: Rw_rate = shock_rate / (motion_ratio)^2.',
  linkageMotionRatioTravel:
    'Public linkage kinematics: Rw_travel = shock_travel x motion_ratio.',
  rearNormalTrail:
    'Public steering geometry: rear_normal_trail = (wheelbase + trail) x cos(rake). See Foale, T. (2006). Motorcycle Handling and Chassis Design (2nd ed.); Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.).',
  loadTransferAngle:
    'Public load-transfer geometry: LT_angle = atan(CoG_height / wheelbase). See Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.); Foale, T. (2006). Motorcycle Handling and Chassis Design (2nd ed.).',
  antiSquatIfc:
    'Public anti-squat / IFC construction (swingarm line intersect chain force line). See Foale, T. (2006). Motorcycle Handling and Chassis Design (2nd ed.); Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.).',
  antiSquatPercent:
    'Public anti-squat definition: AS% = tan(AS_angle) / tan(LT_angle) x 100. See Foale, T. (2006). Motorcycle Handling and Chassis Design (2nd ed.); Cossalter, V. (2006). Motorcycle Dynamics (2nd ed.).',
  weightSplit:
    'Public statics: axle load share from horizontal CoG position along wheelbase.',
  springRateCentre:
    'Public spring-balance definition: SRC = Rw_rate / (Fw_rate + Rw_rate) x wheelbase.',
  springForceCentre:
    'Public force-balance definition: SFC = Rw_force / (Fw_force + Rw_force) x wheelbase.',
  asFlag:
    'Derived flag from AS%: extend if AS% > 100, squat if AS% < 100.',
} as const;

export const CITATION_POLICY =
  'Bike Balance Setup may cite only published books, journals, or publicly accessible OEM documentation.';
