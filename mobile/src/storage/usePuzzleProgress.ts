import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

interface PuzzleProgress {
  solvedIds: string[];
  currentStreak: number;
  bestStreak: number;
}

const INITIAL: PuzzleProgress = { solvedIds: [], currentStreak: 0, bestStreak: 0 };

export function usePuzzleProgress() {
  const { value, setValue, loaded } = usePersistentState<PuzzleProgress>('puzzleProgress', INITIAL);

  const recordResult = useCallback(
    (puzzleId: string, solved: boolean) => {
      setValue((prev) => {
        const currentStreak = solved ? prev.currentStreak + 1 : 0;
        return {
          solvedIds: solved && !prev.solvedIds.includes(puzzleId) ? [...prev.solvedIds, puzzleId] : prev.solvedIds,
          currentStreak,
          bestStreak: Math.max(prev.bestStreak, currentStreak),
        };
      });
    },
    [setValue]
  );

  return { ...value, recordResult, loaded };
}
