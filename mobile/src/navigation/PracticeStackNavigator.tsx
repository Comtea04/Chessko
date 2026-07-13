import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PracticeHomeScreen } from '../screens/practice/PracticeHomeScreen';
import { CoordinateTrainerScreen } from '../screens/practice/CoordinateTrainerScreen';
import { PuzzleTrainerScreen } from '../screens/practice/PuzzleTrainerScreen';
import { OpeningRecallScreen } from '../screens/practice/OpeningRecallScreen';
import { colors } from '../theme';
import type { PracticeStackParamList } from './types';

const Stack = createNativeStackNavigator<PracticeStackParamList>();

export function PracticeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="PracticeHome" component={PracticeHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoordinateTrainer" component={CoordinateTrainerScreen} options={{ title: '좌표 연습' }} />
      <Stack.Screen name="PuzzleTrainer" component={PuzzleTrainerScreen} options={{ title: '퍼즐 풀기' }} />
      <Stack.Screen name="OpeningRecall" component={OpeningRecallScreen} options={{ title: '오프닝 수순 퀴즈' }} />
    </Stack.Navigator>
  );
}
