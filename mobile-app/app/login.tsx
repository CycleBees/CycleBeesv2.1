import React, { useState } from 'react';
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

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
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

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });

      if (response.ok) {
        setStep('otp');
        Alert.alert('Success', 'OTP sent to your phone number');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
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

      if (response.ok) {
        const data = await response.json();
        
        if (data.isNewUser) {
          setIsNewUser(true);
          setStep('register');
        } else {
          // Existing user - login successful
          localStorage.setItem('userToken', data.token);
          navigation.navigate('Home');
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validate registration data
    const { full_name, email, age, pincode, address } = registrationData;
    if (!full_name || !email || !age || !pincode || !address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          full_name,
          email,
          age: parseInt(age),
          pincode,
          address
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('userToken', data.token);
        Alert.alert('Success', 'Registration successful!', [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Registration failed');
      }
    } catch (error) {
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
          onChangeText={setPhone}
          placeholder="Enter 10-digit phone number"
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading}
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
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="key" size={60} color="#FFD11E" />
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
          onChangeText={setOtp}
          placeholder="Enter 6-digit OTP"
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#2D3E50" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('phone')}
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
            onChangeText={(text) => setRegistrationData({...registrationData, full_name: text})}
            placeholder="Enter your full name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.email}
            onChangeText={(text) => setRegistrationData({...registrationData, email: text})}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Age *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.age}
            onChangeText={(text) => setRegistrationData({...registrationData, age: text})}
            placeholder="Enter your age"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput
            style={styles.input}
            value={registrationData.pincode}
            onChangeText={(text) => setRegistrationData({...registrationData, pincode: text})}
            placeholder="Enter your pincode"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={registrationData.address}
            onChangeText={(text) => setRegistrationData({...registrationData, address: text})}
            placeholder="Enter your complete address"
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
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
              onPress={() => navigation.goBack()}
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
}); 