/**
 * chess.com's public read-only API (https://api.chess.com/pub/...). No key, no OAuth: a username
 * is all we have, so "연동" here means "we checked this player exists and remembered the name".
 */
const BASE_URL = 'https://api.chess.com/pub';

export class ChesscomApiError extends Error {}

export interface ChesscomProfile {
  username: string;
  name: string | null;
  avatar: string | null;
  title: string | null;
  url: string;
  followers: number;
  joined: number;
}

export type GameResult = 'win' | 'loss' | 'draw';

export interface ChesscomGame {
  url: string;
  /** Full game score; the review screen replays it with chess.js. */
  pgn: string;
  /** Result from the linked player's point of view. */
  result: GameResult;
  /** How the game ended, in the raw API vocabulary (checkmated, resigned, timeout, agreed…). */
  endReason: string;
  opponent: string;
  opponentRating: number | null;
  playerRating: number | null;
  playerColor: 'white' | 'black';
  timeClass: string;
  endTime: number;
}

interface RawPlayer {
  username: string;
  rating?: number;
  result: string;
}

interface RawGame {
  url: string;
  pgn?: string;
  time_class?: string;
  end_time?: number;
  white: RawPlayer;
  black: RawPlayer;
}

/** chess.com encodes both the outcome and the reason in one field; only 'win' means a win. */
const DRAW_RESULTS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', 'timevsinsufficient', '50move']);

function toResult(raw: string): GameResult {
  if (raw === 'win') return 'win';
  if (DRAW_RESULTS.has(raw)) return 'draw';
  return 'loss';
}

async function getJson<T>(url: string, notFoundMessage: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ChesscomApiError('chess.com에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.');
  }

  if (response.status === 404) throw new ChesscomApiError(notFoundMessage);
  if (response.status === 429) throw new ChesscomApiError('요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.');
  if (!response.ok) throw new ChesscomApiError('chess.com에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');

  try {
    return (await response.json()) as T;
  } catch {
    throw new ChesscomApiError('chess.com 응답을 해석하지 못했습니다.');
  }
}

export async function getPlayerProfile(username: string): Promise<ChesscomProfile> {
  const handle = username.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,25}$/.test(handle)) {
    throw new ChesscomApiError('닉네임 형식이 올바르지 않습니다.');
  }

  const raw = await getJson<{
    username: string;
    name?: string;
    avatar?: string;
    title?: string;
    url: string;
    followers?: number;
    joined?: number;
  }>(`${BASE_URL}/player/${handle}`, '그런 닉네임의 chess.com 사용자가 없습니다.');

  return {
    username: raw.username,
    name: raw.name ?? null,
    avatar: raw.avatar ?? null,
    title: raw.title ?? null,
    url: raw.url,
    followers: raw.followers ?? 0,
    joined: raw.joined ?? 0,
  };
}

/**
 * Games are archived per month, so the current month can be empty (or thin) early on — we walk
 * backwards through the archive list until we have enough games or run out of months.
 */
export async function getRecentGames(username: string, limit = 10): Promise<ChesscomGame[]> {
  const handle = username.trim().toLowerCase();

  const { archives } = await getJson<{ archives: string[] }>(
    `${BASE_URL}/player/${handle}/games/archives`,
    '그런 닉네임의 chess.com 사용자가 없습니다.'
  );

  const collected: ChesscomGame[] = [];
  const MAX_MONTHS = 3;

  for (const archiveUrl of archives.slice(-MAX_MONTHS).reverse()) {
    const { games } = await getJson<{ games: RawGame[] }>(archiveUrl, '대국 기록을 찾을 수 없습니다.');

    for (const game of games) {
      const playerIsWhite = game.white.username.toLowerCase() === handle;
      const me = playerIsWhite ? game.white : game.black;
      const them = playerIsWhite ? game.black : game.white;

      collected.push({
        url: game.url,
        pgn: game.pgn ?? '',
        result: toResult(me.result),
        endReason: me.result === 'win' ? them.result : me.result,
        opponent: them.username,
        opponentRating: them.rating ?? null,
        playerRating: me.rating ?? null,
        playerColor: playerIsWhite ? 'white' : 'black',
        timeClass: game.time_class ?? 'unknown',
        endTime: game.end_time ?? 0,
      });
    }

    if (collected.length >= limit) break;
  }

  return collected.sort((a, b) => b.endTime - a.endTime).slice(0, limit);
}
