import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import type { PositionEvaluation } from '../api/analysisApi';
import { colors, radius, spacing, typography } from '../theme';

const WIDTH = 320;
const HEIGHT = 96;
/** Beyond ±8 pawns the game is decided; clamping keeps one blunder from flattening the whole graph. */
const CLAMP_CP = 800;
const MATE_CP = CLAMP_CP;

/**
 * The engine reports centipawns from the side to move's perspective. A graph has to use one fixed
 * perspective or it zig-zags every ply, so everything is converted to white's.
 */
function whitePerspectiveCp(evaluation: PositionEvaluation): number | null {
  if (!evaluation.analyzed) return null;

  const whiteToMove = evaluation.fen.split(' ')[1] === 'w';
  if (evaluation.mateIn !== null) {
    const signed = evaluation.mateIn >= 0 ? MATE_CP : -MATE_CP;
    return whiteToMove ? signed : -signed;
  }
  if (evaluation.status === 'CHECKMATE') {
    // The side to move has been mated.
    return whiteToMove ? -MATE_CP : MATE_CP;
  }
  if (evaluation.status === 'STALEMATE') return 0;
  if (evaluation.scoreCp === null) return null;

  return whiteToMove ? evaluation.scoreCp : -evaluation.scoreCp;
}

interface EvalGraphProps {
  evaluations: PositionEvaluation[];
  /** Number of moves played in the position on the board (0 = starting position). */
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export function EvalGraph({ evaluations, currentPly, onSelectPly }: EvalGraphProps) {
  if (evaluations.length < 2) return null;

  const lastPly = evaluations.length - 1;
  const xOf = (ply: number) => (ply / lastPly) * WIDTH;
  const yOf = (cp: number) => HEIGHT / 2 - (Math.max(-CLAMP_CP, Math.min(CLAMP_CP, cp)) / CLAMP_CP) * (HEIGHT / 2);

  // Unanalyzed positions break the line into separate segments instead of being drawn as zero.
  const segments: { ply: number; cp: number }[][] = [];
  let current: { ply: number; cp: number }[] = [];
  evaluations.forEach((evaluation, ply) => {
    const cp = whitePerspectiveCp(evaluation);
    if (cp === null) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    current.push({ ply, cp });
  });
  if (current.length > 0) segments.push(current);

  const areaPaths = segments
    .filter((segment) => segment.length > 1)
    .map((segment) => {
      const line = segment.map((point) => `${xOf(point.ply)},${yOf(point.cp)}`).join(' L ');
      return `M ${xOf(segment[0].ply)},${HEIGHT / 2} L ${line} L ${xOf(segment[segment.length - 1].ply)},${HEIGHT / 2} Z`;
    });

  const linePaths = segments
    .filter((segment) => segment.length > 1)
    .map((segment) => `M ${segment.map((point) => `${xOf(point.ply)},${yOf(point.cp)}`).join(' L ')}`);

  const currentEval = whitePerspectiveCp(evaluations[Math.min(currentPly, lastPly)]);

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={styles.label}>이점 그래프 (위: 백 우세)</Text>
        <Text style={styles.value}>{formatEval(currentEval)}</Text>
      </View>

      <Pressable
        onPress={(event) => {
          const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / WIDTH));
          onSelectPly(Math.round(ratio * lastPly));
        }}
      >
        <Svg width={WIDTH} height={HEIGHT}>
          <Rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={colors.surfaceAlt} rx={radius.sm} />
          {areaPaths.map((path, index) => (
            <Path key={`area-${index}`} d={path} fill={colors.primary} fillOpacity={0.18} />
          ))}
          {linePaths.map((path, index) => (
            <Path key={`line-${index}`} d={path} stroke={colors.primary} strokeWidth={2} fill="none" />
          ))}
          <Line x1={0} y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} stroke={colors.border} strokeWidth={1} />
          <Line
            x1={xOf(Math.min(currentPly, lastPly))}
            y1={0}
            x2={xOf(Math.min(currentPly, lastPly))}
            y2={HEIGHT}
            stroke={colors.danger}
            strokeWidth={1.5}
          />
        </Svg>
      </Pressable>

      <Text style={styles.hint}>그래프를 눌러 해당 수로 이동할 수 있습니다.</Text>
    </View>
  );
}

function formatEval(cp: number | null): string {
  if (cp === null) return '—';
  if (Math.abs(cp) >= MATE_CP) return cp > 0 ? '백 승세' : '흑 승세';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

const styles = StyleSheet.create({
  container: {
    width: WIDTH,
    gap: spacing.xs,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  value: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  hint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
