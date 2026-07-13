import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, typography } from '../../theme';
import type { PracticeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeHome'>;

const MODES: { key: 'CoordinateTrainer' | 'PuzzleTrainer' | 'OpeningRecall'; title: string; desc: string; emoji: string }[] = [
  { key: 'CoordinateTrainer', title: '좌표 연습', desc: '주어진 좌표를 보고 보드에서 바로 찾아 탭하세요.', emoji: '🎯' },
  { key: 'PuzzleTrainer', title: '퍼즐 풀기', desc: '주어진 포지션에서 최선의 수순을 찾아보세요.', emoji: '🧩' },
  { key: 'OpeningRecall', title: '오프닝 수순 퀴즈', desc: '저장한 오프닝의 다음 수를 정확히 기억하는지 확인하세요.', emoji: '📖' },
];

export function PracticeHomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="연습" subtitle="원하는 연습 모드를 선택하세요" />
      <ScrollView contentContainerStyle={styles.container}>
        {MODES.map((mode) => (
          <Card key={mode.key} onPress={() => navigation.navigate(mode.key)} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.emoji}>{mode.emoji}</Text>
              <View style={styles.text}>
                <Text style={styles.title}>{mode.title}</Text>
                <Text style={styles.desc}>{mode.desc}</Text>
              </View>
            </View>
          </Card>
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
    gap: spacing.md,
  },
  card: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading,
  },
  desc: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
