import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { useSettings } from '../../storage/useSettings';
import { colors, spacing, typography } from '../../theme';

export function SettingsScreen() {
  const { animations, setAnimations } = useSettings();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <View style={styles.row}>
            <View style={styles.text}>
              <Text style={styles.title}>애니메이션</Text>
              <Text style={styles.desc}>
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  desc: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
