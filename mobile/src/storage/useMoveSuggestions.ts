import { useCallback, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';

/**
 * A move explanation the user wrote in the app. There is nowhere to send it — no accounts, no
 * community server — so it is kept on the device and exported as text with the share sheet; the
 * suggestion lands in `openingCommunityNotes.json` when it is pasted into the authoring tool
 * (`npm run author`) and approved there. Keeping the draft locally is what makes the round trip
 * survivable: the user can see what they sent and send it again.
 */
export interface MoveSuggestion {
  id: string;
  /** `${openingId}:${lineId}` — the same key the notes and community files use. */
  key: string;
  ply: number;
  san: string;
  author: string;
  text: string;
  /** "루이 로페즈 › 클로즈드", so the exported text says where the move lives without a lookup. */
  where: string;
  createdAt: number;
}

export interface NewSuggestion extends Omit<MoveSuggestion, 'id' | 'createdAt'> {}

export function useMoveSuggestions() {
  const { value: suggestions, setValue, loaded } = usePersistentState<MoveSuggestion[]>('moveSuggestions', []);

  const add = useCallback(
    (suggestion: NewSuggestion) => {
      const saved: MoveSuggestion = { ...suggestion, id: `${Date.now()}`, createdAt: Date.now() };
      setValue((prev) => [...prev, saved]);
      return saved;
    },
    [setValue]
  );

  const remove = useCallback(
    (id: string) => setValue((prev) => prev.filter((suggestion) => suggestion.id !== id)),
    [setValue]
  );

  const byMove = useMemo(() => {
    const map = new Map<string, MoveSuggestion[]>();
    for (const suggestion of suggestions) {
      const key = `${suggestion.key}#${suggestion.ply}`;
      map.set(key, [...(map.get(key) ?? []), suggestion]);
    }
    return map;
  }, [suggestions]);

  const forMove = useCallback((key: string, ply: number) => byMove.get(`${key}#${ply}`) ?? [], [byMove]);

  return { suggestions, forMove, add, remove, loaded };
}

/** The text the share sheet sends — everything the authoring tool needs to place the suggestion. */
export function suggestionText(suggestion: MoveSuggestion): string {
  return [
    '[체스코 · 수 설명 제안]',
    `오프닝: ${suggestion.where}`,
    `라인 키: ${suggestion.key}`,
    `수: ${suggestion.san} (ply ${suggestion.ply})`,
    `닉네임: ${suggestion.author}`,
    '',
    suggestion.text,
  ].join('\n');
}
