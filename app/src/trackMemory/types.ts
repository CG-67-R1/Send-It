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
  /** Coaching popup ids already shown this lap. */
  coachShownIds: string[];
  /** Two corner ids selected for the detailed coaching sequence this lap. */
  coachCornerIds: string[];
  /** Wall clock when the bike first started moving this stint (ms), or null. */
  movedAtMs: number | null;
  /** Low-passed camera heading (radians) used to project the road. */
  heading: number;
};
