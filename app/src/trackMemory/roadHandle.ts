/**
 * The game loop pushes the rider pose straight into the road renderer instead of
 * re-rendering the screen every frame.
 */
export type TrackMemoryRoadHandle = {
  draw: (s: number, lateral: number, heading: number) => void;
};
