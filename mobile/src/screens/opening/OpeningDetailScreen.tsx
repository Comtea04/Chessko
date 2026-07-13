import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chess, type Square } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { getOpeningById } from '../../data/openings';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { colors, radius, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningDetail'>;

const WRONG_MOVE_HOLD_MS = 520;
const OPPONENT_REPLY_MS = 650;

function positionAfter(moves: string[], count: number): Chess {
  const chess = new Chess();
  for (let i = 0; i < count; i++) chess.move(moves[i]);
  return chess;
}

/** chess.js needs an explicit promotion piece; opening lines never underpromote. */
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

export function OpeningDetailScreen({ route, navigation }: Props) {
  const opening = getOpeningById(route.params.openingId);
  const { isSaved, toggleSaved } = useSavedOpenings();

  const moves = useMemo(() => opening?.moves ?? [], [opening]);
  // 0 when the user studies white, 1 when black: the parity of the steps they play themselves.
  const userParity = opening?.sideToLearn === 'b' ? 1 : 0;

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  // A move that strays from the line is shown for a beat, then taken back.
  const [wrongPosition, setWrongPosition] = useState<{ fen: string; from: Square; to: Square } | null>(null);

  const flash = useRef(new Animated.Value(0)).current;
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current);
      if (replyTimer.current) clearTimeout(replyTimer.current);
    },
    []
  );

  const position = useMemo(() => positionAfter(moves, step), [moves, step]);

  const finished = step >= moves.length;
  const isUserTurn = !finished && step % 2 === userParity;

  // The opponent's moves are not something to memorise, so they play themselves.
  useEffect(() => {
    if (finished || isUserTurn || wrongPosition) return;
    replyTimer.current = setTimeout(() => setStep((prev) => prev + 1), OPPONENT_REPLY_MS);
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, [finished, isUserTurn, wrongPosition, step]);

  const expected = useMemo(() => {
    const san = moves[step];
    if (!san) return null;
    const move = position.moves({ verbose: true }).find((candidate) => candidate.san === san);
    return move ? { san, from: move.from as Square, to: move.to as Square } : null;
  }, [moves, step, position]);

  const showWrong = useCallback(() => {
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.delay(140),
      Animated.timing(flash, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setWrongPosition(null), WRONG_MOVE_HOLD_MS);
  }, [flash]);

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (!expected || wrongPosition || !isUserTurn) return;

      const chess = new Chess(position.fen());
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

      if (move.san === expected.san) {
        setStep((prev) => prev + 1);
        return;
      }

      setWrongPosition({ fen: chess.fen(), from: move.from as Square, to: move.to as Square });
      showWrong();
    },
    [expected, wrongPosition, isUserTurn, position, selected, showWrong]
  );

  const goNext = useCallback(() => {
    if (wrongPosition || step >= moves.length) return;
    setSelected(null);
    setStep((prev) => prev + 1);
  }, [wrongPosition, step, moves.length]);

  const goPrevious = useCallback(() => {
    if (wrongPosition || step === 0) return;
    setSelected(null);
    // Land on a step the user plays; stopping on an opponent step would just auto-advance again.
    setStep((prev) => {
      const target = prev - 1;
      return target > 0 && target % 2 !== userParity ? target - 1 : target;
    });
  }, [wrongPosition, step, userParity]);

  const restart = useCallback(() => {
    if (revertTimer.current) clearTimeout(revertTimer.current);
    setWrongPosition(null);
    setSelected(null);
    setStep(0);
  }, []);

  if (!opening) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.notFound}>오프닝을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const saved = isSaved(opening.id);
  const flipped = opening.sideToLearn === 'b';

  const displayed = wrongPosition ? new Chess(wrongPosition.fen) : position;
  const lastPlayed = step > 0 ? positionAfter(moves, step).history({ verbose: true }).at(-1) : undefined;
  const lastMove = wrongPosition
    ? { from: wrongPosition.from, to: wrongPosition.to }
    : lastPlayed
      ? { from: lastPlayed.from as Square, to: lastPlayed.to as Square }
      : null;

  const legalTargets = selected
    ? displayed.moves({ square: selected, verbose: true }).map((move) => move.to as Square)
    : [];

  const moveNumber = Math.floor(step / 2) + 1;
  const sideToMove = step % 2 === 0 ? '백' : '흑';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={typography.title}>{opening.name}</Text>
            <Text style={styles.eco}>
              {opening.eco} · {opening.category} · {flipped ? '흑' : '백'} 오프닝
            </Text>
          </View>
          <Pressable style={[styles.saveButton, saved && styles.saveButtonActive]} onPress={() => toggleSaved(opening.id)}>
            <Text style={[styles.saveButtonText, saved && styles.saveButtonTextActive]}>{saved ? '★ 저장됨' : '☆ 저장'}</Text>
          </Pressable>
        </View>

        <Text style={styles.description}>{opening.description}</Text>

        <View style={styles.stepCard}>
          {finished ? (
            <Text style={styles.stepTitle}>수순 완료! 총 {moves.length}수를 모두 따라갔습니다.</Text>
          ) : isUserTurn ? (
            <>
              <Text style={styles.stepTitle}>
                {moveNumber}. {sideToMove} — {expected?.san}
              </Text>
              <Text style={styles.stepHint}>
                {expected ? `${expected.from} → ${expected.to} 화살표대로 말을 옮기거나, '다음'을 누르세요.` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.stepTitle}>
                {moveNumber}. {sideToMove} — {expected?.san}
              </Text>
              <Text style={styles.stepHint}>상대의 수입니다. 잠시 후 자동으로 둡니다…</Text>
            </>
          )}
          <Text style={styles.stepCounter}>
            {step} / {moves.length} 수
          </Text>
        </View>

        <ChessBoard
          board={displayed.board()}
          selectedSquare={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          arrow={wrongPosition || finished || !isUserTurn ? null : expected}
          flipped={flipped}
          onSquarePress={handleSquarePress}
        />

        <View style={styles.navRow}>
          <Pressable style={[styles.navButton, step === 0 && styles.navButtonDisabled]} onPress={goPrevious} disabled={step === 0}>
            <Text style={styles.navButtonText}>◀ 이전</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={restart}>
            <Text style={styles.navButtonText}>처음부터</Text>
          </Pressable>
          <Pressable style={[styles.navButton, finished && styles.navButtonDisabled]} onPress={goNext} disabled={finished}>
            <Text style={styles.navButtonText}>다음 ▶</Text>
          </Pressable>
        </View>

        <Pressable style={styles.analyzeButton} onPress={() => navigation.navigate('Analysis', { initialFen: displayed.fen() })}>
          <Text style={styles.analyzeButtonText}>이 포지션 분석하기</Text>
        </Pressable>
      </ScrollView>

      <Animated.View pointerEvents="none" style={[styles.wrongFlash, { opacity: flash }]} />
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
  notFound: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  eco: {
    ...typography.caption,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    width: '100%',
  },
  saveButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  saveButtonActive: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  saveButtonTextActive: {
    color: colors.surface,
  },
  stepCard: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  stepTitle: {
    ...typography.heading,
    color: colors.primaryDark,
  },
  stepHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textMuted,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  analyzeButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  analyzeButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  wrongFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 6,
    borderColor: colors.danger,
    borderRadius: radius.sm,
  },
});
