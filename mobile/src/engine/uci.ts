/**
 * Pure parsing of Stockfish's UCI output. No engine, no I/O — just string → numbers, so it can be
 * unit-checked against recorded engine output. The adapter that actually runs the WASM engine feeds
 * its stdout lines through here.
 */

export interface InfoScore {
  depth: number | null;
  /** Centipawns, from the side-to-move's perspective (UCI convention). Null on a mate line. */
  cp: number | null;
  /** Mate distance in moves, side-to-move's perspective. Positive = stm mates. Null otherwise. */
  mate: number | null;
  multipv: number | null;
  /** Principal variation as UCI moves (e2e4, e7e8q, …). */
  pv: string[];
}

/** Parse a `info … score …` line, or null if the line carries no score (so it's not useful to us). */
export function parseInfo(line: string): InfoScore | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info') return null;

  let depth: number | null = null;
  let cp: number | null = null;
  let mate: number | null = null;
  let multipv: number | null = null;
  let pv: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === 'depth') depth = Number(tokens[++i]);
    else if (token === 'multipv') multipv = Number(tokens[++i]);
    else if (token === 'score') {
      const kind = tokens[++i];
      const value = Number(tokens[++i]);
      if (kind === 'cp') cp = value;
      else if (kind === 'mate') mate = value;
    } else if (token === 'pv') {
      pv = tokens.slice(i + 1);
      break;
    }
  }

  if (cp === null && mate === null) return null;
  return { depth, cp, mate, multipv, pv };
}

/** The engine's chosen move from a `bestmove …` line (UCI), or null (including `bestmove (none)`). */
export function parseBestMove(line: string): string | null {
  const match = line.trim().match(/^bestmove\s+(\S+)/);
  if (!match) return null;
  return match[1] === '(none)' ? null : match[1];
}

export function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

/** UCI scores are side-to-move relative; the app speaks white's perspective everywhere else. */
export function toWhitePov(scoreForSideToMove: number, stm: 'w' | 'b'): number {
  return stm === 'w' ? scoreForSideToMove : -scoreForSideToMove;
}
