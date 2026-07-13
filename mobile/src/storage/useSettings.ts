import { useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

export interface Settings {
  /** Screen morph transitions and sliding pieces. Turn off while debugging — motion gets in the way. */
  animations: boolean;
}

const INITIAL: Settings = { animations: true };

export function useSettings() {
  const { value, setValue, loaded } = usePersistentState<Settings>('settings', INITIAL);

  const setAnimations = useCallback((on: boolean) => setValue((prev) => ({ ...prev, animations: on })), [setValue]);

  return { ...value, setAnimations, loaded };
}
