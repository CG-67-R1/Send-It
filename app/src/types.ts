export interface CalendarEvent {
  series: string;
  seriesLabel: string;
  title: string;
  venue: string | null;
  country: string | null;
  startDate: string;
  endDate: string;
  url: string | null;
  state?: string | null;
  organiser?: string | null;
  notes?: string | null;
  detailTier?: 'full' | 'summary';
  confidence?: 'high' | 'medium' | 'low';
}

export interface CalendarResponse {
  events: CalendarEvent[];
}
