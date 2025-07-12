import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

interface ScreenTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
  duration?: number;
  onAnimationComplete?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function ScreenTransition({
  children,
  isVisible,
  direction = 'fade',
  duration = 300,
  onAnimationComplete
}: ScreenTransitionProps) {
  const animatedValue = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const slideValue = useRef(new Animated.Value(isVisible ? 0 : 1)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: isVisible ? 1 : 0,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(slideValue, {
        toValue: isVisible ? 0 : 1,
        duration,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      onAnimationComplete?.();
    });

    return () => animation.stop();
  }, [isVisible, duration, animatedValue, slideValue, onAnimationComplete]);

  const getTransformStyle = () => {
    switch (direction) {
      case 'left':
        return {
          transform: [
            {
              translateX: slideValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -width],
              }),
            },
          ],
        };
      case 'right':
        return {
          transform: [
            {
              translateX: slideValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, width],
              }),
            },
          ],
        };
      case 'up':
        return {
          transform: [
            {
              translateY: slideValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -height],
              }),
            },
          ],
        };
      case 'down':
        return {
          transform: [
            {
              translateY: slideValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, height],
              }),
            },
          ],
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animatedValue,
          ...getTransformStyle(),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 