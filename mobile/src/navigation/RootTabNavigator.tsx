import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { OpeningStackNavigator } from './OpeningStackNavigator';
import { PracticeStackNavigator } from './PracticeStackNavigator';
import { MyPageScreen } from '../screens/mypage/MyPageScreen';
import { colors } from '../theme';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  OpeningTab: { active: 'book', inactive: 'book-outline' },
  PracticeTab: { active: 'barbell', inactive: 'barbell-outline' },
  MyPageTab: { active: 'person', inactive: 'person-outline' },
};

export function RootTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icon = ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="OpeningTab" component={OpeningStackNavigator} options={{ title: '오프닝' }} />
      <Tab.Screen name="PracticeTab" component={PracticeStackNavigator} options={{ title: '연습' }} />
      <Tab.Screen name="MyPageTab" component={MyPageScreen} options={{ title: '마이페이지' }} />
    </Tab.Navigator>
  );
}
