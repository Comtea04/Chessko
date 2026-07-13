import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MyPageScreen } from '../screens/mypage/MyPageScreen';
import { SettingsScreen } from '../screens/mypage/SettingsScreen';
import { withScreenTransition } from '../components/ScreenTransition';
import { useSettings } from '../storage/useSettings';
import { colors } from '../theme';
import type { MyPageStackParamList } from './types';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

const MyPage = withScreenTransition(MyPageScreen);
const Settings = withScreenTransition(SettingsScreen);

export function MyPageStackNavigator() {
  const { animations } = useSettings();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        animation: animations ? 'fade' : 'none',
        gestureEnabled: animations,
        fullScreenGestureEnabled: animations,
      }}
    >
      <Stack.Screen name="MyPage" component={MyPage} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: '설정' }} />
    </Stack.Navigator>
  );
}
