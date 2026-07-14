import { StyleSheet, Text, View } from 'react-native';

import type { MoveQuality } from '../data/openings';
import { colors, radius, spacing } from '../theme';

interface QualityStyle {
  symbol: string;
  label: string;
  color: string;
}

/** The vocabulary chess.com and Lichess trained everyone on: teal is a gift, red is a gift to them. */
export const QUALITY_STYLES: Record<MoveQuality, QualityStyle> = {
  brilliant: { symbol: '!!', label: '탁월수', color: '#17a2a2' },
  best: { symbol: '!', label: '좋은 수', color: colors.accent },
  good: { symbol: '·', label: '정석 수', color: colors.textMuted },
  inaccuracy: { symbol: '?!', label: '부정확', color: colors.warning },
  mistake: { symbol: '?', label: '실수', color: '#e07b39' },
  blunder: { symbol: '??', label: '블런더', color: colors.danger },
};

export function MoveQualityBadge({ quality, withLabel = false }: { quality: MoveQuality; withLabel?: boolean }) {
  const { symbol, label, color } = QUALITY_STYLES[quality];

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.symbol}>{symbol}</Text>
      {withLabel && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  symbol: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  label: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
});
