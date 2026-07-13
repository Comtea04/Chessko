import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { PositionEvaluation } from '../api/analysisApi';
import { useSettings } from '../storage/useSettings';
import { colors, radius, typography } from '../theme';

const BAR_WIDTH = 26;
const BAR_HEIGHT = 320; // matches the board
/** Beyond ±8 pawns the game is decided; the bar would otherwise sit pinned at an end. */
const CLAMP_CP = 800;

/**
 * The engine reports centipawns from the side to move's perspective, so the sign flips every ply.
 * Everything is converted to white's perspective before it reaches the bar.
 */
export function whitePerspectiveCp(evaluation: PositionEvaluation | undefined): number | null {
  if (!evaluation || !evaluation.analyzed) return null;

  const whiteToMove = evaluation.fen.split(' ')[1] === 'w';
  if (evaluation.mateIn !== null) {
    const signed = evaluation.mateIn >= 0 ? CLAMP_CP : -CLAMP_CP;
    return whiteToMove ? signed : -signed;
  }
  if (evaluation.status === 'CHECKMATE') return whiteToMove ? -CLAMP_CP : CLAMP_CP; // side to move is mated
  if (evaluation.status === 'STALEMATE') return 0;
  if (evaluation.scoreCp === null) return null;

  return whiteToMove ? evaluation.scoreCp : -evaluation.scoreCp;
}

/** Centipawns compress into a share of the bar the way a win probability does, not linearly. */
function whiteShare(cp: number): number {
  const clamped = Math.max(-CLAMP_CP, Math.min(CLAMP_CP, cp));
  const share = 1 / (1 + Math.exp(-clamped / 320));
  return Math.max(0.03, Math.min(0.97, share));
}

interface EvalBarProps {
  evaluation: PositionEvaluation | undefined;
  /** Flip so the viewer's own colour sits at the bottom, as on the board. */
  flipped?: boolean;
}

export function EvalBar({ evaluation, flipped = false }: EvalBarProps) {
  const { animations } = useSettings();
  const cp = whitePerspectiveCp(evaluation);
  const share = cp === null ? 0.5 : whiteShare(cp);

  const fill = useRef(new Animated.Value(share)).current;
  useEffect(() => {
    if (!animations) {
      fill.setValue(share);
      return;
    }
    Animated.timing(fill, {
      toValue: share,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating height, which the native driver cannot handle
    }).start();
  }, [share, animations, fill]);

  const whiteHeight = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const label = formatEval(cp);

  return (
    <View style={styles.container}>
      {/* Black owns the far end of the bar; white grows from the near end, like chess.com. */}
      <View style={[styles.bar, flipped && styles.barFlipped]}>
        <Animated.View style={[styles.white, { height: whiteHeight }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function formatEval(cp: number | null): string {
  if (cp === null) return '—';
  if (Math.abs(cp) >= CLAMP_CP) return cp > 0 ? '1-0' : '0-1';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.text,
    justifyContent: 'flex-end',
  },
  barFlipped: {
    justifyContent: 'flex-start',
  },
  white: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
});
