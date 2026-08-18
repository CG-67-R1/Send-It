import React, { forwardRef, useImperativeHandle, useState } from 'react';
import type { TrackMemoryLayout } from './types';
import { TrackMemoryRoad } from './TrackMemoryRoad';
import type { TrackMemoryRoadHandle } from './roadHandle';

type Props = {
  layout: TrackMemoryLayout;
  width: number;
  height: number;
};

/**
 * Web road renderer: keeps the SVG road (Vercel has no Skia/CanvasKit bundle),
 * but absorbs the per-frame pose locally so the game screen never re-renders.
 */
export const TrackMemoryRoadView = forwardRef<TrackMemoryRoadHandle, Props>(
  function TrackMemoryRoadView({ layout, width, height }, ref) {
    const [pose, setPose] = useState({ s: 0, lateral: 0, heading: 0 });

    useImperativeHandle(
      ref,
      () => ({
        draw: (s: number, lateral: number, heading: number) => setPose({ s, lateral, heading }),
      }),
      []
    );

    return (
      <TrackMemoryRoad
        layout={layout}
        s={pose.s}
        lateral={pose.lateral}
        heading={pose.heading}
        width={width}
        height={height}
      />
    );
  }
);
