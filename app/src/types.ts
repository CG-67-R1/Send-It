export interface Headline {
  title: string;
  url: string;
  source: string;
  sourceId: string;
  date: string | null;
}

export interface HeadlinesResponse {
  headlines: Headline[];
  count: number;
}

export interface Source {
  id: string;
  name: string;
}

export interface CustomSource {
  id: string;
  url: string;
  name: string;
}

/** Ordered list of sourceIds: index 0 = priority 1, etc. */
export type PriorityOrder = string[];

export interface CalendarEvent {
  series: string;
  seriesLabel: string;
  title: string;
  venue: string | null;
  country: string | null;
  startDate: string;
  endDate: string;
  url: string | null;
}

export interface CalendarResponse {
  events: CalendarEvent[];
}
