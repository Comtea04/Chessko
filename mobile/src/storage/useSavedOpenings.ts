import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

export function useSavedOpenings() {
  const { value: savedIds, setValue: setSavedIds, loaded } = usePersistentState<string[]>('savedOpenings', []);

  const isSaved = useCallback((openingId: string) => savedIds.includes(openingId), [savedIds]);

  const toggleSaved = useCallback(
    (openingId: string) => {
      setSavedIds((prev) => (prev.includes(openingId) ? prev.filter((id) => id !== openingId) : [...prev, openingId]));
    },
    [setSavedIds]
  );

  return { savedIds, isSaved, toggleSaved, loaded };
}
