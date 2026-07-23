import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { plainSan, type Opening } from '../../data/openings';
import { useOpeningVisibility } from '../../storage/useOpeningVisibility';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * The sheet behind a row's ⚙: every opening that row could show, as cards you tap to switch on and
 * off. Cards rather than a list of names because it's the same thing the row itself shows — picking
 * here is recognising the card you want, not reading a settings screen.
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
  const shownCount = openings.filter((opening) => isVisible(opening.id)).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.subtitle}>
                켠 것만 메인 화면에 보입니다 · {shownCount}/{openings.length}개
              </Text>
            </View>
            {shownCount < openings.length && (
              <Pressable onPress={showAll} hitSlop={8}>
                <Text style={styles.showAll}>모두 켜기</Text>
              </Pressable>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {openings.map((opening) => {
              const on = isVisible(opening.id);
              return (
                <Pressable
                  key={opening.id}
                  style={({ pressed }) => [styles.card, on ? styles.cardOn : styles.cardOff, pressed && styles.cardPressed]}
                  onPress={() => setVisible(opening.id, !on)}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.eco}>{opening.eco}</Text>
                    {opening.sideToLearn === 'both' && <Text style={styles.bothBadge}>백·흑</Text>}
                    <View style={styles.cardTopSpacer} />
                    <Ionicons
                      name={on ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={on ? colors.primary : colors.border}
                    />
                  </View>
                  <Text style={styles.name} numberOfLines={2}>{opening.name}</Text>
                  {opening.nameEn && (
                    <Text style={styles.nameEn} numberOfLines={1}>{opening.nameEn}</Text>
                  )}
                  <Text style={styles.meta} numberOfLines={1}>
                    {opening.category} · 라인 {opening.lines.length}개
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {opening.lines[0].moves.slice(0, 4).map(plainSan).join(' ')}…
                  </Text>
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
  sheet: {
    maxHeight: '80%',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  card: {
    // Two to a row on a phone, and the pair still fits with the gap between them.
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.md,
    gap: 2,
  },
  cardOn: {
    borderColor: colors.primary,
  },
  // Off cards stay readable but plainly inactive — the row won't show them.
  cardOff: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTopSpacer: {
    flex: 1,
  },
  eco: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  bothBadge: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  nameEn: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  preview: {
    ...typography.caption,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
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
