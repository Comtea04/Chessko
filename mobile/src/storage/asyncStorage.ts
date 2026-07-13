import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'chessko:';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Callers fire this without awaiting, so a storage failure must not surface as an unhandled rejection. */
export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] failed to persist "${key}"`, err);
  }
}
