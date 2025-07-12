import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Animated } from 'react-native';

interface UseRouteTransitionOptions {
  duration?: number;
  direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
}

export function useRouteTransition(options: UseRouteTransitionOptions = {}) {
  const router = useRouter();
  const { duration = 300, direction = 'fade' } = options;
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateOut = useCallback(() => {
    return new Promise<void>((resolve) => {
      setIsTransitioning(true);
      
      const animations: Animated.CompositeAnimation[] = [
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ];

      // Add slide animation based on direction
      if (direction !== 'fade') {
        const slideValue = direction === 'left' || direction === 'right' ? 100 : 50;
        animations.push(
          Animated.timing(slideAnim, {
            toValue: slideValue,
            duration: duration / 2,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start(() => {
        resolve();
      });
    });
  }, [duration, direction, fadeAnim, slideAnim]);

  const animateIn = useCallback(() => {
    return new Promise<void>((resolve) => {
      const animations: Animated.CompositeAnimation[] = [
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ];

      // Add slide animation based on direction
      if (direction !== 'fade') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start(() => {
        setIsTransitioning(false);
        resolve();
      });
    });
  }, [duration, direction, fadeAnim, slideAnim]);

  const navigateWithTransition = useCallback(async (
    route: any,
    params?: Record<string, any>
  ) => {
    await animateOut();
    
    if (params) {
      router.push({ pathname: route, params });
    } else {
      router.push(route);
    }
    
    // Small delay to ensure navigation completes
    setTimeout(() => {
      animateIn();
    }, 50);
  }, [animateOut, animateIn, router]);

  const replaceWithTransition = useCallback(async (
    route: any,
    params?: Record<string, any>
  ) => {
    await animateOut();
    
    if (params) {
      router.replace({ pathname: route, params });
    } else {
      router.replace(route);
    }
    
    // Small delay to ensure navigation completes
    setTimeout(() => {
      animateIn();
    }, 50);
  }, [animateOut, animateIn, router]);

  const backWithTransition = useCallback(async () => {
    await animateOut();
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
    
    // Small delay to ensure navigation completes
    setTimeout(() => {
      animateIn();
    }, 50);
  }, [animateOut, animateIn, router]);

  const getTransitionStyle = useCallback(() => {
    const transform: any[] = [];
    
    if (direction === 'left') {
      transform.push({
        translateX: slideAnim.interpolate({
          inputRange: [0, 100],
          outputRange: [0, -100],
        }),
      });
    } else if (direction === 'right') {
      transform.push({
        translateX: slideAnim.interpolate({
          inputRange: [0, 100],
          outputRange: [0, 100],
        }),
      });
    } else if (direction === 'up') {
      transform.push({
        translateY: slideAnim.interpolate({
          inputRange: [0, 50],
          outputRange: [0, -50],
        }),
      });
    } else if (direction === 'down') {
      transform.push({
        translateY: slideAnim.interpolate({
          inputRange: [0, 50],
          outputRange: [0, 50],
        }),
      });
    }

    return {
      opacity: fadeAnim,
      transform,
    };
  }, [direction, fadeAnim, slideAnim]);

  return {
    isTransitioning,
    navigateWithTransition,
    replaceWithTransition,
    backWithTransition,
    getTransitionStyle,
    animateOut,
    animateIn,
  };
} 