export type RacingLine = {
  trackId: string;
  name: string;
  polyline: number[][];
  /** Hex colour per band; see scripts/lib/racing_line_colors.py. */
  palette: string[];
  /** Band index per polyline point, parallel to polyline. */
  bands: number[];
};
