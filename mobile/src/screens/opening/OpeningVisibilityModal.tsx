import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { learnSides, sideLabel, type Opening } from '../../data/openings';
import { useOpeningVisibility } from '../../storage/useOpeningVisibility';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * The settings sheet behind the ⚙ buttons: which openings the main list shows. Takes whichever
 * openings it should offer, so the same sheet serves the per-opening button on a card (one row) and
 * the header button (every opening) — the second one is also the only way back to a hidden opening,
 * since hiding it takes its card, and its own ⚙, off the list.
 */
export function OpeningVisibilityModal({
  visible,
  onClose,
  openings,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  openings: Opening[];
  title: string;
}) {
  const { isVisible, setVisible, showAll } = useOpeningVisibility();
  const hiddenCount = openings.filter((opening) => !isVisible(opening.id)).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.subtitle}>켠 오프닝만 메인 화면에 보입니다</Text>
            </View>
            {hiddenCount > 0 && (
              <Pressable onPress={showAll} hitSlop={8}>
                <Text style={styles.showAll}>모두 보이기</Text>
              </Pressable>
            )}
          </View>

          <ScrollView>
            {openings.map((opening) => {
              const shown = isVisible(opening.id);
              return (
                <Pressable
                  key={opening.id}
                  style={styles.row}
                  onPress={() => setVisible(opening.id, !shown)}
                >
                  <View style={styles.sideDots}>
                    {learnSides(opening).map((side) => (
                      <View key={side} style={[styles.sideDot, side === 'b' && styles.sideDotBlack]} />
                    ))}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowName, !shown && styles.rowNameHidden]} numberOfLines={1}>
                      {opening.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {opening.eco} · {sideLabel(opening)} · {opening.category}
                    </Text>
                  </View>
                  <Switch
                    value={shown}
                    onValueChange={(next) => setVisible(opening.id, next)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>완료</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    maxHeight: '75%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  showAll: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sideDots: {
    flexDirection: 'row',
    gap: 2,
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.text,
  },
  sideDotBlack: {
    backgroundColor: colors.text,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  rowNameHidden: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  done: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  doneText: {
    color: colors.surface,
    fontWeight: '700',
  },
});
