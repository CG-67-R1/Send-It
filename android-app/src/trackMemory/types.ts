export type TrackMemoryPoint = {
  x: number;
  y: number;
  /** Height relative to track mean (metres). Present when layout.hasElevation. */
  z?: number;
};

export type TrackMemoryCorner = {
  id: string;
  number: number | null;
  label: string;
  direction: string;
  /** Apex station along the lap [0,1) — mid-corner / peak of the turn. */
  sNorm: number;
};

export type TrackMemoryLayout = {
  trackId: string;
  name: string;
  direction: 'clockwise' | 'anticlockwise' | string;
  lengthM: number;
  points: TrackMemoryPoint[];
  corners: TrackMemoryCorner[];
  bakedAt?: string;
  sourceGpx?: string;
  /** True when points carry usable elevation (z). */
  hasElevation?: boolean;
  /** Peak-to-trough elevation span in metres. */
  elevSpanM?: number;
  elevSource?: string;
};

export type ControlState = {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
};

export type FlashState = {
  text: string;
  untilMs: number;
  /** Red danger cue (e.g. Brake Now!). */
  tone?: 'normal' | 'danger' | 'coach';
} | null;

export type GamePhase = 'ready' | 'racing' | 'finished';

export type GameState = {
  phase: GamePhase;
  /** Distance along lap in metres [0, lengthM). */
  s: number;
  /** Lateral offset metres; positive = left of centre. */
  lateral: number;
  speed: number;
  lean: number;
  lap: number;
  lapTimeMs: number;
  bestLapMs: number | null;
  sessionBestLapMs: number | null;
  lapTimesMs: number[];
  flash: FlashState;
  /** Corner ids already name-flashed this lap. */
  flashedIds: string[];
  /** Corner ids that already showed Brake Now! this lap. */
  brakeFlashIds: string[];
  /** Next index into the lap coaching script (COACH_SCRIPT). */
  coachIndex: number;
  /** Wall clock when the next coaching popup may appear (ms), or null if not started. */
  coachNextAtMs: number | null;
  /** Wall clock when the bike first started moving this stint (ms), or null. */
  movedAtMs: number | null;
  /** Low-passed camera heading (radians) used to project the road. */
  heading: number;
};
