import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { readJson, writeJson } from './asyncStorage';

/**
 * One shared value per storage key, so every screen using the same key sees the same data:
 * bookmarking an opening on the detail screen updates the list screen behind it, which stays
 * mounted in the stack and would otherwise never re-read storage.
 */
const cache = new Map<string, unknown>();
const loadedKeys = new Set<string>();
const inFlight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => set.delete(listener);
}

function ensureLoaded<T>(key: string, fallback: T) {
  if (loadedKeys.has(key) || inFlight.has(key)) return;
  const promise = readJson(key, fallback).then((stored) => {
    // A write that landed while the read was in flight is newer and already persisted — don't clobber it.
    if (!cache.has(key)) cache.set(key, stored);
    loadedKeys.add(key);
    inFlight.delete(key);
    emit(key);
    return stored;
  });
  inFlight.set(key, promise);
}

/**
 * Loads a JSON value from AsyncStorage on mount and persists every update.
 * `loaded` stays false until the initial read resolves, so screens can avoid
 * flashing an empty state before storage has been read.
 *
 * Writes happen outside React's state updater on purpose: React skips updaters for
 * unmounted components, which would silently drop a value saved on the way out of a
 * screen (e.g. a trainer session recorded from a cleanup effect).
 */
export function usePersistentState<T>(key: string, fallback: T) {
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    ensureLoaded(key, fallbackRef.current);
  }, [key]);

  const subscribeToKey = useCallback((listener: () => void) => subscribe(key, listener), [key]);

  const getValue = useCallback(() => (cache.has(key) ? (cache.get(key) as T) : fallbackRef.current), [key]);
  const getLoaded = useCallback(() => loadedKeys.has(key), [key]);

  const value = useSyncExternalStore(subscribeToKey, getValue, getValue);
  const loaded = useSyncExternalStore(subscribeToKey, getLoaded, getLoaded);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = cache.has(key) ? (cache.get(key) as T) : fallbackRef.current;
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      cache.set(key, resolved);
      emit(key);
      void writeJson(key, resolved);
    },
    [key]
  );

  return { value, setValue, loaded };
}
