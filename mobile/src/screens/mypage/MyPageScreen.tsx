import { SafeAreaView, StyleSheet } from 'react-native';

import { ComingSoon } from '../../components/ComingSoon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../theme';

export function MyPageScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="마이페이지" subtitle="chess.com 계정 연동과 학습 통계" />
      <ComingSoon title="계정 연동" description="chess.com 닉네임 연동과 최근 대국 목록은 곧 추가됩니다." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
