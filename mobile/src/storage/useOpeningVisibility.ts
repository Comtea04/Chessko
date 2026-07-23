import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

/**
 * Which openings the main list shows. Stored as the *hidden* ids rather than the shown ones so the
 * default (nothing stored) is "show everything", and an opening added to the data set later shows up
 * on its own instead of staying invisible until the user goes looking for it in the settings.
 */
export function useOpeningVisibility() {
  const { value: hiddenIds, setValue: setHiddenIds, loaded } = usePersistentState<string[]>('hiddenOpenings', []);

  const isVisible = useCallback((openingId: string) => !hiddenIds.includes(openingId), [hiddenIds]);

  const setVisible = useCallback(
    (openingId: string, visible: boolean) => {
      setHiddenIds((prev) =>
        visible ? prev.filter((id) => id !== openingId) : prev.includes(openingId) ? prev : [...prev, openingId]
      );
    },
    [setHiddenIds]
  );

  const showAll = useCallback(() => setHiddenIds([]), [setHiddenIds]);

  return { hiddenIds, isVisible, setVisible, showAll, loaded };
}
