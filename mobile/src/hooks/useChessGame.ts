import { useCallback, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Owns a chess.js game as (rootFen + SAN move list), and a separate "viewIndex" so the PGN
 * viewer can step back through history without mutating the live game. Making a move while
 * viewing an earlier position branches from there, discarding the redo-able future moves.
 */
export function useChessGame(initialFen: string = STARTING_FEN) {
  const [rootFen, setRootFen] = useState(initialFen);
  const [moves, setMoves] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(-1); // -1 = rootFen position, otherwise index into `moves`
  const [error, setError] = useState<string | null>(null);

  const gameUpToViewIndex = useCallback(() => {
    const game = new Chess(rootFen);
    for (let i = 0; i <= viewIndex; i++) {
      game.move(moves[i]);
    }
    return game;
  }, [rootFen, moves, viewIndex]);

  const viewedGame = useMemo(() => gameUpToViewIndex(), [gameUpToViewIndex]);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      const game = gameUpToViewIndex();
      try {
        const result = game.move({ from, to, promotion });
        const newMoves = [...moves.slice(0, viewIndex + 1), result.san];
        setMoves(newMoves);
        setViewIndex(newMoves.length - 1);
        setError(null);
        return true;
      } catch {
        return false;
      }
    },
    [gameUpToViewIndex, moves, viewIndex]
  );

  const loadFen = useCallback((fen: string): boolean => {
    try {
      // eslint-disable-next-line no-new -- validates the FEN; throws on malformed input
      new Chess(fen);
    } catch {
      setError('유효하지 않은 FEN입니다.');
      return false;
    }
    setRootFen(fen);
    setMoves([]);
    setViewIndex(-1);
    setError(null);
    return true;
  }, []);

  const resetToStart = useCallback(() => loadFen(STARTING_FEN), [loadFen]);

  const goToIndex = useCallback(
    (index: number) => setViewIndex(Math.max(-1, Math.min(moves.length - 1, index))),
    [moves.length]
  );
  const goToPrevious = useCallback(() => goToIndex(viewIndex - 1), [goToIndex, viewIndex]);
  const goToNext = useCallback(() => goToIndex(viewIndex + 1), [goToIndex, viewIndex]);

  return {
    fen: viewedGame.fen(),
    board: viewedGame.board(),
    turn: viewedGame.turn(),
    isCheck: viewedGame.isCheck(),
    isCheckmate: viewedGame.isCheckmate(),
    isStalemate: viewedGame.isStalemate(),
    isGameOver: viewedGame.isGameOver(),
    lastMove: lastMoveOf(viewedGame),
    legalMoves: (square: Square) => movesFrom(viewedGame, square),
    promotionMoves: (square: Square) => promotionMovesFrom(viewedGame, square),
    moves,
    viewIndex,
    isAtLatest: viewIndex === moves.length - 1,
    error,
    makeMove,
    loadFen,
    resetToStart,
    goToIndex,
    goToPrevious,
    goToNext,
  };
}

function lastMoveOf(game: Chess): { from: Square; to: Square } | null {
  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  return last ? { from: last.from as Square, to: last.to as Square } : null;
}

function movesFrom(game: Chess, square: Square): Square[] {
  return game.moves({ square, verbose: true }).map((move) => move.to as Square);
}

/** Destination squares from `square` that require choosing a promotion piece. */
function promotionMovesFrom(game: Chess, square: Square): Square[] {
  return game
    .moves({ square, verbose: true })
    .filter((move) => move.promotion)
    .map((move) => move.to as Square);
}
