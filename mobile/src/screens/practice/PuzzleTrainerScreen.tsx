import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chess, type Square } from 'chess.js';

import { ChessBoard, type SquareOverlayKind } from '../../components/ChessBoard';
import { PUZZLES, PUZZLE_THEME_LABELS, type Puzzle } from '../../data/puzzles';
import { usePuzzleProgress } from '../../storage/usePuzzleProgress';
import { colors, radius, spacing, typography } from '../../theme';

const FEEDBACK_MS = 400;
const REPLY_MS = 450;

function pickPuzzle(solvedIds: string[], excludeId?: string): Puzzle {
  const candidates = PUZZLES.filter((puzzle) => puzzle.id !== excludeId);
  // Unsolved puzzles come first; once everything is solved, cycle through them again.
  const unsolved = candidates.filter((puzzle) => !solvedIds.includes(puzzle.id));
  const pool = unsolved.length > 0 ? unsolved : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** chess.js needs an explicit promotion piece; every puzzle solution promotes to a queen. */
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

export function PuzzleTrainerScreen() {
  const { solvedIds, currentStreak, bestStreak, recordResult, loaded } = usePuzzleProgress();

  const [puzzle, setPuzzle] = useState<Puzzle>(() => pickPuzzle([]));
  const [fen, setFen] = useState(puzzle.fen);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [overlay, setOverlay] = useState<Partial<Record<Square, SquareOverlayKind>>>({});
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [solved, setSolved] = useState(false);
  const [locked, setLocked] = useState(false); // the opponent's reply is being played out
  const [mistakes, setMistakes] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  // The very first puzzle is picked before storage has been read, so re-pick once solved ids arrive.
  const appliedInitialProgress = useRef(false);
  useEffect(() => {
    if (!loaded || appliedInitialProgress.current) return;
    appliedInitialProgress.current = true;
    if (solvedIds.includes(puzzle.id)) {
      const next = pickPuzzle(solvedIds);
      setPuzzle(next);
      setFen(next.fen);
    }
  }, [loaded, solvedIds, puzzle.id]);

  const position = useMemo(() => new Chess(fen), [fen]);
  const board = position.board();

  const startPuzzle = useCallback(
    (next: Puzzle) => {
      clearTimers();
      setPuzzle(next);
      setFen(next.fen);
      setStep(0);
      setSelected(null);
      setOverlay({});
      setLastMove(null);
      setSolved(false);
      setLocked(false);
      setMistakes(0);
    },
    [clearTimers]
  );

  const handleNextPuzzle = useCallback(() => {
    startPuzzle(pickPuzzle(solvedIds, puzzle.id));
  }, [startPuzzle, solvedIds, puzzle.id]);

  const handleRetry = useCallback(() => {
    startPuzzle(puzzle);
  }, [startPuzzle, puzzle]);

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (solved || locked) return;

      const chess = new Chess(fen);
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

      const expected = puzzle.solution[step];
      if (move.san !== expected) {
        // Wrong move: the position is left untouched, only the attempted square flashes red.
        setMistakes((prev) => prev + 1);
        if (mistakes === 0) recordResult(puzzle.id, false); // one streak reset per puzzle, not per attempt
        setOverlay({ [square]: 'wrong' });
        schedule(() => setOverlay({}), FEEDBACK_MS);
        return;
      }

      const fenAfterMove = chess.fen();
      setFen(fenAfterMove);
      setLastMove({ from: move.from as Square, to: move.to as Square });
      setOverlay({ [square]: 'correct' });
      schedule(() => setOverlay({}), FEEDBACK_MS);

      const reply = puzzle.solution[step + 1];
      if (!reply) {
        setStep(step + 1);
        setSolved(true);
        recordResult(puzzle.id, mistakes === 0);
        return;
      }

      setStep(step + 1);
      setLocked(true);
      schedule(() => {
        const afterReply = new Chess(fenAfterMove);
        const replyMove = afterReply.move(reply);
        setFen(afterReply.fen());
        setLastMove({ from: replyMove.from as Square, to: replyMove.to as Square });
        setStep(step + 2);
        setLocked(false);
      }, REPLY_MS);
    },
    [solved, locked, fen, selected, puzzle, step, mistakes, recordResult, schedule]
  );

  const legalTargets = useMemo(
    () => (selected ? position.moves({ square: selected, verbose: true }).map((move) => move.to as Square) : []),
    [position, selected]
  );

  const movesLeft = Math.ceil((puzzle.solution.length - step) / 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.metaRow}>
          <Text style={styles.theme}>{PUZZLE_THEME_LABELS[puzzle.theme]}</Text>
          <Text style={styles.difficulty}>{'★'.repeat(puzzle.difficulty)}</Text>
        </View>

        <Text style={styles.prompt}>
          {solved ? '정답입니다! 체크메이트.' : `백 차례 — ${movesLeft}수 안에 메이트하세요.`}
        </Text>

        <ChessBoard
          board={board}
          selectedSquare={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          squareOverlay={overlay}
          onSquarePress={handleSquarePress}
        />

        {mistakes > 0 && !solved && <Text style={styles.mistakeText}>틀렸습니다. 다시 시도해 보세요. (오답 {mistakes}회)</Text>}

        <View style={styles.buttonRow}>
          {solved ? (
            <Pressable style={styles.primaryButton} onPress={handleNextPuzzle}>
              <Text style={styles.primaryButtonText}>다음 퍼즐</Text>
            </Pressable>
          ) : (
            <>
              <Pressable style={styles.secondaryButton} onPress={handleRetry}>
                <Text style={styles.secondaryButtonText}>처음부터</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleNextPuzzle}>
                <Text style={styles.secondaryButtonText}>건너뛰기</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.progressText}>
          푼 퍼즐 {solvedIds.length}/{PUZZLES.length} · 연속 정답 {currentStreak} · 최고 {bestStreak}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  theme: {
    ...typography.heading,
  },
  difficulty: {
    ...typography.body,
    color: colors.warning,
  },
  prompt: {
    ...typography.body,
    color: colors.textMuted,
  },
  mistakeText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
