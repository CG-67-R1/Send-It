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
} | null;

export type GamePhase = 'ready' | 'racing' | 'finished';

export type GameState = {
  phase: GamePhase;
  /** Distance along lap in metres [0, lengthM). */
  s: number;
  /** Lateral offset metres; negative = left of centre. */
  lateral: number;
  speed: number;
  lean: number;
  lap: number;
  lapTimeMs: number;
  bestLapMs: number | null;
  sessionBestLapMs: number | null;
  lapTimesMs: number[];
  flash: FlashState;
  /** Corner ids already flashed this lap. */
  flashedIds: string[];
  heading: number;
};
