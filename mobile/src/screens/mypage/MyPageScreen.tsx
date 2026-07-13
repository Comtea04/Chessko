import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSettings } from '../../storage/useSettings';
import { colors, spacing, typography } from '../../theme';

export function MyPageScreen() {
  const { animations, setAnimations } = useSettings();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="마이페이지" subtitle="chess.com 계정 연동과 학습 통계" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>애니메이션</Text>
              <Text style={styles.settingDesc}>
                화면이 모핑하듯 부드럽게 전환되고, 기물이 미끄러지듯 움직입니다. 디버깅할 때는 꺼두세요.
              </Text>
            </View>
            <Switch
              value={animations}
              onValueChange={setAnimations}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.settingTitle}>계정 연동</Text>
          <Text style={styles.settingDesc}>chess.com 닉네임 연동과 최근 대국 목록은 곧 추가됩니다.</Text>
        </Card>
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  settingDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
