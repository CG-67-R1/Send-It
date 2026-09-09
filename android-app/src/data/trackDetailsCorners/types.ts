export type TrackDetailsCorner = {
  id: string;
  number: number;
  apex: [number, number];
  label: [number, number];
  entry: [number, number];
  exit: [number, number];
  classification: string;
  headingChangeDeg: number;
  minimumRadiusM: number;
  lengthM: number;
  previousStraightM: number;
  /** Verified hand only, and only when the official count still matches. */
  direction: 'left' | 'right' | null;
  summary: string;
  approachFrom: string;
};

export type TrackDetailsCorners = {
  trackId: string;
  name: string;
  lengthM: number;
  startFinish: [number, number];
  countSource: 'autonomous' | 'constrained_to_target';
  corners: TrackDetailsCorner[];
};
