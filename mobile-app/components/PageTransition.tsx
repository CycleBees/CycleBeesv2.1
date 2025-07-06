import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

interface PageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  onAnimationComplete?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function PageTransition({
  children,
  isVisible,
  direction = 'right',
  duration = 300,
  onAnimationComplete
}: PageTransitionProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete?.();
      });
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: getSlideValue(direction),
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, direction, duration]);

  const getSlideValue = (dir: string) => {
    switch (dir) {
      case 'left':
        return -width;
      case 'right':
        return width;
      case 'up':
        return -height;
      case 'down':
        return height;
      default:
        return width;
    }
  };

  const getTransform = () => {
    switch (direction) {
      case 'left':
      case 'right':
        return [{ translateX: slideAnim }];
      case 'up':
      case 'down':
        return [{ translateY: slideAnim }];
      default:
        return [{ translateX: slideAnim }];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: getTransform(),
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