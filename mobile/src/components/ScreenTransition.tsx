import { useCallback, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useSettings } from '../storage/useSettings';

/**
 * Springs a screen into place when it gains focus: it settles with a slight overshoot, so
 * entering a screen feels elastic rather than instant. Damping is deliberately below critical —
 * that overshoot *is* the effect. Disabled by the springTransitions setting.
 */
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const { springTransitions } = useSettings();
  const progress = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      if (!springTransitions) {
        progress.setValue(1);
        return;
      }

      progress.setValue(0);
      const animation = Animated.spring(progress, {
        toValue: 1,
        stiffness: 170,
        damping: 12,
        mass: 0.9,
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }, [springTransitions, progress])
  );

  if (!springTransitions) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Wraps a screen component so it can be handed straight to a navigator. */
export function withScreenTransition<P extends object>(Screen: React.ComponentType<P>) {
  return function TransitionedScreen(props: P) {
    return (
      <ScreenTransition>
        <Screen {...props} />
      </ScreenTransition>
    );
  };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
