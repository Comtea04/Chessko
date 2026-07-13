import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { OPENING_CATEGORIES, OPENINGS } from '../../data/openings';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { colors, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningList'>;

export function OpeningListScreen({ navigation }: Props) {
  const { isSaved } = useSavedOpenings();

  const grouped = useMemo(
    () => OPENING_CATEGORIES.map((category) => ({ category, openings: OPENINGS.filter((o) => o.category === category) })),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="오프닝 공부" subtitle="카테고리별 오프닝을 살펴보고 마음에 드는 수순을 저장하세요" />
      <ScrollView contentContainerStyle={styles.container}>
        {grouped.map(({ category, openings }) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {openings.map((opening) => (
              <Card key={opening.id} onPress={() => navigation.navigate('OpeningDetail', { openingId: opening.id })} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardText}>
                    <Text style={styles.openingName}>{opening.name}</Text>
                    <Text style={styles.openingEco}>{opening.eco}</Text>
                    <Text style={styles.openingDesc}>{opening.description}</Text>
                  </View>
                  {isSaved(opening.id) && <Text style={styles.savedBadge}>★ 저장됨</Text>}
                </View>
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  openingName: {
    ...typography.body,
    fontWeight: '700',
  },
  openingEco: {
    ...typography.caption,
  },
  openingDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  savedBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
