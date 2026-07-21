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
import { knownContinuations, lineForContinuation } from '../../data/openingTree';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { useEngine } from '../../engine/EngineProvider';
import { assessDeviation, type DeviationAssessment } from '../../engine/deviation';
import { ExploreMode } from './ExploreMode';
import { colors, radius, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningDetail'>;

/** A user move that left the saved line, while the engine judges it and the user decides what to do. */
type PendingDeviation = {
  fen: string;
  from: Square;
  to: Square;
  san: string;
  status: 'checking' | 'playable' | 'mistake';
  assessment?: DeviationAssessment;
};

function fmtCp(cp: number | null, mate: number | null): string {
  if (mate !== null) return `M${Math.abs(mate)}`;
  if (cp === null) return '—';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

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
  const { engine } = useEngine();

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
  // Off-book move under engine review + an active free-play session, once the user accepts one.
  const [deviation, setDeviation] = useState<PendingDeviation | null>(null);
  const [explore, setExplore] = useState<{ startFen: string } | null>(null);

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
    if (!opening || !line || finished || isUserTurn || wrongPosition || deviation) return;
    // At a branch point on the opponent's side, don't auto-play — let the user choose which reply to see.
    if (knownContinuations(opening, moves.slice(0, step)).length > 1) return;
    const hasNote = !!noteFor(opening.id, line.id, step);
    const teaches = hasNote || isNotable(annotations[step]?.quality ?? 'good');
    replyTimer.current = setTimeout(() => setStep((prev) => prev + 1), teaches ? OPPONENT_LESSON_MS : OPPONENT_REPLY_MS);
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, [opening, finished, isUserTurn, wrongPosition, deviation, step, line, moves, annotations]);

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
      if (!opening || wrongPosition || deviation) return;

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

      // The saved line's own next move: just advance.
      if (expected && move.san === expected.san) {
        setStep((prev) => prev + 1);
        return;
      }

      // A move that enters another known line (either side's choice): switch to it — its name shows at
      // the top — and keep studying. This is what lets the user find variations by playing, not picking.
      const switched = lineForContinuation(opening, moves.slice(0, step), move.san);
      if (switched) {
        if (replyTimer.current) clearTimeout(replyTimer.current);
        if (switched.id !== lineId) setLineId(switched.id);
        setStep((prev) => prev + 1);
        return;
      }

      // An unknown move. Judge the user's own moves; ignore an unknown opponent move for now.
      if (!isUserTurn) return;

      // Without the engine (offline / not yet loaded) keep the old "wrong" flash; with it, judge the
      // move — a sound one offers to continue, a bad one shows what it cost.
      if (!engine) {
        setWrongPosition({ fen: chess.fen(), from: move.from as Square, to: move.to as Square });
        showWrong();
        return;
      }
      const fenBefore = position.fen();
      const fenAfter = chess.fen();
      setDeviation({ fen: fenAfter, from: move.from as Square, to: move.to as Square, san: move.san, status: 'checking' });
      assessDeviation(engine, fenBefore, fenAfter)
        .then((assessment) =>
          setDeviation((current) =>
            current && current.fen === fenAfter
              ? { ...current, status: assessment.playable ? 'playable' : 'mistake', assessment }
              : current
          )
        )
        .catch(() => setDeviation((current) => (current && current.fen === fenAfter ? null : current)));
    },
    [opening, expected, wrongPosition, deviation, isUserTurn, position, selected, showWrong, engine, moves, step, lineId]
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

  if (explore && engine) {
    return <ExploreMode opening={opening} startFen={explore.startFen} engine={engine} onExit={() => setExplore(null)} />;
  }

  const saved = isSaved(opening.id);
  const flipped = opening.sideToLearn === 'b';

  const shownFen = deviation ? deviation.fen : wrongPosition ? wrongPosition.fen : null;
  const displayed = shownFen ? new Chess(shownFen) : position;
  const lastPlayed = step > 0 ? position.history({ verbose: true }).at(-1) : undefined;
  const lastMove = deviation
    ? { from: deviation.from, to: deviation.to }
    : wrongPosition
      ? { from: wrongPosition.from, to: wrongPosition.to }
      : lastPlayed
        ? { from: lastPlayed.from as Square, to: lastPlayed.to as Square }
        : null;

  // Best reply in SAN for the "mistake" message (position is the pre-move position).
  const bestSan = deviation?.assessment?.bestMove
    ? position.moves({ verbose: true }).find(
        (m) =>
          m.from === deviation.assessment!.bestMove!.slice(0, 2) &&
          m.to === deviation.assessment!.bestMove!.slice(2, 4)
      )?.san ?? deviation.assessment.bestMove
    : null;

  const dismissDeviation = () => {
    setDeviation(null);
    setSelected(null);
  };
  const continueInExplore = () => {
    if (!deviation) return;
    setExplore({ startFen: deviation.fen });
    setDeviation(null);
    setSelected(null);
  };

  // Play a known continuation (from a branch chip): switch to whichever line it enters, then advance.
  const playContinuation = (san: string) => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    const switched = lineForContinuation(opening, moves.slice(0, step), san);
    if (switched && switched.id !== lineId) setLineId(switched.id);
    setStep((prev) => prev + 1);
    setSelected(null);
  };

  // At an opponent branch point, the replies the user can pick between (each names the line it enters).
  const opponentReplies = !isUserTurn && !finished && !deviation && !wrongPosition
    ? knownContinuations(opening, moves.slice(0, step))
    : [];

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
          <View style={styles.lineCardHeader}>
            <View style={[styles.kindDot, { backgroundColor: LINE_KINDS[line.kind].color }]}>
              <Text style={styles.kindDotText}>{LINE_KINDS[line.kind].label}</Text>
            </View>
            <Text style={styles.lineCardTitle}>{line.name}</Text>
          </View>
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

        {opponentReplies.length > 1 && (
          <View style={styles.repliesCard}>
            <Text style={styles.repliesLabel}>상대의 응수를 선택해 보세요 (보드에서 직접 둬도 됩니다)</Text>
            <View style={styles.repliesRow}>
              {opponentReplies.map((reply) => {
                const target = lineForContinuation(opening, moves.slice(0, step), reply.san);
                return (
                  <Pressable key={reply.san} style={styles.replyChip} onPress={() => playContinuation(reply.san)}>
                    <Text style={styles.replyChipMove}>{reply.san}</Text>
                    {target && <Text style={styles.replyChipLine}>{target.name}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {deviation && (
          <View style={styles.promptCard}>
            {deviation.status === 'checking' && <Text style={styles.promptText}>이 수를 확인하는 중…</Text>}
            {deviation.status === 'playable' && deviation.assessment && (
              <>
                <Text style={styles.promptText}>
                  저장된 라인은 아니지만 둘 만한 수입니다 (평가 {fmtCp(deviation.assessment.evalWhite, deviation.assessment.mateWhite)}). 이 라인으로 계속 두시겠어요?
                </Text>
                <View style={styles.promptRow}>
                  <Pressable style={[styles.promptButton, styles.promptButtonPrimary]} onPress={continueInExplore}>
                    <Text style={styles.promptButtonTextPrimary}>계속 두기</Text>
                  </Pressable>
                  <Pressable style={styles.promptButton} onPress={dismissDeviation}>
                    <Text style={styles.promptButtonText}>정석대로</Text>
                  </Pressable>
                </View>
              </>
            )}
            {deviation.status === 'mistake' && deviation.assessment && (
              <>
                <Text style={styles.promptText}>
                  부정확한 수입니다. 최선은 {bestSan} · 약 {(deviation.assessment.cpLoss / 100).toFixed(1)}점 손해입니다 (평가 {fmtCp(deviation.assessment.evalWhite, deviation.assessment.mateWhite)}).
                </Text>
                <View style={styles.promptRow}>
                  <Pressable style={[styles.promptButton, styles.promptButtonPrimary]} onPress={dismissDeviation}>
                    <Text style={styles.promptButtonTextPrimary}>되돌리기</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.boardRow}>
          <EvalBar cp={barCp} flipped={flipped} />
          <ChessBoard
            board={displayed.board()}
            selectedSquare={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            arrow={wrongPosition || deviation || finished || !isUserTurn ? null : expected}
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
    gap: spacing.xs,
  },
  lineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lineCardTitle: {
    ...typography.heading,
    color: colors.text,
  },
  lineDescription: {
    ...typography.body,
    color: colors.text,
  },
  repliesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  repliesLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  repliesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  replyChip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  replyChipMove: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  replyChipLine: {
    ...typography.caption,
    color: colors.textMuted,
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
  promptCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  promptText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  promptRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promptButton: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  promptButtonPrimary: {
    backgroundColor: colors.primary,
  },
  promptButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  promptButtonTextPrimary: {
    ...typography.caption,
    color: '#fff',
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
