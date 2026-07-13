import { useCallback, useEffect, useRef, useState } from 'react';
import { readJson, writeJson } from './asyncStorage';

/**
 * Loads a JSON value from AsyncStorage on mount and persists every update.
 * `loaded` stays false until the initial read resolves, so screens can avoid
 * flashing an empty state before storage has been read.
 */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    let cancelled = false;
    readJson(key, fallbackRef.current).then((stored) => {
      if (!cancelled) {
        setValue(stored);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        writeJson(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  return { value, setValue: update, loaded };
}
