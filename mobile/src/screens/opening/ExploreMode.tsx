import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chess, type Square } from 'chess.js';

import { ChessBoard } from '../../components/ChessBoard';
import { EvalBar } from '../../components/EvalBar';
import type { Engine } from '../../engine/types';
import type { Opening } from '../../data/openings';
import { colors, radius, spacing, typography } from '../../theme';

/** Collapse a mate onto the ends of the bar's scale, matching EvalBar/openingAnnotations. */
const MATE_CP = 800;

function tryMove(chess: Chess, from: Square, to: Square) {
  try {
    return chess.move({ from, to });
  } catch {
    try {
      return chess.move({ from, to, promotion: 'q' });
    } catch {
      return null;
    }
  }
}

function formatEval(cp: number | null): string {
  if (cp === null) return '—';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

/**
 * Free play off the saved line. Reached when the user leaves a curated line with a *sound* move and
 * chooses to keep going: from here the opponent's replies come from the on-device engine (best move),
 * not a script, and every position shows the engine's evaluation. Exit returns to the saved line.
 */
export function ExploreMode({
  opening,
  perspective,
  startFen,
  engine,
  onExit,
}: {
  opening: Opening;
  /** The side the user is playing — the study screen's, which may be flipped from the opening's own. */
  perspective: 'w' | 'b';
  startFen: string;
  engine: Engine;
  onExit: () => void;
}) {
  const flipped = perspective === 'b';
  const userColor = perspective;
  const chessRef = useRef(new Chess(startFen));
  const chess = chessRef.current;

  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);
  const [selected, setSelected] = useState<Square | null>(null);
  const [evalCp, setEvalCp] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);

  const isUserTurn = !thinking && chess.turn() === userColor && !chess.isGameOver();

  const evalWhite = useCallback(async () => {
    const res = await engine.evaluate(chess.fen(), { depth: 14 });
    setEvalCp(res.mate !== null ? (res.mate >= 0 ? MATE_CP : -MATE_CP) : res.cp);
  }, [chess, engine]);

  /** The engine plays the opponent's reply, then we refresh the evaluation. */
  const engineReply = useCallback(async () => {
    if (chess.isGameOver()) return;
    setThinking(true);
    const res = await engine.evaluate(chess.fen(), { depth: 14 });
    if (res.bestMove) {
      const from = res.bestMove.slice(0, 2) as Square;
      const to = res.bestMove.slice(2, 4) as Square;
      const promotion = res.bestMove.slice(4, 5) || undefined;
      try {
        chess.move({ from, to, promotion: promotion || 'q' });
      } catch {
        /* engine gave a move we couldn't apply; leave the turn to the user */
      }
    }
    await evalWhite();
    setThinking(false);
    rerender();
  }, [chess, engine, evalWhite, rerender]);

  // The user's own deviating move is already on the board (startFen), so it's the opponent to reply first.
  useEffect(() => {
    if (chess.turn() !== userColor && !chess.isGameOver()) engineReply();
    else evalWhite();
    // Run once on mount for this position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (!isUserTurn) return;
      const piece = chess.get(square);
      if (!selected) {
        if (piece && piece.color === chess.turn()) setSelected(square);
        return;
      }
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (piece && piece.color === chess.turn()) {
        setSelected(square);
        return;
      }
      const move = tryMove(chess, selected, square);
      setSelected(null);
      if (!move) return;
      rerender();
      engineReply();
    },
    [isUserTurn, chess, selected, rerender, engineReply]
  );

  const legalTargets = selected
    ? chess.moves({ square: selected, verbose: true }).map((move) => move.to as Square)
    : [];
  const last = chess.history({ verbose: true }).at(-1);
  const lastMove = last ? { from: last.from as Square, to: last.to as Square } : null;
  const history = chess.history();

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          탐색 모드 · 정석을 벗어나 자유롭게 두는 중{thinking ? ' · 엔진 계산 중…' : ''}
        </Text>
        <Pressable style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitText}>정석으로 돌아가기</Text>
        </Pressable>
      </View>

      <View style={styles.boardRow}>
        <EvalBar cp={evalCp} flipped={flipped} />
        <ChessBoard
          board={chess.board()}
          selectedSquare={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          flipped={flipped}
          onSquarePress={handleSquarePress}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.evalLabel}>엔진 평가 {formatEval(evalCp)}</Text>
        {chess.isGameOver() && <Text style={styles.overText}>대국 종료</Text>}
        {!chess.isGameOver() && (
          <Text style={styles.turnText}>{isUserTurn ? '당신 차례입니다.' : '엔진이 응수합니다…'}</Text>
        )}
        <Text style={styles.history}>{history.join(' ') || '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bannerText: { ...typography.caption, color: colors.primary, flex: 1, fontWeight: '600' },
  exitButton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  exitText: { ...typography.caption, color: '#fff', fontWeight: '700' },
  boardRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  evalLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
  turnText: { ...typography.caption, color: colors.textMuted },
  overText: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  history: { ...typography.caption, color: colors.textMuted, lineHeight: 20 },
});
