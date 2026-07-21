export type HotspotKind = 'measure' | 'adjust';

export type BikeSetupHotspot = {
  id: string;
  kind: HotspotKind;
  /** Center X as % of diagram width (0–100). */
  xPct: number;
  /** Center Y as % of diagram height (0–100). */
  yPct: number;
  title: string;
  summary: string;
  roadBase: string;
  trackBase: string;
  capabilityNote: string;
  aiPrompt: string;
};

export const BIKE_SETUP_INTRO = {
  whyBase:
    'A base setting gives you a known, repeatable starting point for performance riding. Dial sag and damping to a sensible baseline first, then change one thing at a time so you can feel what actually helps.',
  capabilityCaveat:
    'Not every bike has every adjuster shown here. Many road bikes lack high/low-speed compression, oil-height access, or ride-height hardware. Use only the controls your bike provides — and ask Bike Setup AI with your make and model if you are unsure.',
};

/**
 * Hotspot centers sit on the gold-highlighted fork and rear shock
 * in suspension-bike.png (sportbike X-ray style). Spaced to keep 44px hits apart.
 */
export const BIKE_SETUP_HOTSPOTS: BikeSetupHotspot[] = [
  {
    id: 'front-compression',
    kind: 'adjust',
    xPct: 37,
    yPct: 32,
    title: 'Fork compression',
    summary:
      'Controls how quickly the fork compresses over bumps and under braking. Too soft feels divey; too firm feels harsh and can push the front.',
    roadBase:
      'Start near the middle of the clicker range (or factory mid). Soften 2–4 clicks from mid if the road is rough or the fork feels harsh over expansion joints.',
    trackBase:
      'Start at mid, then firm 2–4 clicks for harder braking and kerbs. Prefer a slightly firmer road baseline only after sag is set.',
    capabilityNote: 'Some forks have separate high- and low-speed compression; others have a single clicker or none.',
    aiPrompt:
      'Explain how to check and set front fork compression damping for my bike. Include how to count clicks from closed, what symptoms mean too soft or too firm, and safe base starting points for road and track.',
  },
  {
    id: 'front-rebound',
    kind: 'adjust',
    xPct: 33,
    yPct: 48,
    title: 'Fork rebound',
    summary:
      'Controls how quickly the fork extends after compression. Too fast feels springy and unsettled; too slow packs down over successive bumps.',
    roadBase:
      'Start near mid. Soften slightly if the front feels harsh after bumps; firm slightly if the front feels floaty or wallowy after dips.',
    trackBase:
      'Start near mid after sag is set. Firm a click or two if the front feels lively on exit; soften if it packs in linked bumps.',
    capabilityNote: 'Rebound is usually a top or bottom clicker. Not all OEM forks are externally adjustable.',
    aiPrompt:
      'Explain how to check and set front fork rebound for my bike. Cover packing vs springy feel, click counting, and recommended base points for road versus track.',
  },
  {
    id: 'front-preload',
    kind: 'adjust',
    xPct: 40,
    yPct: 22,
    title: 'Fork preload',
    summary:
      'Sets initial spring tension. It mainly changes how much sag you get — it does not replace the correct spring rate for your weight.',
    roadBase:
      'Set for sensible static and rider sag first (see sag hotspot). Use preload collars/caps only to hit sag targets; do not max preload to “make it firmer.”',
    trackBase:
      'Same process with race-sag targets. If you cannot hit sag without extreme preload, you likely need a different spring rate.',
    capabilityNote: 'Preload may be a top cap, collar, or not user-adjustable on some bikes.',
    aiPrompt:
      'Explain how to set front fork preload for my bike and how it relates to sag. Include road and track sag targets and when a spring rate change is needed instead of more preload.',
  },
  {
    id: 'front-oil-height',
    kind: 'adjust',
    xPct: 35,
    yPct: 40,
    title: 'Fork oil height / air gap',
    summary:
      'Internal oil volume changes end-of-stroke progression. More oil (less air gap) ramps up harder near full compression.',
    roadBase:
      'Leave at factory oil height unless a workshop change is planned. Street riding rarely needs custom oil height.',
    trackBase:
      'Only change after sag and damping are sorted and you have a clear end-stroke symptom (harsh bottoming or soft dive). Small volume changes matter — use a shop or precise procedure.',
    capabilityNote: 'Requires fork disassembly. Not an everyday clicker — many riders never adjust this.',
    aiPrompt:
      'Explain fork oil height / air gap for my bike: what it does, how it is measured, risks of getting it wrong, and when track riders change it versus leaving OEM.',
  },
  {
    id: 'front-sag',
    kind: 'measure',
    xPct: 30,
    yPct: 56,
    title: 'Front static / race sag',
    summary:
      'Sag is how much the suspension settles under the bike alone (static) and with you in full gear (rider / race sag). It is the foundation of setup.',
    roadBase:
      'Typical starting windows: static ~25–35 mm; rider sag ~30–40 mm of fork travel (confirm against your fork’s total travel). Measure with zip ties or a ruler on the stanchion.',
    trackBase:
      'Often slightly firmer rider sag than road (commonly toward ~30–35 mm on many sport forks — verify for your travel). Re-check after tyre and fuel changes.',
    capabilityNote: 'You can measure sag on almost any bike even if damping is not adjustable.',
    aiPrompt:
      'Explain how to measure front static and rider/race sag on my bike step by step, including tools, common target ranges for road and track, and what to change if sag is off.',
  },
  {
    id: 'front-travel',
    kind: 'measure',
    xPct: 28,
    yPct: 64,
    title: 'Fork travel',
    summary:
      'Total available stroke versus how much you actually use. A zip tie on the stanchion shows used travel after a session.',
    roadBase:
      'You should use a healthy portion of travel without regularly bottoming on normal roads. If the zip tie barely moves, spring/preload may be too firm or travel is limited by geometry.',
    trackBase:
      'Expect more travel used under hard braking. Occasional near-bottoming on big kerbs can be OK; repeated hard bottoming needs spring, oil height, or damping review.',
    capabilityNote: 'Measurement only — no adjuster. Pair with sag and damping changes.',
    aiPrompt:
      'Explain how to measure used front fork travel with a zip tie, how to interpret unused versus bottomed travel, and what base changes to consider for road and track.',
  },
  {
    id: 'front-ride-height',
    kind: 'measure',
    xPct: 29,
    yPct: 76,
    title: 'Front ride height',
    summary:
      'Axle-to-reference measurement that describes front attitude. Changing it (where possible) alters steering trail and weight bias.',
    roadBase:
      'Record OEM height as your baseline. Street bikes often have little or no front ride-height adjustability — note the number for comparison after crash repairs or fork work.',
    trackBase:
      'Small changes can speed or slow steering. Only adjust if your bike has fork-tube height in clamps or dedicated hardware; change 1–2 mm at a time and re-check sag.',
    capabilityNote: 'Many road bikes cannot adjust front ride height without moving tubes in the triple clamps (and some forks must stay flush).',
    aiPrompt:
      'Explain how to measure front ride height (axle to a fixed reference) on my bike, what OEM vs race adjustments look like, and safe road versus track starting approach.',
  },
  // Rear shock callouts — orbit around the shock so taps do not overlap
  {
    id: 'rear-compression',
    kind: 'adjust',
    xPct: 49,
    yPct: 42,
    title: 'Shock compression',
    summary:
      'Controls how the rear compresses under acceleration, bumps, and weight transfer. Too soft squats and walls; too firm skips and loses drive.',
    roadBase:
      'Start near mid. Soften for rough roads and comfort; firm slightly if the rear squats hard on throttle or feels vague.',
    trackBase:
      'Often firmer than road after sag is set. High/low-speed split (if fitted): low-speed for drive/support, high-speed for kerbs and sharp hits.',
    capabilityNote: 'Many shocks have one compression clicker; race shocks may split high/low speed; some OEM units are not adjustable.',
    aiPrompt:
      'Explain rear shock compression damping for my bike, including high/low speed if applicable, symptoms, and base starting points for road and track.',
  },
  {
    id: 'rear-preload',
    kind: 'adjust',
    xPct: 55,
    yPct: 36,
    title: 'Shock preload',
    summary:
      'Spring preload sets rear sag. Correct sag matters more than “stiffer feel.” Wrong spring rate cannot be fixed with preload alone.',
    roadBase:
      'Adjust collar/hydraulic preload to hit static and rider sag targets. Typical rider sag often lands around 25–35 mm depending on shock stroke — confirm for your shock.',
    trackBase:
      'Use race-sag targets (often similar windows, sometimes slightly less sag / more support). Re-measure with full gear and typical fuel.',
    capabilityNote: 'Most bikes have rear preload; some use a remote hydraulic adjuster, others a C-spanner collar.',
    aiPrompt:
      'Explain rear shock preload and sag setup for my bike, including measurement method and road/track target ranges, and when to change the spring instead.',
  },
  {
    id: 'rear-sag',
    kind: 'measure',
    xPct: 53,
    yPct: 48,
    title: 'Shock travel / sag',
    summary:
      'Measure between shock mounts (or use a sag tool) for static and rider sag, and use a zip tie on the shaft for used travel.',
    roadBase:
      'Set static and rider sag first, then note used travel after a ride. You want meaningful travel used without constant bottoming.',
    trackBase:
      'Same measurements under race pace. Compare used travel to total stroke; repeated bottoming or unused travel guides spring and damping changes.',
    capabilityNote: 'Measurable on essentially all bikes.',
    aiPrompt:
      'Walk me through measuring rear shock sag and used travel on my bike, with road and track target guidance and how to interpret the results.',
  },
  {
    id: 'rear-rebound',
    kind: 'adjust',
    xPct: 51,
    yPct: 56,
    title: 'Shock rebound',
    summary:
      'Controls how fast the rear extends. Too fast kicks and unloads the tyre; too slow packs and loses contact over ripples.',
    roadBase:
      'Start near mid. Soften if the rear feels harsh after bumps; firm if it feels bouncy or pumps on rolling pavement.',
    trackBase:
      'Fine-tune after sag. Watch exit grip and linked kerbs — packing or kicking usually points at rebound first.',
    capabilityNote: 'Usually a clicker at the bottom of the shock; not present on all stock shocks.',
    aiPrompt:
      'Explain how to set rear shock rebound on my bike: how to count clicks, packing vs kicking symptoms, and road versus track base recommendations.',
  },
  {
    id: 'rear-ride-height',
    kind: 'measure',
    xPct: 76,
    yPct: 68,
    title: 'Rear ride height',
    summary:
      'Axle-to-reference (often swingarm or a fixed body point) describes rear attitude and wheelbase/geometry feel.',
    roadBase:
      'Record stock height. Raising/lowering the rear (if possible) changes steering and squat — leave OEM for street unless you have a clear goal.',
    trackBase:
      'Small rear-height changes are common race tools for turn-in and drive. Adjust only with proper hardware; change a little, then re-check sag and chain alignment.',
    capabilityNote: 'Requires ride-height adjusters or related hardware — absent on many street bikes.',
    aiPrompt:
      'Explain how to measure rear ride height on my bike, what adjusters might exist, and cautious road versus track base approach.',
  },
];

export function getHotspotById(id: string): BikeSetupHotspot | undefined {
  return BIKE_SETUP_HOTSPOTS.find((h) => h.id === id);
}
