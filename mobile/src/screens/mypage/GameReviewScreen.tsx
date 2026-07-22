import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chess } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { EvalBar, whitePerspectiveCp } from '../../components/EvalBar';
import { MoveList, MoveNavRow } from '../../components/MoveList';
import { useChessGame } from '../../hooks/useChessGame';
import { analyzeGame, AnalysisApiError, type PositionEvaluation } from '../../api/analysisApi';
import { colors, radius, spacing, typography } from '../../theme';
import type { MyPageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MyPageStackParamList, 'GameReview'>;

/** The backend caps a review at 200 positions; long games are trimmed here rather than rejected there. */
const MAX_POSITIONS = 200;

/** Replays the PGN into the SAN list the viewer needs and the FEN list the engine needs. */
function readGame(pgn: string): { moves: string[]; fens: string[] } | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }

  const moves = chess.history();
  const replay = new Chess();
  const fens = [replay.fen()];
  for (const san of moves) {
    replay.move(san);
    fens.push(replay.fen());
  }
  return { moves, fens: fens.slice(0, MAX_POSITIONS) };
}

export function GameReviewScreen({ route }: Props) {
  const { pgn, opponent, playerColor } = route.params;
  const parsed = useMemo(() => readGame(pgn), [pgn]);

  const game = useChessGame();
  const [evaluations, setEvaluations] = useState<PositionEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parsed) game.loadMoves(parsed.moves);
    // Replay once per game; game.loadMoves is stable and re-running would reset the viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgn]);

  useEffect(() => {
    if (!parsed) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    analyzeGame(parsed.fens)
      .then((result) => {
        if (!cancelled) setEvaluations(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof AnalysisApiError ? err.message : '알 수 없는 오류가 발생했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parsed]);

  if (!parsed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.notice}>이 대국의 기보를 읽을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>vs {opponent}</Text>
        <Text style={styles.subtitle}>
          {playerColor === 'white' ? '백' : '흑'}으로 둔 대국 · 총 {parsed.moves.length}수
        </Text>

        <View style={styles.boardRow}>
          <EvalBar cp={whitePerspectiveCp(evaluations[game.viewIndex + 1])} flipped={playerColor === 'black'} />
          <ChessBoard
            board={game.board}
            selectedSquare={null}
            legalTargets={[]}
            lastMove={game.lastMove}
            flipped={playerColor === 'black'}
            onSquarePress={() => {}}
          />
        </View>

        {loading && (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>스톡피쉬로 {parsed.fens.length}개 포지션을 분석하는 중…</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>분석 서버(backend)가 실행 중인지 확인해 주세요. 수순 재생은 그대로 가능합니다.</Text>
          </View>
        )}

        <MoveList moves={game.moves} viewIndex={game.viewIndex} onGoToIndex={game.goToIndex} />
      </ScrollView>

      {/* Outside the scroll view: replaying a game is one tap at a time, so the controls have to
          stay put rather than scroll away under the notation. */}
      <MoveNavRow
        viewIndex={game.viewIndex}
        moveCount={game.moves.length}
        onPrevious={game.goToPrevious}
        onNext={game.goToNext}
        pinned
      />
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
  boardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  notice: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '700',
  },
  errorHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
