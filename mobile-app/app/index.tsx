import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SplashAnimation from '@/components/SplashAnimation';

export default function IndexScreen() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [shouldShowSplash, setShouldShowSplash] = useState(false);

  useEffect(() => {
    checkAuthAndDecideFlow();
  }, []);

  const checkAuthAndDecideFlow = async () => {
    try {
      setIsCheckingAuth(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // User is authenticated, redirect directly to home
        console.log('Token found, redirecting to home');
        router.replace('/home');
      } else {
        // User is not authenticated, show splash animation then login
        console.log('No token found, showing splash animation');
        setShouldShowSplash(true);
        // Complete animation after 3 seconds and redirect to login
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On error, show splash animation then login
      setShouldShowSplash(true);
      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return <SplashAnimation message="Checking authentication..." />;
  }

  // Show splash animation only if user is not authenticated
  if (!shouldShowSplash) {
    return null; // Don't render anything while redirecting to home
  }

  return <SplashAnimation message="Welcome to Cycle-Bees" />;
} 