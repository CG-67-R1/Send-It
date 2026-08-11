export type TrackMemoryPoint = { x: number; y: number };

export type TrackMemoryCorner = {
  id: string;
  number: number | null;
  label: string;
  direction: string;
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
  tone?: 'normal' | 'danger';
} | null;

export type GamePhase = 'ready' | 'racing' | 'crashing' | 'finished';

/** Active 100 m brake gate until the rider reaches the corner. */
export type BrakeGate = {
  cornerId: string;
  cornerS: number;
  braked: boolean;
};

export type GameState = {
  phase: GamePhase;
  /** Distance along lap in metres [0, lengthM). */
  s: number;
  /** Lateral offset metres; negative = right of centre (left-normal frame). */
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
  /** Current approach gate after 100 m board (null if none). */
  brakeGate: BrakeGate | null;
  /** True while overspeed without braking — sliding toward outside. */
  slidingOut: boolean;
  /** Respawn clock while phase === 'crashing'. */
  crashUntilMs: number | null;
  heading: number;
};
