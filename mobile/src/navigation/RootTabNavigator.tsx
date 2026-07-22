import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { OpeningStackNavigator } from './OpeningStackNavigator';
import { PracticeStackNavigator } from './PracticeStackNavigator';
import { MyPageStackNavigator } from './MyPageStackNavigator';
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
        // Tabs swap outright for the same reason the stacks do: fading between two opaque screens
        // means showing both of them halfway through, which reads as the old screen bleeding into
        // the new one rather than as a morph.
        animation: 'none',
        tabBarIcon: ({ focused, color, size }) => {
          const icon = ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="OpeningTab" component={OpeningStackNavigator} options={{ title: '오프닝' }} />
      <Tab.Screen name="PracticeTab" component={PracticeStackNavigator} options={{ title: '연습' }} />
      <Tab.Screen name="MyPageTab" component={MyPageStackNavigator} options={{ title: '마이페이지' }} />
    </Tab.Navigator>
  );
}
