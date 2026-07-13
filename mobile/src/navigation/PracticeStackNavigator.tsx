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
  const { springTransitions } = useSettings();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        animation: springTransitions ? 'slide_from_right' : 'none',
        gestureEnabled: springTransitions,
        fullScreenGestureEnabled: springTransitions,
      }}
    >
      <Stack.Screen name="PracticeHome" component={PracticeHome} options={{ headerShown: false }} />
      <Stack.Screen name="CoordinateTrainer" component={CoordinateTrainer} options={{ title: '좌표 연습' }} />
      <Stack.Screen name="PuzzleTrainer" component={PuzzleTrainer} options={{ title: '퍼즐 풀기' }} />
      <Stack.Screen name="OpeningRecall" component={OpeningRecall} options={{ title: '오프닝 수순 퀴즈' }} />
    </Stack.Navigator>
  );
}
