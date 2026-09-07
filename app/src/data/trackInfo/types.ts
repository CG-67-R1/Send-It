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
