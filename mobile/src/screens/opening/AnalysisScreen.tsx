import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PieceSymbol, Square } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useChessGame } from '../../hooks/useChessGame';
import { ChessBoard } from '../../components/ChessBoard';
import { EvalBar, whitePerspectiveCp } from '../../components/EvalBar';
import { PromotionPicker } from '../../components/PromotionPicker';
import { FenInput } from '../../components/FenInput';
import { MoveList, MoveNavRow } from '../../components/MoveList';
import { AnalysisPanel } from '../../components/AnalysisPanel';
import { VisionImportPanel } from '../../components/VisionImportPanel';
import {
  analyzePosition,
  explainPosition,
  AnalysisApiError,
  type AnalysisResponse,
  type CommentaryResponse,
} from '../../api/analysisApi';
import { colors, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'Analysis'>;

export function AnalysisScreen({ route }: Props) {
  const game = useChessGame(route.params?.initialFen);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryError, setCommentaryError] = useState<string | null>(null);
  const [commentary, setCommentary] = useState<CommentaryResponse | null>(null);

  const legalTargets = selectedSquare ? game.legalMoves(selectedSquare) : [];

  // The bar is part of the board, not part of the result: it stays mounted from the moment the
  // screen opens and simply reads "—" until there is an evaluation, so nothing shifts around when
  // the analysis lands. Rank 1 is the engine's own verdict on the position.
  const barCp = analysisResult
    ? whitePerspectiveCp({
        ply: 0,
        fen: analysisResult.fen,
        status: analysisResult.status,
        scoreCp: analysisResult.lines[0]?.scoreCp ?? null,
        mateIn: analysisResult.lines[0]?.mateIn ?? null,
        analyzed: true,
      })
    : null;

  // Any position change (a move, loading a FEN, or stepping through history) invalidates
  // whatever analysis was shown for the previous position.
  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setCommentary(null);
    setCommentaryError(null);
  }, [game.fen]);

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (!selectedSquare) {
        if (legalTargets.length === 0 && game.legalMoves(square).length === 0) {
          return;
        }
        setSelectedSquare(square);
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      if (!legalTargets.includes(square)) {
        // Clicking another one of your own pieces re-selects instead of failing silently.
        if (game.legalMoves(square).length > 0) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
        return;
      }

      const promotionTargets = game.promotionMoves(selectedSquare);
      if (promotionTargets.includes(square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        return;
      }

      game.makeMove(selectedSquare, square);
      setSelectedSquare(null);
    },
    [game, legalTargets, selectedSquare]
  );

  const handlePromotionSelect = useCallback(
    (piece: PieceSymbol) => {
      if (pendingPromotion) {
        game.makeMove(pendingPromotion.from, pendingPromotion.to, piece);
      }
      setPendingPromotion(null);
    },
    [game, pendingPromotion]
  );

  const handleAnalyze = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await analyzePosition(game.fen);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err instanceof AnalysisApiError ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [game.fen]);

  const handleExplain = useCallback(async () => {
    setCommentaryLoading(true);
    setCommentaryError(null);
    try {
      const result = await explainPosition(game.fen);
      setCommentary(result);
      // The commentary call re-runs the engine, so fill in the move list too if the user jumped
      // straight to "AI 해설" without pressing "분석하기" first.
      setAnalysisResult((prev) => prev ?? result);
    } catch (err) {
      setCommentaryError(err instanceof AnalysisApiError ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setCommentaryLoading(false);
    }
  }, [game.fen]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={typography.title}>포지션 분석</Text>
        <Text style={styles.fenText}>{game.fen}</Text>
        {game.isCheckmate && <Text style={styles.gameOverBanner}>체크메이트! 게임 종료</Text>}
        {game.isStalemate && <Text style={styles.gameOverBanner}>스테일메이트! 무승부</Text>}
        {!game.isGameOver && game.isCheck && <Text style={styles.checkBanner}>체크!</Text>}

        <View style={styles.boardRow}>
          <EvalBar cp={barCp} />
          <ChessBoard
            board={game.board}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={game.lastMove}
            onSquarePress={handleSquarePress}
          />
        </View>

        {/* Not pinned here: this screen is a workbench, not a replay, and the notation sits in the
            middle of it — controls stuck to the bottom would float far from what they move. */}
        <MoveList moves={game.moves} viewIndex={game.viewIndex} onGoToIndex={game.goToIndex} />
        <MoveNavRow
          viewIndex={game.viewIndex}
          moveCount={game.moves.length}
          onPrevious={game.goToPrevious}
          onNext={game.goToNext}
        />

        <VisionImportPanel onFenScanned={game.loadFen} />

        <FenInput currentFen={game.fen} onLoad={game.loadFen} />

        <AnalysisPanel
          onAnalyze={handleAnalyze}
          loading={analysisLoading}
          error={analysisError}
          result={analysisResult}
          onExplain={handleExplain}
          commentaryLoading={commentaryLoading}
          commentaryError={commentaryError}
          commentary={commentary}
        />

        {pendingPromotion && (
          <PromotionPicker
            color={game.turn}
            onSelect={handlePromotionSelect}
            onCancel={() => setPendingPromotion(null)}
          />
        )}
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
    paddingVertical: spacing.xl,
    gap: 14,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fenText: {
    fontSize: 10,
    color: colors.textMuted,
    maxWidth: 340,
    textAlign: 'center',
  },
  gameOverBanner: {
    fontWeight: '700',
    color: colors.danger,
  },
  checkBanner: {
    fontWeight: '700',
    color: colors.warning,
  },
});
