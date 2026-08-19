import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { TrackMemoryLayout } from './types';
import { TrackMemoryRoad } from './TrackMemoryRoad';
import type { TrackMemoryRoadHandle } from './roadHandle';

type Props = {
  layout: TrackMemoryLayout;
  width: number;
  height: number;
};

const MIN_FRAME_MS = 48;

/**
 * Web road renderer: keeps the SVG road (Vercel has no Skia/CanvasKit bundle),
 * but absorbs the per-frame pose locally so the game screen never re-renders.
 * Pose is throttled — rebuilding ~200 SVG nodes at 60fps is what Safari
 * watchdog-kills on first open.
 */
export const TrackMemoryRoadView = forwardRef<TrackMemoryRoadHandle, Props>(
  function TrackMemoryRoadView({ layout, width, height }, ref) {
    const [pose, setPose] = useState({ s: 0, lateral: 0, heading: 0 });
    const lastDrawAt = useRef(0);

    useImperativeHandle(
      ref,
      () => ({
        draw: (s: number, lateral: number, heading: number) => {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - lastDrawAt.current < MIN_FRAME_MS) return;
          lastDrawAt.current = now;
          setPose({ s, lateral, heading });
        },
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
