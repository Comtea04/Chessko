import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

export interface Settings {
  /** Springy screen transitions. Turn off while debugging layout — the bounce gets in the way. */
  springTransitions: boolean;
}

const INITIAL: Settings = { springTransitions: true };

export function useSettings() {
  const { value, setValue, loaded } = usePersistentState<Settings>('settings', INITIAL);

  const setSpringTransitions = useCallback(
    (on: boolean) => setValue((prev) => ({ ...prev, springTransitions: on })),
    [setValue]
  );

  return { ...value, setSpringTransitions, loaded };
}
