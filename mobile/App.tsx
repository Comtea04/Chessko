import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { PieceSymbol, Square } from 'chess.js';

import { useChessGame } from './src/hooks/useChessGame';
import { ChessBoard } from './src/components/ChessBoard';
import { PromotionPicker } from './src/components/PromotionPicker';
import { FenInput } from './src/components/FenInput';
import { MoveList } from './src/components/MoveList';
import { AnalysisPanel } from './src/components/AnalysisPanel';
import { VisionImportPanel } from './src/components/VisionImportPanel';
import { analyzePosition, AnalysisApiError, type AnalysisResponse } from './src/api/analysisApi';

export default function App() {
  const game = useChessGame();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  const legalTargets = selectedSquare ? game.legalMoves(selectedSquare) : [];

  // Any position change (a move, loading a FEN, or stepping through history) invalidates
  // whatever analysis was shown for the previous position.
  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Chessko</Text>
        <Text style={styles.fenText}>{game.fen}</Text>
        {game.isCheckmate && <Text style={styles.gameOverBanner}>체크메이트! 게임 종료</Text>}
        {game.isStalemate && <Text style={styles.gameOverBanner}>스테일메이트! 무승부</Text>}
        {!game.isGameOver && game.isCheck && <Text style={styles.checkBanner}>체크!</Text>}

        <ChessBoard
          board={game.board}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          lastMove={game.lastMove}
          onSquarePress={handleSquarePress}
        />

        <MoveList
          moves={game.moves}
          viewIndex={game.viewIndex}
          onGoToIndex={game.goToIndex}
          onPrevious={game.goToPrevious}
          onNext={game.goToNext}
        />

        <VisionImportPanel onFenScanned={game.loadFen} />

        <FenInput currentFen={game.fen} onLoad={game.loadFen} />

        <AnalysisPanel onAnalyze={handleAnalyze} loading={analysisLoading} error={analysisError} result={analysisResult} />

        {pendingPromotion && (
          <PromotionPicker onSelect={handlePromotionSelect} onCancel={() => setPendingPromotion(null)} />
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#274b8f',
  },
  fenText: {
    fontSize: 10,
    color: '#999',
    maxWidth: 340,
    textAlign: 'center',
  },
  gameOverBanner: {
    fontWeight: '700',
    color: '#b3261e',
  },
  checkBanner: {
    fontWeight: '700',
    color: '#a15c00',
  },
});
