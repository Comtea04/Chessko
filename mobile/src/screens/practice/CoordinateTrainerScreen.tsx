import { useCallback, useEffect, useRef, useState } from 'react';
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

const FEEDBACK_MS = 350;
/** Accuracy from a handful of taps is noise, so it only counts toward the record after a real sample. */
const MIN_ATTEMPTS_FOR_ACCURACY = 10;

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
  // While feedback is showing, the target hasn't advanced yet — further taps would score the same target twice.
  const [locked, setLocked] = useState(false);

  const accuracy = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 0;

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The session's result is saved when the user leaves the screen too, not only via the button.
  const sessionRef = useRef({ streak: 0, accuracy: 0, attempts: 0 });
  sessionRef.current = { streak, accuracy, attempts };
  const recordSessionRef = useRef(recordSession);
  recordSessionRef.current = recordSession;

  const commitSession = useCallback(() => {
    const { streak: s, accuracy: acc, attempts: att } = sessionRef.current;
    if (att === 0) return;
    recordSessionRef.current(s, att >= MIN_ATTEMPTS_FOR_ACCURACY ? acc : 0);
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      commitSession();
    },
    [commitSession]
  );

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (locked) return;

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

      setLocked(true);
      feedbackTimer.current = setTimeout(() => {
        setOverlay({});
        setTarget((prev) => {
          let next = randomSquare();
          while (next === prev) next = randomSquare();
          return next;
        });
        setLocked(false);
      }, FEEDBACK_MS);
    },
    [locked, target]
  );

  const handleFinishSession = useCallback(() => {
    commitSession();
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setStreak(0);
    setAttempts(0);
    setCorrectCount(0);
    setOverlay({});
    setLocked(false);
    setTarget(randomSquare());
  }, [commitSession]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="좌표 연습" subtitle="화면에 나온 좌표를 보드에서 찾아 탭하세요" />
      <View style={styles.container}>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>스트릭 {streak}</Text>
          <Text style={styles.statText}>
            {correctCount}/{attempts} · {accuracy}%
          </Text>
        </View>

        <Text style={styles.target}>{target}</Text>

        <ChessBoard
          board={EMPTY_BOARD}
          selectedSquare={null}
          legalTargets={[]}
          lastMove={null}
          squareOverlay={overlay}
          onSquarePress={handleSquarePress}
        />

        <Pressable style={styles.finishButton} onPress={handleFinishSession}>
          <Text style={styles.finishButtonText}>세션 종료 및 기록 저장</Text>
        </Pressable>

        <Text style={styles.bestText}>
          최고 스트릭 {bestStreak} · 최고 정확도 {bestAccuracy}%
        </Text>
        <Text style={styles.noteText}>정확도 기록은 {MIN_ATTEMPTS_FOR_ACCURACY}회 이상 시도한 세션만 반영됩니다.</Text>
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
  noteText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
});
