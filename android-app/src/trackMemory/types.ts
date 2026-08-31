export type TrackMemoryPoint = {
  x: number;
  y: number;
  /** Ignored at runtime — layouts may still carry leftover bake z. */
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
};

export type ControlState = {
  left: boolean;
  right: boolean;
  accel: boolean;
  brake: boolean;
};

export type FlashState = {
  text: string;
  title?: string;
  lines?: string[];
  untilMs: number;
  tone?: 'normal' | 'coach';
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
  /** Corner ids already used for the 50 m slowdown this lap. */
  slowIds: string[];
  /** 0 = first overlay pending, 1 = first shown, 2 = second shown. */
  coachIndex: number;
  /** Wall clock when the bike first started moving this stint (ms), or null. */
  movedAtMs: number | null;
  /** Half-speed cap after a 50 m board; null when not slowing. */
  slowUntilMs: number | null;
  slowCap: number;
  /** Low-passed camera heading (radians) used to project the road. */
  heading: number;
};
