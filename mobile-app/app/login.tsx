import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import ModernLoginScreen from '@/components/ModernLoginScreen';
import SplashAnimation from '@/components/SplashAnimation';
import { Colors } from '@/constants/Colors';
import { API_BASE_URL } from '@/config/api';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [registrationData, setRegistrationData] = useState({
    full_name: '',
    email: '',
    age: '',
    pincode: '',
    address: ''
  });
  const [errors, setErrors] = useState({
    phone: '',
    email: '',
    full_name: '',
    age: '',
    pincode: '',
    address: '',
    general: ''
  });
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        // User is already authenticated, redirect to home
        console.log('User already authenticated, redirecting to home');
        router.replace('/home');
        return;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Clear any existing user state when login page loads (only if not authenticated)
  useEffect(() => {
    if (!isCheckingAuth) {
      const clearUserState = async () => {
        try {
          // Clear all storage to ensure clean logout
          await AsyncStorage.clear();
          console.log('Cleared all storage on login page load');
          
          // Reset all state
          setPhone('');
          setOtp('');
          setIsNewUser(false);
          setRegistrationData({
            full_name: '',
            email: '',
            age: '',
            pincode: '',
            address: ''
          });
          console.log('Reset all login state');
        } catch (error) {
          console.error('Error clearing user state:', error);
        }
      };
      
      clearUserState();
    }
  }, [isCheckingAuth]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const handleSendOTP = async (phoneNumber: string) => {
    setPhone(phoneNumber);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const data = await response.json();
      if (response.ok) {
        setStep('otp');
        setOtpCooldown(30);
        Alert.alert('Success', 'OTP sent to your phone number');
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (value: string) => {
    return /.+@.+\..+/.test(value);
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, otp })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.data.isNewUser) {
          setIsNewUser(true);
          setStep('register');
        } else {
          await AsyncStorage.setItem('userToken', data.data.token);
          router.replace('/home');
        }
      } else {
        setOtpError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      setOtpError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validate registration data
    const { full_name, email, age, pincode, address } = registrationData;
    let hasError = false;
    let newErrors = { ...errors, general: '' };
    if (!full_name) {
      newErrors.full_name = 'Full name is required';
      hasError = true;
    } else {
      newErrors.full_name = '';
    }
    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      hasError = true;
    } else {
      newErrors.email = '';
    }
    if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      newErrors.age = 'Please enter a valid age';
      hasError = true;
    } else {
      newErrors.age = '';
    }
    if (!pincode || pincode.length !== 6) {
      newErrors.pincode = 'Pincode must be 6 digits';
      hasError = true;
    } else {
      newErrors.pincode = '';
    }
    if (!address || address.length < 10) {
      newErrors.address = 'Address is required (min 10 chars)';
      hasError = true;
    } else {
      newErrors.address = '';
    }
    setErrors(newErrors);
    if (hasError) return;
    setLoading(true);
    try {
      const requestBody = {
        phone,
        full_name,
        email,
        age: parseInt(age),
        pincode,
        address
      };
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('userToken', data.data.token);
        router.replace('/home');
      } else {
        if (data.errors) {
          const errorMessages = data.errors.map((err: any) => err.msg).join(', ');
          setErrors((prev) => ({ ...prev, general: errorMessages }));
        } else {
          setErrors((prev) => ({ ...prev, general: data.message || 'Registration failed' }));
        }
      }
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: 'Network error. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpCooldown > 0) return;
    setOtpCooldown(30);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'OTP resent to your phone number');
      } else {
        Alert.alert('Error', data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return <SplashAnimation message="Checking authentication..." />;
  }

  const renderOTPStep = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('phone')}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify OTP</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="bicycle" size={40} color={Colors.light.primary} />
            </View>
            <Text style={styles.appName}>Cycle-Bees</Text>
          </View>

          {/* OTP Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enter OTP</Text>
            <Text style={styles.formSubtitle}>
              We've sent a 6-digit code to +91 {phone}
            </Text>

            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={Colors.light.gray}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
              />
            </View>

            {otpError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.light.error} />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!otp || otp.length !== 6 || loading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyOTP}
              disabled={!otp || otp.length !== 6 || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.light.background} size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resendButton,
                otpCooldown > 0 && styles.resendButtonDisabled,
              ]}
              onPress={handleResendOTP}
              disabled={otpCooldown > 0}
            >
              <Text style={styles.resendButtonText}>
                {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderRegisterStep = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('otp')}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Complete Profile</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="bicycle" size={40} color={Colors.light.primary} />
            </View>
            <Text style={styles.appName}>Cycle-Bees</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create Your Profile</Text>
            <Text style={styles.formSubtitle}>
              Please provide your details to complete registration
            </Text>

            {errors.general ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.light.error} />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.full_name && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.light.gray}
                value={registrationData.full_name}
                onChangeText={(text) => setRegistrationData(prev => ({ ...prev, full_name: text }))}
              />
              {errors.full_name ? (
                <Text style={styles.fieldErrorText}>{errors.full_name}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor={Colors.light.gray}
                value={registrationData.email}
                onChangeText={(text) => setRegistrationData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? (
                <Text style={styles.fieldErrorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age *</Text>
              <TextInput
                style={[styles.input, errors.age && styles.inputError]}
                placeholder="Enter your age"
                placeholderTextColor={Colors.light.gray}
                value={registrationData.age}
                onChangeText={(text) => setRegistrationData(prev => ({ ...prev, age: text }))}
                keyboardType="number-pad"
              />
              {errors.age ? (
                <Text style={styles.fieldErrorText}>{errors.age}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                style={[styles.input, errors.pincode && styles.inputError]}
                placeholder="Enter 6-digit pincode"
                placeholderTextColor={Colors.light.gray}
                value={registrationData.pincode}
                onChangeText={(text) => setRegistrationData(prev => ({ ...prev, pincode: text }))}
                keyboardType="number-pad"
                maxLength={6}
              />
              {errors.pincode ? (
                <Text style={styles.fieldErrorText}>{errors.pincode}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.address && styles.inputError]}
                placeholder="Enter your complete address"
                placeholderTextColor={Colors.light.gray}
                value={registrationData.address}
                onChangeText={(text) => setRegistrationData(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.address ? (
                <Text style={styles.fieldErrorText}>{errors.address}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                loading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.light.background} size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Render based on current step
  if (step === 'phone') {
    return <ModernLoginScreen onSendOTP={handleSendOTP} loading={loading} />;
  }

  if (step === 'otp') {
    return renderOTPStep();
  }

  if (step === 'register') {
    return renderRegisterStep();
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.secondary,
  },
  placeholder: {
    width: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.accent1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.secondary,
  },
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: Colors.light.shadow,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 4,
      },
    }),
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.light.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  otpContainer: {
    marginBottom: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    color: Colors.light.secondary,
    backgroundColor: Colors.light.background,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.secondary,
    backgroundColor: Colors.light.background,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: Colors.light.error,
    marginLeft: 6,
  },
  fieldErrorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 4,
    marginLeft: 4,
  },
  verifyButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.light.gray,
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: Colors.light.gray,
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
}); 