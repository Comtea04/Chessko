import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chess } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { learnSides, plainSan, type Opening, type OpeningLine } from '../../data/openings';
import { OPENINGS } from '../../data/openingsRuntime';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { colors, radius, spacing, typography } from '../../theme';
import type { PracticeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PracticeStackParamList, 'OpeningRecall'>;

const CHOICE_COUNT = 4;

interface Question {
  opening: Opening;
  line: OpeningLine;
  /** The side being quizzed — the opening's own, or one of the two for a both-sides opening. */
  side: 'w' | 'b';
  /** Number of moves already played; the answer is the move at this index. */
  step: number;
  fen: string;
  answer: string;
  choices: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Asks for a move played by the side the user is studying: with a white opening the question
 * always lands on a white move, so the user recalls their own choices, not the opponent's. An
 * opening studied from both sides draws a side per question, since both halves are the user's to
 * know. Every line of an opening is fair game — including the ones that punish a mistake, which is
 * where remembering the exact move matters most.
 */
function buildQuestion(openings: Opening[]): Question | null {
  const pool = shuffle(openings.flatMap((opening) => opening.lines.map((line) => ({ opening, line }))));

  for (const { opening, line } of pool) {
    const sides = learnSides(opening);
    const side = sides[Math.floor(Math.random() * sides.length)];
    const parity = side === 'w' ? 0 : 1;
    const moves = line.moves.map(plainSan);
    const steps = moves.map((_, index) => index).filter((index) => index % 2 === parity);
    if (steps.length === 0) continue;

    const step = steps[Math.floor(Math.random() * steps.length)];

    const chess = new Chess();
    for (let i = 0; i < step; i++) chess.move(moves[i]);

    const answer = moves[step];
    const distractors = shuffle(chess.moves().filter((san) => san !== answer)).slice(0, CHOICE_COUNT - 1);
    if (distractors.length === 0) continue;

    return {
      opening,
      line,
      side,
      step,
      fen: chess.fen(),
      answer,
      choices: shuffle([answer, ...distractors]),
    };
  }

  return null;
}

export function OpeningRecallScreen({ navigation }: Props) {
  const { savedIds, loaded } = useSavedOpenings();

  const savedOpenings = useMemo(() => OPENINGS.filter((opening) => savedIds.includes(opening.id)), [savedIds]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Every saved opening is in play by default; the user can narrow it down with the chips.
  useEffect(() => {
    if (loaded) setSelectedIds(savedIds);
  }, [loaded, savedIds]);

  const selectedOpenings = useMemo(
    () => savedOpenings.filter((opening) => selectedIds.includes(opening.id)),
    [savedOpenings, selectedIds]
  );

  const nextQuestion = useCallback(() => {
    setPicked(null);
    setQuestion(buildQuestion(selectedOpenings));
  }, [selectedOpenings]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]));
  }, []);

  const handleAnswer = useCallback(
    (san: string) => {
      if (!question || picked) return;
      setPicked(san);
      setScore((prev) => ({ correct: prev.correct + (san === question.answer ? 1 : 0), total: prev.total + 1 }));
    },
    [question, picked]
  );

  if (loaded && savedOpenings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={typography.heading}>저장한 오프닝이 없습니다</Text>
          <Text style={styles.emptyText}>
            오프닝 탭에서 공부한 오프닝을 ★로 저장하면, 여기서 그 수순을 기억하는지 확인할 수 있습니다.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('PracticeHome')}>
            <Text style={styles.primaryButtonText}>연습 홈으로</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCorrect = picked !== null && question !== null && picked === question.answer;
  const position = question ? new Chess(picked && isCorrect ? applyAnswer(question) : question.fen) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="오프닝 수순 퀴즈" subtitle="저장한 오프닝에서 다음 수를 골라보세요" />

        <View style={styles.chipRow}>
          {savedOpenings.map((opening) => {
            const on = selectedIds.includes(opening.id);
            return (
              <Pressable
                key={opening.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggleSelected(opening.id)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{opening.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {!question ? (
          <View style={styles.startBlock}>
            <Text style={styles.startText}>
              {selectedOpenings.length === 0
                ? '퀴즈에 포함할 오프닝을 하나 이상 선택하세요.'
                : `${selectedOpenings.length}개 오프닝에서 문제를 냅니다.`}
            </Text>
            <Pressable
              style={[styles.primaryButton, selectedOpenings.length === 0 && styles.buttonDisabled]}
              onPress={nextQuestion}
              disabled={selectedOpenings.length === 0}
            >
              <Text style={styles.primaryButtonText}>퀴즈 시작</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.questionCard}>
              <Text style={styles.questionOpening}>{question.opening.name}</Text>
              <Text style={styles.questionPrompt}>
                {question.line.name} · {Math.floor(question.step / 2) + 1}수째 ·{' '}
                {question.side === 'w' ? '백' : '흑'} 차례 — 다음 수는?
              </Text>
            </View>

            {position && (
              <ChessBoard
                board={position.board()}
                selectedSquare={null}
                legalTargets={[]}
                lastMove={null}
                flipped={question.side === 'b'}
                onSquarePress={() => {}}
              />
            )}

            <View style={styles.choices}>
              {question.choices.map((san) => {
                const chosen = picked === san;
                const revealAnswer = picked !== null && san === question.answer;
                return (
                  <Pressable
                    key={san}
                    style={[
                      styles.choice,
                      revealAnswer && styles.choiceCorrect,
                      chosen && !revealAnswer && styles.choiceWrong,
                    ]}
                    onPress={() => handleAnswer(san)}
                    disabled={picked !== null}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        (revealAnswer || (chosen && !revealAnswer)) && styles.choiceTextActive,
                      ]}
                    >
                      {san}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {picked !== null && (
              <Text style={isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}>
                {isCorrect ? '정답입니다!' : `아쉽네요. 정답은 ${question.answer} 입니다.`}
              </Text>
            )}

            <Pressable style={styles.primaryButton} onPress={nextQuestion}>
              <Text style={styles.primaryButtonText}>{picked === null ? '건너뛰기' : '다음 문제'}</Text>
            </Pressable>

            <Text style={styles.score}>
              {score.correct} / {score.total} 정답
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Position after the correct move, so a right answer shows the resulting board. */
function applyAnswer(question: Question): string {
  const chess = new Chess(question.fen);
  chess.move(question.answer);
  return chess.fen();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chipTextOn: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  startBlock: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  startText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  questionCard: {
    width: '90%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  questionOpening: {
    ...typography.heading,
    color: colors.primaryDark,
  },
  questionPrompt: {
    ...typography.caption,
    color: colors.textMuted,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  choice: {
    minWidth: 84,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  choiceCorrect: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  choiceWrong: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  choiceText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  choiceTextActive: {
    color: colors.surface,
  },
  feedbackCorrect: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '700',
  },
  feedbackWrong: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  score: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
