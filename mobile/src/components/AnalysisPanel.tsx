import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnalysisResponse } from '../api/analysisApi';

interface AnalysisPanelProps {
  onAnalyze: () => void;
  loading: boolean;
  error: string | null;
  result: AnalysisResponse | null;
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

const STATUS_LABEL: Record<AnalysisResponse['status'], string> = {
  IN_PROGRESS: '진행 중',
  CHECKMATE: '체크메이트',
  STALEMATE: '스테일메이트',
};

export function AnalysisPanel({ onAnalyze, loading, error, result }: AnalysisPanelProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={onAnalyze} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>이 포지션 분석하기</Text>}
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
                <Text style={styles.lineMove}>{line.move}</Text>
                <Text style={styles.lineEval}>{formatEval(line.scoreCp, line.mateIn)}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  button: {
    backgroundColor: '#274b8f',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
  error: {
    color: '#b3261e',
  },
  result: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  statusText: {
    fontWeight: '700',
    marginBottom: 4,
  },
  gameOverText: {
    color: '#555',
  },
  lineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lineRank: {
    color: '#888',
    width: 16,
  },
  lineMove: {
    fontWeight: '600',
    width: 60,
  },
  lineEval: {
    color: '#274b8f',
  },
});
