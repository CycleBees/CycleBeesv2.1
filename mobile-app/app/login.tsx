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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
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

  // Clear any existing user state when login page loads
  useEffect(() => {
    const clearUserState = async () => {
      try {
        // Clear all storage to ensure clean logout
        await AsyncStorage.clear();
        console.log('Cleared all storage on login page load');
        
        // Reset all state
        setStep('phone');
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
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const validatePhone = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(value);
  };

  const validateEmail = (value: string) => {
    return /.+@.+\..+/.test(value);
  };

  const handleSendOTP = async () => {
    if (!validatePhone(phone)) {
      setErrors((prev) => ({ ...prev, phone: 'Please enter a valid 10-digit Indian mobile number' }));
      Alert.alert('Error', 'Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setErrors((prev) => ({ ...prev, phone: '' }));
    setOtpError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (response.ok) {
        setStep('otp');
        setOtpCooldown(30);
        Alert.alert('Success', 'OTP sent to your phone number');
      } else {
        setErrors((prev) => ({ ...prev, phone: data.message || 'Failed to send OTP' }));
        setOtpError(data.message || 'Failed to send OTP');
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setErrors((prev) => ({ ...prev, phone: 'Network error. Please try again.' }));
      setOtpError('Network error. Please try again.');
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/verify-otp', {
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
          router.push('/');
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
      console.log('Sending registration data:', requestBody);
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      console.log('Registration response:', { status: response.status, data });
      if (response.ok) {
        await AsyncStorage.setItem('userToken', data.data.token);
        // Registration successful - navigate directly to dashboard
        router.push('/');
      } else {
        // Show specific error for email/phone
        if (data.message && data.message.includes('email')) {
          setErrors((prev) => ({ ...prev, email: data.message }));
        } else if (data.message && data.message.includes('phone')) {
          setErrors((prev) => ({ ...prev, phone: data.message }));
        } else {
          setErrors((prev) => ({ ...prev, general: data.message || 'Registration failed. Please try again.' }));
        }
        Alert.alert('Registration Failed', data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: 'Network error. Please try again.' }));
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="phone-portrait" size={60} color="#FFD11E" />
      </View>
      <Text style={styles.title}>Enter Your Phone Number</Text>
      <Text style={styles.subtitle}>
        We'll send you a verification code to get started
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setErrors((prev) => ({ ...prev, phone: '' }));
          }}
          placeholder="Enter 10-digit phone number"
          keyboardType="phone-pad"
          maxLength={10}
        />
        {!!errors.phone && <Text style={{ color: 'red', marginTop: 4 }}>{errors.phone}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading || !validatePhone(phone)}
      >
        {loading ? (
          <ActivityIndicator color="#2D3E50" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={[styles.stepContainer, styles.shadow]}>
      {otpError ? <Text style={styles.globalError}>{otpError}</Text> : null}
      <View style={styles.iconContainer}>
        <Ionicons name="key" size={60} color="#FFD11E" accessibilityLabel="OTP Icon" />
      </View>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit code to {phone}
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>OTP Code</Text>
        <TextInput
          style={styles.input}
          value={otp}
          onChangeText={(text) => {
            setOtp(text);
            setOtpError('');
          }}
          placeholder="Enter 6-digit OTP"
          keyboardType="number-pad"
          maxLength={6}
          accessibilityLabel="OTP Input"
        />
        {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading || otp.length !== 6}
        accessibilityLabel="Verify OTP Button"
      >
        {loading ? (
          <ActivityIndicator color="#2D3E50" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, otpCooldown > 0 && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={otpCooldown > 0}
        accessibilityLabel="Resend OTP Button"
      >
        <Text style={styles.buttonText}>{otpCooldown > 0 ? `Resend OTP (${otpCooldown}s)` : 'Resend OTP'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('phone')}
        accessibilityLabel="Back to Phone Button"
      >
        <Text style={styles.backButtonText}>← Back to Phone</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRegisterStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="person-add" size={60} color="#FFD11E" />
      </View>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Please provide your details to complete registration
      </Text>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.full_name}
            onChangeText={(text) => {
              setRegistrationData({ ...registrationData, full_name: text });
              setErrors((prev) => ({ ...prev, full_name: '' }));
            }}
            placeholder="Enter your full name"
          />
          {!!errors.full_name && <Text style={{ color: 'red', marginTop: 4 }}>{errors.full_name}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.email}
            onChangeText={(text) => {
              setRegistrationData({ ...registrationData, email: text });
              setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!!errors.email && <Text style={{ color: 'red', marginTop: 4 }}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Age *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.age}
            onChangeText={(text) => {
              setRegistrationData({ ...registrationData, age: text });
              setErrors((prev) => ({ ...prev, age: '' }));
            }}
            placeholder="Enter your age"
            keyboardType="number-pad"
          />
          {!!errors.age && <Text style={{ color: 'red', marginTop: 4 }}>{errors.age}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.pincode}
            onChangeText={(text) => {
              setRegistrationData({ ...registrationData, pincode: text });
              setErrors((prev) => ({ ...prev, pincode: '' }));
            }}
            placeholder="Enter your pincode"
            keyboardType="number-pad"
            maxLength={6}
          />
          {!!errors.pincode && <Text style={{ color: 'red', marginTop: 4 }}>{errors.pincode}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={registrationData.address}
            onChangeText={(text) => {
              setRegistrationData({ ...registrationData, address: text });
              setErrors((prev) => ({ ...prev, address: '' }));
            }}
            placeholder="Enter your complete address"
            multiline
            numberOfLines={3}
          />
          {!!errors.address && <Text style={{ color: 'red', marginTop: 4 }}>{errors.address}</Text>}
        </View>
        {!!errors.general && <Text style={{ color: 'red', marginTop: 4 }}>{errors.general}</Text>}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading || !registrationData.full_name || !validateEmail(registrationData.email) || !registrationData.age || !registrationData.pincode || !registrationData.address}
      >
        {loading ? (
          <ActivityIndicator color="#2D3E50" />
        ) : (
          <Text style={styles.buttonText}>Complete Registration</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('otp')}
      >
        <Text style={styles.backButtonText}>← Back to OTP</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#2D3E50" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cycle-Bees</Text>
            <View style={{ width: 24 }} />
          </View>

          {step === 'phone' && renderPhoneStep()}
          {step === 'otp' && renderOTPStep()}
          {step === 'register' && renderRegisterStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFD11E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  formContainer: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2D3E50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FFD11E',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#2D3E50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#4A4A4A',
    fontSize: 16,
    fontWeight: '600',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  globalError: {
    color: '#fff',
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    marginTop: 4,
    fontWeight: '600',
  },
}); 