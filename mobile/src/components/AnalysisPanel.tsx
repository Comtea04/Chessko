import { Chess } from 'chess.js';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnalysisResponse, CommentaryResponse } from '../api/analysisApi';
import { colors, radius, spacing, typography } from '../theme';

interface AnalysisPanelProps {
  onAnalyze: () => void;
  loading: boolean;
  error: string | null;
  result: AnalysisResponse | null;
  onExplain: () => void;
  commentaryLoading: boolean;
  commentaryError: string | null;
  commentary: CommentaryResponse | null;
}

function formatEval(scoreCp: number | null, mateIn: number | null): string {
  if (mateIn !== null) {
    return `#${mateIn}`;
  }
  if (scoreCp !== null) {
    const pawns = (scoreCp / 100).toFixed(2);
    return scoreCp > 0 ? `+${pawns}` : pawns;
  }
  return '-';
}

/**
 * Stockfish speaks UCI ("e7e5"); the rest of the app reads SAN ("e5"). Falls back to the raw
 * UCI string if chess.js rejects the move, so an unexpected line still renders something.
 */
function toSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    return chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || undefined,
    }).san;
  } catch {
    return uci;
  }
}

const STATUS_LABEL: Record<AnalysisResponse['status'], string> = {
  IN_PROGRESS: '진행 중',
  CHECKMATE: '체크메이트',
  STALEMATE: '스테일메이트',
};

export function AnalysisPanel({
  onAnalyze,
  loading,
  error,
  result,
  onExplain,
  commentaryLoading,
  commentaryError,
  commentary,
}: AnalysisPanelProps) {
  const inProgress = result?.status === 'IN_PROGRESS';

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={onAnalyze} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.buttonText}>이 포지션 분석하기</Text>
        )}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.result}>
          <Text style={styles.statusText}>{STATUS_LABEL[result.status]}</Text>
          {result.status !== 'IN_PROGRESS' ? (
            <Text style={styles.gameOverText}>
              {result.status === 'CHECKMATE' ? '더 이상 둘 수 있는 수가 없습니다. 게임 종료!' : '무승부(스테일메이트)입니다.'}
            </Text>
          ) : (
            result.lines.map((line) => (
              <View key={line.rank} style={styles.lineRow}>
                <Text style={styles.lineRank}>{line.rank}.</Text>
                <Text style={styles.lineMove}>{toSan(result.fen, line.move)}</Text>
                <Text style={styles.lineEval}>{formatEval(line.scoreCp, line.mateIn)}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* AI commentary is a second, opt-in step: it spends an LLM call and can be unavailable, so it
          never rides on the engine button. Only offered once the engine says the game is live —
          there is nothing to explain about a finished position beyond the fixed mate/stalemate text. */}
      {inProgress && (
        <>
          <Pressable
            style={[styles.button, styles.explainButton]}
            onPress={onExplain}
            disabled={commentaryLoading}
          >
            {commentaryLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.explainButtonText}>🤖 AI 해설 {commentary ? '다시 보기' : '보기'}</Text>
            )}
          </Pressable>

          {commentaryError && <Text style={styles.error}>{commentaryError}</Text>}

          {commentary && (
            <View style={styles.commentaryBox}>
              <Text style={styles.commentaryText}>{commentary.commentary}</Text>
              {commentary.references.length > 0 && (
                <View style={styles.references}>
                  <Text style={styles.referencesLabel}>참고한 오프닝 원칙</Text>
                  {commentary.references.map((reference, index) => (
                    <Text key={index} style={styles.referenceItem}>
                      · {reference}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  explainButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  explainButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusText: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  gameOverText: {
    color: colors.textMuted,
  },
  lineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lineRank: {
    color: colors.textMuted,
    width: 16,
  },
  lineMove: {
    fontWeight: '600',
    color: colors.text,
    width: 60,
  },
  lineEval: {
    color: colors.primary,
    fontWeight: '600',
  },
  commentaryBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  commentaryText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  references: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 2,
  },
  referencesLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  referenceItem: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
