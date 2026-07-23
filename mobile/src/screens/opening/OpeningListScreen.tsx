import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenHeader } from '../../components/ScreenHeader';
import { OPENINGS, plainSan, type Opening } from '../../data/openings';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningList'>;

export function OpeningListScreen({ navigation }: Props) {
  const { isSaved } = useSavedOpenings();

  const bySide = useMemo(
    () => ({
      w: OPENINGS.filter((opening) => opening.sideToLearn === 'w'),
      b: OPENINGS.filter((opening) => opening.sideToLearn === 'b'),
    }),
    []
  );

  const renderRow = (side: 'w' | 'b', title: string, subtitle: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sideDot, side === 'b' && styles.sideDotBlack]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
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
            onPress={() => navigation.navigate('OpeningDetail', { openingId: opening.id })}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="오프닝 공부"
        subtitle="배우고 싶은 오프닝을 골라 수순을 따라가 보세요"
        right={
          <Pressable onPress={() => navigation.navigate('OpeningSearch')} hitSlop={8} style={styles.searchButton}>
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
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
    </SafeAreaView>
  );
}

function OpeningCard({ opening, saved, onPress }: { opening: Opening; saved: boolean; onPress: () => void }) {
  const preview = opening.lines[0].moves.slice(0, 4).map(plainSan);
  const punishes = opening.lines.filter((line) => line.kind === 'punish').length;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.eco}>{opening.eco}</Text>
        {saved && <Text style={styles.savedBadge}>★</Text>}
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
  searchButton: {
    padding: spacing.xs,
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
  cardPressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eco: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
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
