export type GameStatus = 'IN_PROGRESS' | 'CHECKMATE' | 'STALEMATE';

export interface MoveEvaluation {
  rank: number;
  move: string;
  scoreCp: number | null;
  mateIn: number | null;
  principalVariation: string[];
}

export interface AnalysisResponse {
  fen: string;
  status: GameStatus;
  bestMove: string | null;
  lines: MoveEvaluation[];
}

// Override via mobile/.env.local (e.g. your machine's LAN IP) when running on a device/emulator
// instead of Expo web, since "localhost" there resolves to the device itself, not this machine.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export class AnalysisApiError extends Error {}

export async function analyzePosition(fen: string, multiPv = 3): Promise<AnalysisResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen, multiPv }),
    });
  } catch {
    throw new AnalysisApiError('분석 서버에 연결할 수 없습니다. 서버 주소를 확인해 주세요.');
  }

  if (!response.ok) {
    const body: { message?: string } | null = await response.json().catch(() => null);
    throw new AnalysisApiError(body?.message ?? '분석 요청이 실패했습니다.');
  }

  return response.json();
}

export interface PositionEvaluation {
  ply: number;
  fen: string;
  status: GameStatus | null;
  /** Centipawns from the side to move's perspective; null on a forced mate. */
  scoreCp: number | null;
  mateIn: number | null;
  /** False when the engine could not evaluate this position — plot a gap, not a zero. */
  analyzed: boolean;
}

/** Evaluates every position of a game in one request, for the advantage graph. */
export async function analyzeGame(fens: string[]): Promise<PositionEvaluation[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/analysis/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fens }),
    });
  } catch {
    throw new AnalysisApiError('분석 서버에 연결할 수 없습니다. 서버 주소를 확인해 주세요.');
  }

  if (!response.ok) {
    const body: { message?: string } | null = await response.json().catch(() => null);
    throw new AnalysisApiError(body?.message ?? '대국 분석이 실패했습니다.');
  }

  const body: { evaluations: PositionEvaluation[] } = await response.json();
  return body.evaluations;
}
