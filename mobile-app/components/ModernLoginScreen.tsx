import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

interface ModernLoginScreenProps {
  onSendOTP: (phone: string) => Promise<void>;
  loading: boolean;
}

export default function ModernLoginScreen({ onSendOTP, loading }: ModernLoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidPhone, setIsValidPhone] = useState(false);
  
  const logoScale = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const inputFocus = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    validatePhone(phone);
  }, [phone]);

  const validatePhone = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    const isValid = phoneRegex.test(value);
    setIsValidPhone(isValid);
    
    if (value.length > 0 && !isValid) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
    } else {
      setPhoneError('');
    }
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits
    const numericValue = value.replace(/[^0-9]/g, '');
    setPhone(numericValue);
  };

  const handleSendOTP = async () => {
    if (!isValidPhone) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    try {
      await onSendOTP(phone);
    } catch (error) {
      console.error('Error sending OTP:', error);
    }
  };

  const handleInputFocus = () => {
    Animated.timing(inputFocus, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleInputBlur = () => {
    Animated.timing(inputFocus, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const inputBorderColor = inputFocus.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.light.border, Colors.light.primary],
  });

  return (
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
          {/* Background gradient */}
          <View style={styles.backgroundGradient}>
            <View style={styles.gradientCircle1} />
            <View style={styles.gradientCircle2} />
          </View>

          {/* Logo section */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Ionicons name="bicycle" size={48} color={Colors.light.primary} />
            </View>
            <Text style={styles.appName}>Cycle-Bees</Text>
            <Text style={styles.tagline}>Your trusted cycling partner</Text>
          </Animated.View>

          {/* Login form */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View style={styles.formCard}>
              <Text style={styles.loginTitle}>Login / Sign Up</Text>
              <Text style={styles.loginSubtitle}>
                Enter your phone number to continue
              </Text>

              {/* Phone input */}
              <View style={styles.inputContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: inputBorderColor,
                    },
                  ]}
                >
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter your phone number"
                    placeholderTextColor={Colors.light.gray}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus={false}
                  />
                  {phone.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setPhone('')}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.light.gray} />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </View>

              {phoneError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={Colors.light.error} />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              ) : null}

              {/* Send OTP button */}
              <TouchableOpacity
                style={[
                  styles.sendOtpButton,
                  (!isValidPhone || loading) && styles.sendOtpButtonDisabled,
                ]}
                onPress={handleSendOTP}
                disabled={!isValidPhone || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.light.background} size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={Colors.light.background} />
                    <Text style={styles.sendOtpButtonText}>Send OTP</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Terms and conditions */}
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.light.accent1,
    opacity: 0.3,
  },
  gradientCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.light.accent2,
    opacity: 0.2,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.accent1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(255, 209, 30, 0.3)',
      },
      default: {
        shadowColor: Colors.light.primary,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.secondary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.light.gray,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formContainer: {
    zIndex: 1,
  },
  formCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: Colors.light.shadow,
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 1,
        shadowRadius: 32,
        elevation: 8,
      },
    }),
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: Colors.light.gray,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  phonePrefix: {
    backgroundColor: Colors.light.accent1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRightWidth: 0,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.secondary,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.secondary,
    paddingVertical: 16,
  },
  clearButton: {
    padding: 4,
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
  sendOtpButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(255, 209, 30, 0.3)',
      },
      default: {
        shadowColor: Colors.light.primary,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  sendOtpButtonDisabled: {
    backgroundColor: Colors.light.gray,
    opacity: 0.6,
  },
  sendOtpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
    marginLeft: 8,
  },
  termsText: {
    fontSize: 12,
    color: Colors.light.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
}); 