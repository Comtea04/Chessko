import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OpeningListScreen } from '../screens/opening/OpeningListScreen';
import { OpeningSearchScreen } from '../screens/opening/OpeningSearchScreen';
import { OpeningDetailScreen } from '../screens/opening/OpeningDetailScreen';
import { AnalysisScreen } from '../screens/opening/AnalysisScreen';
import { withScreenTransition } from '../components/ScreenTransition';
import { useSettings } from '../storage/useSettings';
import { colors } from '../theme';
import type { OpeningStackParamList } from './types';

const Stack = createNativeStackNavigator<OpeningStackParamList>();

const OpeningList = withScreenTransition(OpeningListScreen);
const OpeningSearch = withScreenTransition(OpeningSearchScreen);
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
        // No transition: the screens share their furniture (header, board) in the same place, so
        // swapping the content under it reads as one screen changing rather than two screens
        // trading places. A cross-fade cannot do that — dissolving between two opaque screens shows
        // both of them at once halfway through. The settling scale in ScreenTransition is the motion.
        animation: 'none',
        // Swipe anywhere on the screen to go back, not just from the very edge.
        gestureEnabled: animations,
        fullScreenGestureEnabled: animations,
      }}
    >
      <Stack.Screen name="OpeningList" component={OpeningList} options={{ headerShown: false }} />
      <Stack.Screen name="OpeningSearch" component={OpeningSearch} options={{ title: '오프닝 찾기' }} />
      <Stack.Screen name="OpeningDetail" component={OpeningDetail} options={{ title: '' }} />
      <Stack.Screen name="Analysis" component={Analysis} options={{ title: '포지션 분석' }} />
    </Stack.Navigator>
  );
}
