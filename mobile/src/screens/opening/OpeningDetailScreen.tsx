import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chess, type Square } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { EvalBar } from '../../components/EvalBar';
import { MoveQualityBadge, QUALITY_STYLES } from '../../components/MoveQualityBadge';
import { annotationsFor, evalCp, formatEval, isNotable } from '../../data/openingAnnotations';
import { getLine, getOpeningById, plainSan, type LineKind, type OpeningLine } from '../../data/openings';
import { noteFor, type MoveNote } from '../../data/openingNotes';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { colors, radius, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningDetail'>;

const WRONG_MOVE_HOLD_MS = 520;
const OPPONENT_REPLY_MS = 650;
/** A move that carries a lesson — a blunder, a note — needs time to be read before it lands. */
const OPPONENT_LESSON_MS = 1900;

const LINE_KINDS: Record<LineKind, { label: string; color: string }> = {
  main: { label: '메인', color: colors.primary },
  variation: { label: '변형', color: colors.accent },
  punish: { label: '응징', color: colors.danger },
};

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

function moveLabel(ply: number, san: string): string {
  const number = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${number}. ${san}` : `${number}... ${san}`;
}

const REFERENCE_ICON: Record<string, string> = {
  explorer: '📊',
  study: '📖',
  article: '🔗',
  book: '📕',
  video: '▶️',
};

/** The teaching text for the move on the board, with its sources as tappable links. */
function NoteView({ note }: { note: MoveNote | undefined }) {
  if (!note) return null;
  return (
    <View style={styles.noteBlock}>
      <Text style={styles.noteText}>{note.text}</Text>
      {note.refs.length > 0 && (
        <View style={styles.noteRefs}>
          {note.refs.map((ref, index) => (
            <Pressable key={`${ref.url}-${index}`} onPress={() => Linking.openURL(ref.url)} hitSlop={6}>
              <Text style={styles.refChip}>
                {REFERENCE_ICON[ref.kind] ?? '🔗'} {ref.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function OpeningDetailScreen({ route, navigation }: Props) {
  const opening = getOpeningById(route.params.openingId);
  const { isSaved, toggleSaved } = useSavedOpenings();

  const [lineId, setLineId] = useState(opening?.lines[0]?.id ?? '');
  const line: OpeningLine | undefined = opening && getLine(opening, lineId);

  // The annotations are indexed by ply, exactly like the moves they grade.
  const annotations = useMemo(() => (opening && line ? annotationsFor(opening, line) : []), [opening, line]);
  const moves = useMemo(() => line?.moves.map(plainSan) ?? [], [line]);
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

  // The opponent's moves are not something to memorise, so they play themselves. A mistake the line
  // exists to punish is held on screen longer — it is the whole point of watching it be played.
  useEffect(() => {
    if (finished || isUserTurn || wrongPosition) return;
    const hasNote = !!(opening && line && noteFor(opening.id, line.id, step));
    const teaches = hasNote || isNotable(annotations[step]?.quality ?? 'good');
    replyTimer.current = setTimeout(() => setStep((prev) => prev + 1), teaches ? OPPONENT_LESSON_MS : OPPONENT_REPLY_MS);
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, [finished, isUserTurn, wrongPosition, step, line, annotations]);

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

  const jumpTo = useCallback((target: number) => {
    if (revertTimer.current) clearTimeout(revertTimer.current);
    setWrongPosition(null);
    setSelected(null);
    setStep(target);
  }, []);

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

  const selectLine = useCallback((id: string) => {
    setLineId(id);
    jumpTo(0);
  }, [jumpTo]);

  if (!opening || !line) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.notFound}>오프닝을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const saved = isSaved(opening.id);
  const flipped = opening.sideToLearn === 'b';

  const displayed = wrongPosition ? new Chess(wrongPosition.fen) : position;
  const lastPlayed = step > 0 ? position.history({ verbose: true }).at(-1) : undefined;
  const lastMove = wrongPosition
    ? { from: wrongPosition.from, to: wrongPosition.to }
    : lastPlayed
      ? { from: lastPlayed.from as Square, to: lastPlayed.to as Square }
      : null;

  const legalTargets = selected
    ? displayed.moves({ square: selected, verbose: true }).map((move) => move.to as Square)
    : [];

  const previous = step > 0 ? annotations[step - 1] : undefined;
  const upcoming = finished ? undefined : annotations[step];
  // The start position is dead equal; every later bar reading comes from the move that produced it.
  const barCp = step === 0 ? 0 : evalCp(previous);

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineTabs}>
          {opening.lines.map((candidate) => {
            const active = candidate.id === line.id;
            const kind = LINE_KINDS[candidate.kind];
            return (
              <Pressable
                key={candidate.id}
                style={[styles.lineTab, active && { borderColor: kind.color, backgroundColor: colors.surface }]}
                onPress={() => selectLine(candidate.id)}
              >
                <View style={[styles.kindDot, { backgroundColor: kind.color }]}>
                  <Text style={styles.kindDotText}>{kind.label}</Text>
                </View>
                <Text style={[styles.lineTabText, active && styles.lineTabTextActive]}>{candidate.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.lineCard}>
          <Text style={styles.lineDescription}>{line.description}</Text>
          {line.branchPly > 0 && (
            <Text style={styles.branchNote}>
              메인라인에서 {Math.floor(line.branchPly / 2) + 1}수째 {line.branchPly % 2 === 0 ? '백' : '흑'}의 수부터 갈라집니다.
            </Text>
          )}
        </View>

        <View style={styles.stepCard}>
          {step > 0 && previous && (
            <View style={styles.moveBlock}>
              <View style={styles.moveHeader}>
                <Text style={styles.moveCaption}>직전 수</Text>
                <Text style={styles.moveSan}>{moveLabel(step - 1, moves[step - 1])}</Text>
                {isNotable(previous.quality) && <MoveQualityBadge quality={previous.quality} withLabel />}
                {formatEval(previous) && <Text style={styles.evalText}>{formatEval(previous)}</Text>}
              </View>
              <NoteView note={noteFor(opening.id, line.id, step - 1)} />
              {previous.betterSan && (
                <Text style={styles.betterText}>엔진이 더 좋다고 보는 수: {previous.betterSan}</Text>
              )}
            </View>
          )}

          {finished ? (
            <Text style={styles.finishedText}>수순 완료! {line.name} {moves.length}수를 모두 따라갔습니다.</Text>
          ) : (
            <View style={styles.moveBlock}>
              <View style={styles.moveHeader}>
                <Text style={styles.moveCaption}>{isUserTurn ? '내 차례' : '상대 차례'}</Text>
                <Text style={[styles.moveSan, styles.moveSanNext]}>{moveLabel(step, moves[step])}</Text>
                {upcoming && isNotable(upcoming.quality) && <MoveQualityBadge quality={upcoming.quality} withLabel />}
              </View>
              <NoteView note={noteFor(opening.id, line.id, step)} />
              <Text style={styles.stepHint}>
                {isUserTurn
                  ? expected
                    ? `화살표대로 ${expected.from} → ${expected.to}로 옮기거나 '다음'을 누르세요.`
                    : ''
                  : '상대의 수입니다. 잠시 후 자동으로 둡니다…'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.boardRow}>
          <EvalBar cp={barCp} flipped={flipped} />
          <ChessBoard
            board={displayed.board()}
            selectedSquare={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            arrow={wrongPosition || finished || !isUserTurn ? null : expected}
            flipped={flipped}
            onSquarePress={handleSquarePress}
          />
        </View>

        <View style={styles.strip}>
          {moves.map((san, ply) => {
            const annotation = annotations[ply];
            const played = ply < step;
            const notable = annotation && isNotable(annotation.quality);
            return (
              <Pressable
                key={`${ply}-${san}`}
                style={[styles.stripMove, played && styles.stripMovePlayed, ply === step && styles.stripMoveCurrent]}
                onPress={() => jumpTo(ply)}
              >
                <Text style={[styles.stripText, played && styles.stripTextPlayed]}>{moveLabel(ply, san)}</Text>
                {notable && (
                  <Text style={[styles.stripMark, { color: QUALITY_STYLES[annotation.quality].color }]}>
                    {QUALITY_STYLES[annotation.quality].symbol}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.navRow}>
          <Pressable style={[styles.navButton, step === 0 && styles.navButtonDisabled]} onPress={goPrevious} disabled={step === 0}>
            <Text style={styles.navButtonText}>◀ 이전</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => jumpTo(0)}>
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
    paddingBottom: spacing.xxl,
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
  lineTabs: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lineTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  kindDot: {
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  kindDotText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  lineTabText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  lineTabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  lineCard: {
    width: '100%',
    gap: 2,
  },
  lineDescription: {
    ...typography.body,
    color: colors.text,
  },
  branchNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stepCard: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  moveBlock: {
    gap: 2,
  },
  moveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moveCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  moveSan: {
    ...typography.heading,
    color: colors.text,
  },
  moveSanNext: {
    color: colors.primaryDark,
  },
  evalText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  noteBlock: {
    gap: spacing.xs,
  },
  noteText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  noteRefs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  refChip: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  betterText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  stepHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  finishedText: {
    ...typography.heading,
    color: colors.primaryDark,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strip: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  stripMove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  stripMovePlayed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  stripMoveCurrent: {
    borderColor: colors.primary,
  },
  stripText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stripTextPlayed: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  stripMark: {
    fontSize: 11,
    fontWeight: '800',
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
