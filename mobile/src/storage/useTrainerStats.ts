import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

interface CoordinateStats {
  bestStreak: number;
  bestAccuracy: number;
}

const INITIAL: CoordinateStats = { bestStreak: 0, bestAccuracy: 0 };

export function useTrainerStats() {
  const { value, setValue, loaded } = usePersistentState<CoordinateStats>('coordinateStats', INITIAL);

  const recordSession = useCallback(
    (streak: number, accuracy: number) => {
      setValue((prev) => ({
        bestStreak: Math.max(prev.bestStreak, streak),
        bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
      }));
    },
    [setValue]
  );

  return { ...value, recordSession, loaded };
}
