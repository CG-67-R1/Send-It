export type TrackInfoInfraKind =
  | 'pit_entry'
  | 'pit_exit'
  | 'pit_lane'
  | 'bridge'
  | 'water';

export type TrackInfoInfra = {
  id: string;
  kind: TrackInfoInfraKind;
  label: string;
  xPct?: number;
  yPct?: number;
  /** Ellipse radii for water (percent of the map). */
  rxPct?: number;
  ryPct?: number;
  /** Pit-lane ribbon in the same 0–100 map space. */
  polyline?: number[][];
};

export type TrackInfoCorner = {
  id: string;
  number: number;
  label: string;
  direction: string;
  sNorm: number;
  xPct: number;
  yPct: number;
};

export type TrackInfoSister = {
  trackId: string;
  name: string;
  polyline: number[][];
};

export type TrackInfoMap = {
  trackId: string;
  name: string;
  direction: string;
  lengthM: number;
  hasElevation: boolean;
  elevSpanM: number | null;
  elevSource: string | null;
  polyline: number[][];
  sisters: TrackInfoSister[];
  corners: TrackInfoCorner[];
  startFinish: { xPct: number; yPct: number };
  derivedInfra: TrackInfoInfra[];
};

export type AsbkRecord = {
  class: string;
  time: string;
  rider: string;
  machine?: string;
  date: string;
  source: string;
};

export type TrackInfoFacts = {
  surface: string;
  weatherUsual: string;
  asbkRecords?: AsbkRecord[];
};
