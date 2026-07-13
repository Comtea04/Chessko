import { usePersistentState } from './usePersistentState';

export function useChesscomAccount() {
  const { value: username, setValue: setUsername, loaded } = usePersistentState<string | null>('chesscomUsername', null);
  return { username, setUsername, loaded };
}
