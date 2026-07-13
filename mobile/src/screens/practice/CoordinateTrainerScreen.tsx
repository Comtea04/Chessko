import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { Chess, Square } from 'chess.js';

import { ChessBoard, type SquareOverlayKind } from '../../components/ChessBoard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTrainerStats } from '../../storage/useTrainerStats';
import { colors, radius, spacing, typography } from '../../theme';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
// ChessBoard takes chess.js' board shape; an all-null grid is the empty board it expects.
const EMPTY_BOARD: ReturnType<Chess['board']> = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

function randomSquare(): Square {
  const file = FILES[Math.floor(Math.random() * 8)];
  const rank = RANKS[Math.floor(Math.random() * 8)];
  return `${file}${rank}` as Square;
}

export function CoordinateTrainerScreen() {
  const { bestStreak, bestAccuracy, recordSession } = useTrainerStats();
  const [target, setTarget] = useState<Square>(() => randomSquare());
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [overlay, setOverlay] = useState<Partial<Record<Square, SquareOverlayKind>>>({});

  const accuracy = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 0;

  const nextTarget = useCallback((exclude: Square) => {
    let next = randomSquare();
    while (next === exclude) next = randomSquare();
    setTarget(next);
  }, []);

  const handleSquarePress = useCallback(
    (square: Square) => {
      const isCorrect = square === target;
      setAttempts((prev) => prev + 1);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setStreak((prev) => prev + 1);
        setOverlay({ [square]: 'correct' });
      } else {
        setStreak(0);
        setOverlay({ [square]: 'wrong', [target]: 'hint' });
      }
      setTimeout(() => {
        setOverlay({});
        nextTarget(target);
      }, 350);
    },
    [target, nextTarget]
  );

  const handleFinishSession = useCallback(() => {
    if (attempts > 0) {
      recordSession(streak, accuracy);
    }
    setStreak(0);
    setAttempts(0);
    setCorrectCount(0);
    setOverlay({});
    nextTarget(target);
  }, [attempts, streak, accuracy, recordSession, nextTarget, target]);

  const boardMemo = useMemo(() => EMPTY_BOARD, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="좌표 연습" subtitle="화면에 나온 좌표를 보드에서 찾아 탭하세요" />
      <View style={styles.container}>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>현재 스트릭 {streak}</Text>
          <Text style={styles.statText}>정확도 {accuracy}%</Text>
        </View>

        <Text style={styles.target}>{target}</Text>

        <ChessBoard
          board={boardMemo}
          selectedSquare={null}
          legalTargets={[]}
          lastMove={null}
          squareOverlay={overlay}
          onSquarePress={handleSquarePress}
        />

        <Pressable style={styles.finishButton} onPress={handleFinishSession}>
          <Text style={styles.finishButtonText}>세션 종료 및 기록 저장</Text>
        </Pressable>

        <Text style={styles.bestText}>최고 스트릭 {bestStreak} · 최고 정확도 {bestAccuracy}%</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statText: {
    ...typography.body,
    fontWeight: '700',
  },
  target: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
  },
  finishButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  finishButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  bestText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
