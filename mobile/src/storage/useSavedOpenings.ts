import { useCallback, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';

/**
 * Openings that were folded into another one, so a star saved under the old id follows the moves to
 * where they now live instead of quietly disappearing. Read-only: the stored list keeps the old id
 * until the user toggles the star again, which is harmless.
 */
const MERGED_INTO: Record<string, string> = {
  'queens-gambit-declined': 'queens-gambit',
  'queens-gambit-accepted': 'queens-gambit',
  'slav-defense': 'queens-gambit',
};

export function useSavedOpenings() {
  const { value: stored, setValue: setSavedIds, loaded } = usePersistentState<string[]>('savedOpenings', []);

  const savedIds = useMemo(() => [...new Set(stored.map((id) => MERGED_INTO[id] ?? id))], [stored]);

  const isSaved = useCallback((openingId: string) => savedIds.includes(openingId), [savedIds]);

  const toggleSaved = useCallback(
    (openingId: string) => {
      setSavedIds((prev) => {
        // Removing takes any old id pointing here with it, so unstarring can't leave a stale one behind.
        const without = prev.filter((id) => (MERGED_INTO[id] ?? id) !== openingId);
        return without.length === prev.length ? [...prev, openingId] : without;
      });
    },
    [setSavedIds]
  );

  return { savedIds, isSaved, toggleSaved, loaded };
}
