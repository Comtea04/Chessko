import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenHeader } from '../../components/ScreenHeader';
import { learnSides, plainSan, type Opening } from '../../data/openings';
import { OPENINGS } from '../../data/openingsRuntime';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { useOpeningVisibility } from '../../storage/useOpeningVisibility';
import { OpeningVisibilityModal } from './OpeningVisibilityModal';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningList'>;

export function OpeningListScreen({ navigation }: Props) {
  const { isSaved } = useSavedOpenings();
  const { isVisible } = useOpeningVisibility();
  // Which openings the settings sheet is currently offering: every one (header ⚙), just one (card ⚙),
  // or none (closed).
  const [settingsFor, setSettingsFor] = useState<Opening[] | null>(null);

  // An opening curated for both sides sits in both rows — same lines, opened from the other chair.
  const bySide = useMemo(() => {
    const shown = OPENINGS.filter((opening) => isVisible(opening.id));
    return {
      w: shown.filter((opening) => learnSides(opening).includes('w')),
      b: shown.filter((opening) => learnSides(opening).includes('b')),
    };
  }, [isVisible]);

  const renderRow = (side: 'w' | 'b', title: string, subtitle: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sideDot, side === 'b' && styles.sideDotBlack]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {bySide[side].length === 0 ? (
        <Pressable style={styles.emptyRow} onPress={() => setSettingsFor(OPENINGS)}>
          <Text style={styles.emptyRowText}>표시할 오프닝이 없습니다 — ⚙ 에서 골라 주세요</Text>
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          // Cards snap into place so the row lands on a card edge rather than mid-card.
          snapToInterval={CARD_WIDTH + spacing.md}
          decelerationRate="fast"
        >
          {bySide[side].map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              saved={isSaved(opening.id)}
              // The row the card was tapped in decides which side of the line the board opens on.
              onPress={() => navigation.navigate('OpeningDetail', { openingId: opening.id, side })}
              onSettings={() => setSettingsFor([opening])}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="오프닝 공부"
        subtitle="배우고 싶은 오프닝을 골라 수순을 따라가 보세요"
        right={
          <View style={styles.headerActions}>
            <Pressable onPress={() => navigation.navigate('OpeningSearch')} hitSlop={8} style={styles.searchButton}>
              <Ionicons name="search" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => setSettingsFor(OPENINGS)} hitSlop={8} style={styles.searchButton}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* A prominent entry too, since the header icon alone is easy to miss. */}
        <Pressable style={styles.searchPrompt} onPress={() => navigation.navigate('OpeningSearch')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPromptText}>이름을 모르면 검색하거나 보드에 둬서 찾기</Text>
        </Pressable>
        {renderRow('w', '백 오프닝', '내가 백일 때')}
        {renderRow('b', '흑 오프닝', '내가 흑일 때')}
      </ScrollView>

      <OpeningVisibilityModal
        visible={settingsFor !== null}
        onClose={() => setSettingsFor(null)}
        openings={settingsFor ?? []}
        title={settingsFor?.length === 1 ? settingsFor[0].name : '메인 화면에 보일 오프닝'}
      />
    </SafeAreaView>
  );
}

function OpeningCard({
  opening,
  saved,
  onPress,
  onSettings,
}: {
  opening: Opening;
  saved: boolean;
  onPress: () => void;
  onSettings: () => void;
}) {
  const preview = opening.lines[0].moves.slice(0, 4).map(plainSan);
  const punishes = opening.lines.filter((line) => line.kind === 'punish').length;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, saved && styles.cardSaved, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.eco}>{opening.eco}</Text>
        {opening.sideToLearn === 'both' && <Text style={styles.bothBadge}>백·흑</Text>}
        <View style={styles.cardTopSpacer} />
        {saved && <Text style={styles.savedBadge}>★</Text>}
        <Pressable onPress={onSettings} hitSlop={10}>
          <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.openingName} numberOfLines={2}>
        {opening.name}
      </Text>
      {opening.nameEn && (
        <Text style={styles.openingNameEn} numberOfLines={1}>
          {opening.nameEn}
        </Text>
      )}
      <Text style={styles.category}>{opening.category}</Text>
      <Text style={styles.openingDesc} numberOfLines={3}>
        {opening.description}
      </Text>
      <View style={styles.lineTags}>
        <Text style={styles.lineTag}>라인 {opening.lines.length}개</Text>
        {punishes > 0 && <Text style={[styles.lineTag, styles.punishTag]}>실수 응징 {punishes}개</Text>}
      </View>
      <Text style={styles.preview} numberOfLines={1}>
        {preview.join(' ')}…
      </Text>
    </Pressable>
  );
}

const CARD_WIDTH = 210;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchButton: {
    padding: spacing.xs,
  },
  emptyRow: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyRowText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  searchPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchPromptText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sideDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.text,
  },
  sideDotBlack: {
    backgroundColor: colors.text,
  },
  sectionTitle: {
    ...typography.heading,
  },
  sectionSubtitle: {
    ...typography.caption,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  // Saved = currently learning. An orange border marks the ones in progress at a glance, next to
  // the ★ badge that already flags them.
  cardSaved: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  cardPressed: {
    opacity: 0.85,
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
  // Marks the openings that sit in both rows, so the same card showing up twice reads as intended.
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
  savedBadge: {
    color: colors.primary,
    fontWeight: '700',
  },
  openingName: {
    ...typography.body,
    fontWeight: '700',
    minHeight: 36,
  },
  openingNameEn: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  category: {
    ...typography.caption,
    color: colors.textMuted,
  },
  openingDesc: {
    ...typography.caption,
    color: colors.textMuted,
    minHeight: 48,
  },
  lineTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  lineTag: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  punishTag: {
    color: colors.danger,
    backgroundColor: '#fbe4e3',
  },
  preview: {
    ...typography.caption,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
});
