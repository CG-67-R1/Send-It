import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TrackArrivalOverlay } from '../components/TrackArrivalOverlay';

type TrackArrivalContextValue = {
  recheckArrival: () => void;
};

const TrackArrivalContext = createContext<TrackArrivalContextValue | null>(null);

export function TrackArrivalProvider({ children }: { children: React.ReactNode }) {
  const [recheckKey, setRecheckKey] = useState(0);

  const recheckArrival = useCallback(() => {
    setRecheckKey((k) => k + 1);
  }, []);

  const value = useMemo(() => ({ recheckArrival }), [recheckArrival]);

  return (
    <TrackArrivalContext.Provider value={value}>
      {children}
      <TrackArrivalOverlay key={recheckKey} />
    </TrackArrivalContext.Provider>
  );
}

export function useTrackArrivalRecheck(): () => void {
  const ctx = useContext(TrackArrivalContext);
  return ctx?.recheckArrival ?? (() => {});
}
