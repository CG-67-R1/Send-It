export type TrackMemoryPoint = {
  x: number;
  y: number;
  /** Elevation metres when the bake includes z. */
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
  hasElevation?: boolean;
  elevSpanM?: number;
  elevSource?: string;
};
