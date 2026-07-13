import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OpeningListScreen } from '../screens/opening/OpeningListScreen';
import { OpeningDetailScreen } from '../screens/opening/OpeningDetailScreen';
import { AnalysisScreen } from '../screens/opening/AnalysisScreen';
import { colors } from '../theme';
import type { OpeningStackParamList } from './types';

const Stack = createNativeStackNavigator<OpeningStackParamList>();

export function OpeningStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="OpeningList" component={OpeningListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OpeningDetail" component={OpeningDetailScreen} options={{ title: '오프닝 상세' }} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: '포지션 분석' }} />
    </Stack.Navigator>
  );
}
