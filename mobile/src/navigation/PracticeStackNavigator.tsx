import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PracticeHomeScreen } from '../screens/practice/PracticeHomeScreen';
import { CoordinateTrainerScreen } from '../screens/practice/CoordinateTrainerScreen';
import { PuzzleTrainerScreen } from '../screens/practice/PuzzleTrainerScreen';
import { OpeningRecallScreen } from '../screens/practice/OpeningRecallScreen';
import { withScreenTransition } from '../components/ScreenTransition';
import { useSettings } from '../storage/useSettings';
import { colors } from '../theme';
import type { PracticeStackParamList } from './types';

const Stack = createNativeStackNavigator<PracticeStackParamList>();

const PracticeHome = withScreenTransition(PracticeHomeScreen);
const CoordinateTrainer = withScreenTransition(CoordinateTrainerScreen);
const PuzzleTrainer = withScreenTransition(PuzzleTrainerScreen);
const OpeningRecall = withScreenTransition(OpeningRecallScreen);

export function PracticeStackNavigator() {
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
        gestureEnabled: animations,
        fullScreenGestureEnabled: animations,
      }}
    >
      <Stack.Screen name="PracticeHome" component={PracticeHome} options={{ headerShown: false }} />
      <Stack.Screen name="CoordinateTrainer" component={CoordinateTrainer} options={{ title: '좌표 연습' }} />
      <Stack.Screen name="PuzzleTrainer" component={PuzzleTrainer} options={{ title: '퍼즐 풀기' }} />
      <Stack.Screen name="OpeningRecall" component={OpeningRecall} options={{ title: '오프닝 수순 퀴즈' }} />
    </Stack.Navigator>
  );
}
