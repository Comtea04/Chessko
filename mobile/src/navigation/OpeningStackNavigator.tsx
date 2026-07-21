import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OpeningListScreen } from '../screens/opening/OpeningListScreen';
import { OpeningDetailScreen } from '../screens/opening/OpeningDetailScreen';
import { AnalysisScreen } from '../screens/opening/AnalysisScreen';
import { withScreenTransition } from '../components/ScreenTransition';
import { useSettings } from '../storage/useSettings';
import { colors } from '../theme';
import type { OpeningStackParamList } from './types';

const Stack = createNativeStackNavigator<OpeningStackParamList>();

const OpeningList = withScreenTransition(OpeningListScreen);
const OpeningDetail = withScreenTransition(OpeningDetailScreen);
const Analysis = withScreenTransition(AnalysisScreen);

export function OpeningStackNavigator() {
  const { animations } = useSettings();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        // Cross-fade rather than slide: shared furniture (header, board) morphs in place.
        animation: animations ? 'fade' : 'none',
        // Swipe anywhere on the screen to go back, not just from the very edge.
        gestureEnabled: animations,
        fullScreenGestureEnabled: animations,
      }}
    >
      <Stack.Screen name="OpeningList" component={OpeningList} options={{ headerShown: false }} />
      <Stack.Screen name="OpeningDetail" component={OpeningDetail} options={{ title: '' }} />
      <Stack.Screen name="Analysis" component={Analysis} options={{ title: '포지션 분석' }} />
    </Stack.Navigator>
  );
}
