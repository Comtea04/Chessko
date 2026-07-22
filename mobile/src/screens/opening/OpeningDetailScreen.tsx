import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chess, type Square } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { EvalBar } from '../../components/EvalBar';
import { QUALITY_STYLES } from '../../components/MoveQualityBadge';
import { annotationsFor, evalCp, isNotable } from '../../data/openingAnnotations';
import { plainSan, type LineKind, type OpeningLine } from '../../data/openings';
import { getLine, getOpeningById } from '../../data/openingsRuntime';
import { noteFor, type MoveNote } from '../../data/openingNotes';
import { knownContinuations, lineForContinuation, lineTree } from '../../data/openingTree';
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
  // Which side the user is playing. An opening is curated for one colour, but every line has two
  // sides to it: the Two Knights studied as white is the same moves black has to know. Flipping the
  // board hands the line's other half to the user and auto-plays what they were playing before.
  const [perspective, setPerspective] = useState<'w' | 'b'>(opening?.sideToLearn ?? 'w');
  const line: OpeningLine | undefined = opening && getLine(opening, lineId);
  const saved = opening ? isSaved(opening.id) : false;

  // The nav header carries the identity: opening name as the title, the full tree path as the
  // subtitle (it updates as the user branches), save on the right, and just the back button on the left.
  useLayoutEffect(() => {
    if (!opening || !line) return;
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navHeader}>
          <Text style={styles.navTitle} numberOfLines={1}>{opening.name}</Text>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            {opening.category} › {opening.name} › {line.name}
          </Text>
        </View>
      ),
      headerRight: () => (
        <Pressable onPress={() => toggleSaved(opening.id)} hitSlop={8}>
          <Text style={styles.navSave}>{saved ? '★' : '☆'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, opening, line, saved, toggleSaved]);

  // The annotations are indexed by ply, exactly like the moves they grade.
  const annotations = useMemo(() => (opening && line ? annotationsFor(opening, line) : []), [opening, line]);
  const moves = useMemo(() => line?.moves.map(plainSan) ?? [], [line]);
  // 0 when the user studies white, 1 when black: the parity of the steps they play themselves.
  const userParity = perspective === 'b' ? 1 : 0;

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  // A move that strays from the line is shown for a beat, then taken back.
  const [wrongPosition, setWrongPosition] = useState<{ fen: string; from: Square; to: Square } | null>(null);
  // Off-book move under engine review + an active free-play session, once the user accepts one.
  const [deviation, setDeviation] = useState<PendingDeviation | null>(null);
  const [explore, setExplore] = useState<{ startFen: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  // The opponent's moves aren't memorised, so they normally play themselves. But hold when there's
  // something to read: a branch to choose, or a comment on the move just played — otherwise the reply
  // lands a second later, right over the comment explaining the move that led to it.
  useEffect(() => {
    if (!opening || !line || finished || isUserTurn || wrongPosition || deviation) return;
    if (knownContinuations(opening, moves.slice(0, step)).length > 1) return;
    if (step > 0 && noteFor(opening, line, step - 1)) return;
    replyTimer.current = setTimeout(() => setStep((prev) => prev + 1), OPPONENT_REPLY_MS);
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, [opening, finished, isUserTurn, wrongPosition, deviation, step, line, moves]);

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
    setPickerOpen(false);
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
    return (
      <ExploreMode
        opening={opening}
        perspective={perspective}
        startFen={explore.startFen}
        engine={engine}
        onExit={() => setExplore(null)}
      />
    );
  }

  const flipped = perspective === 'b';

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

  // The known moves on offer here, each naming the line it enters. Two cases: the opponent is to move
  // and has more than one book reply, or the line has run out at a fork — lines like 투 나이츠 디펜스
  // stop at the tabiya their variations branch from, and carry on through one of those.
  const forks = (finished || !isUserTurn) && !deviation && !wrongPosition
    ? knownContinuations(opening, moves.slice(0, step))
    : [];
  const atFork = finished && forks.length > 0;

  // The commentary on the move that produced the current position.
  const note = step > 0 ? noteFor(opening, line, step - 1) : undefined;

  // Opponent's turn, holding for the user to read a comment before advancing (matches the effect).
  const awaitingAdvance =
    !isUserTurn && !finished && !wrongPosition && !deviation && forks.length <= 1 && !!note;

  const legalTargets = selected
    ? displayed.moves({ square: selected, verbose: true }).map((move) => move.to as Square)
    : [];

  const previous = step > 0 ? annotations[step - 1] : undefined;
  // The start position is dead equal; every later bar reading comes from the move that produced it.
  const barCp = step === 0 ? 0 : evalCp(previous);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.pickerRow}>
          <Pressable style={styles.linePicker} onPress={() => setPickerOpen(true)}>
            <View style={[styles.kindDot, { backgroundColor: LINE_KINDS[line.kind].color }]}>
              <Text style={styles.kindDotText}>{LINE_KINDS[line.kind].label}</Text>
            </View>
            <Text style={styles.linePickerText} numberOfLines={1}>{line.name}</Text>
            <Text style={styles.linePickerChevron}>▾</Text>
          </Pressable>
          {/* Flipping the board swaps which half of the line the user plays — the same moves, learned
              from the other side. Every line has both, so this needs no per-opening data. */}
          <Pressable style={styles.flipButton} onPress={() => setPerspective((side) => (side === 'w' ? 'b' : 'w'))}>
            <Text style={styles.flipButtonText}>{flipped ? '흑' : '백'} ⇅</Text>
          </Pressable>
        </View>

        {/* The line's name and kind are on the picker above and in the nav subtitle, so only the move
            this line branches off — which nothing else on the screen says — gets a line here. */}
        {line.branchPly > 0 && (
          <Text style={styles.branchNote}>
            {moveLabel(line.branchPly, plainSan(line.moves[line.branchPly]))}부터 갈라지는 라인입니다.
          </Text>
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

        {/* Only what the rest of the screen doesn't already say. The move itself and its quality mark
            are on the strip below; its evaluation is on the bar beside the board. */}
        {(note || previous?.betterSan || (finished && !atFork) || awaitingAdvance) && (
          <View style={styles.stepCard}>
            <NoteView note={note} />
            {previous?.betterSan && (
              <Text style={styles.betterText}>엔진이 더 좋다고 보는 수: {previous.betterSan}</Text>
            )}
            {finished && !atFork && (
              <Text style={styles.finishedText}>수순 완료! {line.name} {moves.length}수를 모두 따라갔습니다.</Text>
            )}
            {awaitingAdvance && (
              <Text style={styles.opponentHint}>상대 차례 — 다음 ▶ 을 눌러 응수를 봅니다</Text>
            )}
          </View>
        )}

        {(atFork || forks.length > 1) && (
          <View style={styles.repliesCard}>
            <Text style={styles.repliesLabel}>
              {atFork
                ? '여기서 라인이 갈라집니다 — 이어서 공부할 라인을 고르세요 (보드에서 직접 둬도 됩니다)'
                : '상대의 응수를 선택해 보세요 (보드에서 직접 둬도 됩니다)'}
            </Text>
            <View style={styles.repliesRow}>
              {forks.map((reply) => {
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

        <Pressable style={styles.analyzeButton} onPress={() => navigation.navigate('Analysis', { initialFen: displayed.fen() })}>
          <Text style={styles.analyzeButtonText}>이 포지션 분석하기</Text>
        </Pressable>
      </ScrollView>

      {/* Stepping through the line is the whole point of the screen, so the controls sit outside the
          scroll view — "다음 ▶" is always at the bottom of the screen, never scrolled off. */}
      <View style={styles.navRow}>
        <Pressable style={[styles.navButton, step === 0 && styles.navButtonDisabled]} onPress={goPrevious} disabled={step === 0}>
          <Text style={styles.navButtonText}>◀ 이전</Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={() => jumpTo(0)}>
          <Text style={styles.navButtonText}>처음부터</Text>
        </Pressable>
        {/* At a fork the line has no next move of its own, so "다음" takes the first branch — the chips
            above are there for the others. */}
        <Pressable
          style={[styles.navButton, finished && !atFork && styles.navButtonDisabled]}
          onPress={atFork ? () => playContinuation(forks[0].san) : goNext}
          disabled={finished && !atFork}
        >
          <Text style={styles.navButtonText}>다음 ▶</Text>
        </Pressable>
      </View>

      {/* The lines form a tree — each branches off the one above it — so the picker shows that nesting
          rather than a flat list. Authored branches stay out of it; those are found by playing into them. */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{opening.name} 라인</Text>
            <ScrollView>
              {lineTree(opening, opening.lines.filter((candidate) => !candidate.authored)).map(({ line: candidate, depth }) => {
                const kind = LINE_KINDS[candidate.kind];
                const active = candidate.id === line.id;
                return (
                  <Pressable
                    key={candidate.id}
                    style={[styles.treeRow, { paddingLeft: spacing.md + depth * spacing.lg }, active && styles.treeRowActive]}
                    onPress={() => selectLine(candidate.id)}
                  >
                    <View style={[styles.kindDot, { backgroundColor: kind.color }]}>
                      <Text style={styles.kindDotText}>{kind.label}</Text>
                    </View>
                    <Text style={[styles.treeName, active && styles.treeNameActive]} numberOfLines={1}>
                      {candidate.name}
                    </Text>
                    {candidate.branchPly > 0 && (
                      <Text style={styles.treeMove}>
                        {moveLabel(candidate.branchPly, plainSan(candidate.moves[candidate.branchPly]))}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Animated.View pointerEvents="none" style={[styles.wrongFlash, { opacity: flash }]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
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
  navHeader: {
    alignItems: 'center',
  },
  navTitle: {
    ...typography.heading,
    color: colors.text,
  },
  navSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  navSave: {
    fontSize: 22,
    color: colors.primary,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    width: '100%',
  },
  opponentHint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
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
  pickerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flipButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flipButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  linePicker: {
    flex: 1,
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
  linePickerText: {
    ...typography.caption,
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },
  linePickerChevron: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    maxHeight: '70%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingVertical: spacing.md,
  },
  modalTitle: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
  },
  treeRowActive: {
    backgroundColor: colors.primarySoft,
  },
  treeName: {
    ...typography.body,
    flex: 1,
    color: colors.text,
  },
  treeNameActive: {
    fontWeight: '700',
  },
  treeMove: {
    ...typography.caption,
    color: colors.textMuted,
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
    width: '100%',
  },
  stepCard: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
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
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
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
