import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SplashAnimation from './SplashAnimation';
import { API_BASE_URL } from '@/config/api';

interface AuthGuardProps {
  children: React.ReactNode;
  message?: string;
}

export default function AuthGuard({ children, message = "Checking authentication..." }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setIsChecking(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // Verify token is valid by making a test API call
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it and redirect to login
          await AsyncStorage.removeItem('userToken');
          setIsAuthenticated(false);
          router.replace('/login');
        }
      } else {
        // No token found, redirect to login
        setIsAuthenticated(false);
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      // On error, assume not authenticated and redirect to login
      setIsAuthenticated(false);
      router.replace('/login');
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading while checking authentication
  if (isChecking || isAuthenticated === null) {
    return <SplashAnimation message={message} />;
  }

  // If not authenticated, don't render children (will redirect to login)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
} 