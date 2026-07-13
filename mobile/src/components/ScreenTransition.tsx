import { useCallback, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useSettings } from '../storage/useSettings';

const MORPH_MS = 260;
/** Fast out, slow in: motion decelerates into its resting place instead of bouncing past it. */
const MORPH_EASING = Easing.bezier(0.2, 0, 0, 1);

/**
 * Morph-style entrance: the screen cross-fades in while settling from a barely-larger scale.
 * Paired with a cross-fading navigator animation, elements that sit in the same place on both
 * screens (header, board, cards) read as one element flowing into the next rather than a cut.
 * There is deliberately no overshoot — the motion only decelerates.
 */
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const { animations } = useSettings();
  const progress = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      if (!animations) {
        progress.setValue(1);
        return;
      }

      progress.setValue(0);
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: MORPH_MS,
        easing: MORPH_EASING,
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }, [animations, progress])
  );

  if (!animations) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          opacity: progress,
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }) }],
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
