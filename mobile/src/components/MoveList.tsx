import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

interface MoveListProps {
  moves: string[];
  viewIndex: number;
  onGoToIndex: (index: number) => void;
}

/** The move pairs, as a scrollable notation table. Tapping a move jumps the board to it. */
export function MoveList({ moves, viewIndex, onGoToIndex }: MoveListProps) {
  const movePairs: { moveNumber: number; white?: string; black?: string; whiteIndex: number; blackIndex: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIndex: i,
      blackIndex: i + 1,
    });
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      <Pressable onPress={() => onGoToIndex(-1)} style={styles.startRow}>
        <Text style={[styles.moveText, viewIndex === -1 && styles.activeMove]}>시작 포지션</Text>
      </Pressable>
      {movePairs.map((pair) => (
        <View key={pair.moveNumber} style={styles.pairRow}>
          <Text style={styles.moveNumber}>{pair.moveNumber}.</Text>
          <Pressable onPress={() => onGoToIndex(pair.whiteIndex)}>
            <Text style={[styles.moveText, viewIndex === pair.whiteIndex && styles.activeMove]}>{pair.white}</Text>
          </Pressable>
          {pair.black && (
            <Pressable onPress={() => onGoToIndex(pair.blackIndex)}>
              <Text style={[styles.moveText, viewIndex === pair.blackIndex && styles.activeMove]}>{pair.black}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * Stepping controls, kept apart from the list so a screen can pin them outside its scroll view.
 * Replaying a game is done one tap at a time, and a button you have to scroll to find is a button
 * that interrupts the thing it exists for. `pinned` draws the divider that separates it from the
 * content it floats over.
 */
export function MoveNavRow({
  viewIndex,
  moveCount,
  onPrevious,
  onNext,
  pinned = false,
}: {
  viewIndex: number;
  moveCount: number;
  onPrevious: () => void;
  onNext: () => void;
  pinned?: boolean;
}) {
  const atStart = viewIndex < 0;
  const atEnd = viewIndex >= moveCount - 1;

  return (
    <View style={[styles.navRow, pinned && styles.navRowPinned]}>
      <Pressable style={[styles.navButton, atStart && styles.navButtonDisabled]} onPress={onPrevious} disabled={atStart}>
        <Text style={styles.navButtonText}>◀ 이전</Text>
      </Pressable>
      <Pressable style={[styles.navButton, atEnd && styles.navButtonDisabled]} onPress={onNext} disabled={atEnd}>
        <Text style={styles.navButtonText}>다음 ▶</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: 360,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  listContent: {
    padding: spacing.sm,
  },
  startRow: {
    marginBottom: spacing.xs,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 2,
  },
  moveNumber: {
    ...typography.caption,
    color: colors.textMuted,
    width: 24,
  },
  moveText: {
    ...typography.caption,
    color: colors.text,
  },
  activeMove: {
    fontWeight: '700',
    color: colors.primary,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navRowPinned: {
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
});
