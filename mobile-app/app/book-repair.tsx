import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Modal,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import AuthGuard from '@/components/AuthGuard';
import PageTransition from '@/components/PageTransition';
import StepIndicator from '@/components/StepIndicator';
import { API_BASE_URL } from '@/config/api';


interface RepairService {
  id: number;
  name: string;
  description: string;
  special_instructions: string;
  price: number;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
}

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 'services', title: 'Services', icon: 'construct' },
  { id: 'details', title: 'Details', icon: 'document-text' },
  { id: 'summary', title: 'Summary', icon: 'checkmark-circle' },
];

export default function BookRepairScreen() {
  const router = useRouter();

  const handleBackPress = () => {
    // Check if we can go back, if not navigate to home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };
  const [step, setStep] = useState<'services' | 'details' | 'summary'>('services');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [repairServices, setRepairServices] = useState<RepairService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [mechanicCharge, setMechanicCharge] = useState(0);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Form data
  const [selectedServices, setSelectedServices] = useState<RepairService[]>([]);
  const [formData, setFormData] = useState({
    alternate_number: '',
    email: '',
    notes: '',
    address: '',
    preferred_date: new Date(),
    time_slot_id: 0
  });
  
  // File uploads
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'offline'>('offline');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeSlotPicker, setShowTimeSlotPicker] = useState(false);
  
  // Confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // ✅ UTILITY FUNCTION TO GET FILE TYPE
  const getFileTypeFromUri = (uri: string): string => {
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'mp4':
        return 'video/mp4';
      case 'avi':
        return 'video/avi';
      case 'mov':
        return 'video/quicktime';
      case 'mkv':
        return 'video/x-matroska';
      default:
        return 'image/jpeg'; // fallback
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchRepairServices();
    fetchTimeSlots();
    fetchMechanicCharge();
    
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getCurrentStepIndex = () => {
    return STEPS.findIndex(s => s.id === step);
  };

  const handleStepChange = (newStep: 'services' | 'details' | 'summary') => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(newStep);
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const nextStep = () => {
    // Clear previous errors
    setErrors({});
    
    if (step === 'services') {
      console.log('Services step - selectedServices.length:', selectedServices.length);
      if (selectedServices.length === 0) {
        console.log('No services selected - showing inline error');
        setErrors({ services: 'Please select at least one repair service to continue.' });
        return;
      }
      handleStepChange('details');
    } else if (step === 'details') {
      console.log('Details step validation:');
      console.log('- time_slot_id:', formData.time_slot_id);
      console.log('- address:', formData.address);
      console.log('- email:', formData.email);
      
      const newErrors: {[key: string]: string} = {};
      
      // Validate required fields before proceeding to summary
      if (!formData.time_slot_id) {
        console.log('No time slot selected - showing inline error');
        newErrors.timeSlot = 'Please select a preferred time slot for the repair service.';
      }
      if (!formData.address.trim()) {
        console.log('No address entered - showing inline error');
        newErrors.address = 'Please enter your service address to continue.';
      }
      if (!formData.email.trim()) {
        console.log('No email entered - showing inline error');
        newErrors.email = 'Please enter your email address to continue.';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      handleStepChange('summary');
    } else if (step === 'summary') {
      // Call handleSubmit when on summary step
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step === 'details') {
      handleStepChange('services');
    } else if (step === 'summary') {
      handleStepChange('details');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setFormData(prev => ({
          ...prev,
          email: data.data.user.email,
          address: data.data.user.address || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchRepairServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repair/services`);
      if (response.ok) {
        const data = await response.json();
        setRepairServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching repair services:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repair/time-slots`);
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchMechanicCharge = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repair/mechanic-charge`);
      if (response.ok) {
        const data = await response.json();
        setMechanicCharge(data.data.amount || 0);
      }
    } catch (error) {
      console.error('Error fetching mechanic charge:', error);
    }
  };

  const toggleService = (service: RepairService) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Error', 'Maximum 5 images allowed');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // ✅ ADD FILE SIZE VALIDATION
        try {
          const fileInfo = await fetch(result.assets[0].uri);
          const blob = await fileInfo.blob();
          
          if (blob.size > 50 * 1024 * 1024) { // 50MB
            Alert.alert('Error', 'File size too large. Maximum 50MB allowed.');
            return;
          }
          
          setImages([...images, result.assets[0].uri]);
        } catch (error) {
          console.error('Error checking file size:', error);
          // If we can't check size, still allow the file but warn user
          Alert.alert('Warning', 'Could not verify file size. Please ensure it\'s under 50MB.');
          setImages([...images, result.assets[0].uri]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickVideo = async () => {
    if (video) {
      Alert.alert('Error', 'Only 1 video allowed. Please remove the current video first.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // ✅ ADD FILE SIZE VALIDATION
        try {
          const fileInfo = await fetch(result.assets[0].uri);
          const blob = await fileInfo.blob();
          
          if (blob.size > 50 * 1024 * 1024) { // 50MB
            Alert.alert('Error', 'File size too large. Maximum 50MB allowed.');
            return;
          }
          
          setVideo(result.assets[0].uri);
        } catch (error) {
          console.error('Error checking file size:', error);
          // If we can't check size, still allow the file but warn user
          Alert.alert('Warning', 'Could not verify file size. Please ensure it\'s under 50MB.');
          setVideo(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideo(null);
  };

  const calculateTotal = () => {
    const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    return servicesTotal + mechanicCharge;
  };

  const applyCoupon = async () => {
    setCouponError('');
    setDiscount(0);
    setAppliedCoupon(null);
    if (!coupon.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setCouponError('Please login first');
        return;
      }
      // Prepare items array based on selected services and mechanic charge
      const items = ['service_mechanic_charge']; // Always include mechanic charge
      selectedServices.forEach(() => {
        items.push('repair_services');
      });
      
      const totalAmount = calculateTotal();
      console.log('Applying coupon:', {
        code: coupon,
        requestType: 'repair',
        items: items,
        totalAmount: totalAmount
      });
      
      const response = await fetch(`${API_BASE_URL}/api/coupon/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: coupon, 
          requestType: 'repair',
          items: items,
          totalAmount: totalAmount
        })
      });
      const data = await response.json();
      console.log('Coupon response:', data);
      if (response.ok && data.success) {
        setAppliedCoupon(data.data);
        setDiscount(data.data.discount || 0);
        setCouponError(''); // Clear any previous errors
      } else {
        setCouponError(data.message || 'Invalid coupon');
      }
    } catch (error) {
      console.error('Coupon apply error:', error);
      setCouponError('Network error. Please try again.');
    }
  };

  const calculateTotalWithDiscount = () => {
    return Math.max(0, calculateTotal() - discount);
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one repair service');
      return;
    }
    if (!formData.time_slot_id) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    // Show confirmation modal instead of submitting directly
    setShowConfirmationModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmationModal(false);
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formDataToSend = new FormData();
      
      // Add basic form fields - match backend field names exactly
      formDataToSend.append('contactNumber', user?.phone || '');
      formDataToSend.append('alternateNumber', formData.alternate_number || '');
      formDataToSend.append('email', formData.email || '');
      formDataToSend.append('notes', formData.notes || '');
      formDataToSend.append('address', formData.address || '');
      formDataToSend.append('preferredDate', formData.preferred_date.toISOString().split('T')[0]);
      formDataToSend.append('timeSlotId', formData.time_slot_id.toString());
      formDataToSend.append('paymentMethod', paymentMethod);
      formDataToSend.append('totalAmount', calculateTotalWithDiscount().toString());
      
      // Add services as JSON string - backend expects services field with JSON array
      formDataToSend.append('services', JSON.stringify(
        selectedServices.map(service => ({
          serviceId: service.id,
          price: service.price,
          discountAmount: 0
        }))
      ));

      // ✅ IMPROVED FILE APPENDING with better naming and file type detection
      images.forEach((imageUri, index) => {
        const timestamp = Date.now();
        const fileType = getFileTypeFromUri(imageUri);
        const extension = fileType.split('/')[1];
        const fileName = `image_${index}_${timestamp}.${extension}`;
        formDataToSend.append('files', {
          uri: imageUri,
          type: fileType,
          name: fileName
        } as any);
      });

      if (video) {
        const timestamp = Date.now();
        const fileType = getFileTypeFromUri(video);
        const extension = fileType.split('/')[1];
        const videoFileName = `video_${timestamp}.${extension}`;
        formDataToSend.append('files', {
          uri: video,
          type: fileType,
          name: videoFileName
        } as any);
      }
      
      console.log('Submitting repair request with data:', {
        contactNumber: user?.phone,
        alternateNumber: formData.alternate_number,
        email: formData.email,
        notes: formData.notes,
        address: formData.address,
        preferredDate: formData.preferred_date.toISOString().split('T')[0],
        timeSlotId: formData.time_slot_id,
        paymentMethod: paymentMethod,
        totalAmount: calculateTotalWithDiscount(),
        services: selectedServices.map(service => ({
          serviceId: service.id,
          price: service.price,
          discountAmount: 0
        })),
        filesCount: images.length + (video ? 1 : 0)
      });

      const response = await fetch(`${API_BASE_URL}/api/repair/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the browser set it with boundary
        },
        body: formDataToSend
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        console.log('Repair request submitted successfully');
        setLoading(false);
        setTimeout(() => {
          router.replace('/my-requests?tab=repair');
        }, 500);
        return;
      } else {
        // ✅ IMPROVED ERROR HANDLING
        console.error('Backend error:', data);
        let errorMessage = 'Failed to submit repair request';
        
        if (data.message) {
          errorMessage = data.message;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.map((e: any) => e.msg).join(', ');
        }
        
        Alert.alert('Error', errorMessage);
        setLoading(false);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const selectDate = (date: Date) => {
    setFormData({...formData, preferred_date: date});
    setShowDatePicker(false);
  };

  const selectTimeSlot = (slotId: number) => {
    setFormData({...formData, time_slot_id: slotId});
    setShowTimeSlotPicker(false);
  };

  const getSelectedTimeSlotText = () => {
    const selectedSlot = timeSlots.find(s => s.id === formData.time_slot_id);
    return selectedSlot ? `${selectedSlot.start_time} - ${selectedSlot.end_time}` : 'Select time slot';
  };

  const renderServicesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Repair Services</Text>
      <Text style={styles.stepSubtitle}>Choose the services you need</Text>
      
      <View style={styles.servicesGrid}>
        {repairServices.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCardCompact, isSelected && styles.serviceCardSelected]}
              onPress={() => toggleService(service)}
            >
              <View style={styles.serviceCardContent}>
                <View style={styles.serviceCardHeader}>
                  <Text style={styles.serviceNameCompact}>{service.name}</Text>
                  <Text style={styles.servicePriceCompact}>₹{service.price}</Text>
                </View>
                <Text style={styles.serviceDescriptionCompact} numberOfLines={2}>
                  {service.description}
                </Text>
                {isSelected && (
                  <View style={styles.selectedIndicatorCompact}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {errors.services && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#dc3545" />
          <Text style={styles.errorText}>{errors.services}</Text>
      </View>
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact & Details</Text>
      <Text style={styles.stepSubtitle}>Provide additional information</Text>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contact Number</Text>
          <Text style={styles.inputValue}>{user?.phone}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Alternate Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.alternate_number}
            onChangeText={(text) => setFormData({...formData, alternate_number: text})}
            placeholder="Enter alternate number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(text) => {
              setFormData({...formData, email: text});
              if (errors.email) setErrors(prev => ({...prev, email: ''}));
            }}
            placeholder="Enter email address"
            keyboardType="email-address"
          />
          {errors.email && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#dc3545" />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.address && styles.inputError]}
            value={formData.address}
            onChangeText={(text) => {
              setFormData({...formData, address: text});
              if (errors.address) setErrors(prev => ({...prev, address: ''}));
            }}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
          />
          {errors.address && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#dc3545" />
              <Text style={styles.errorText}>{errors.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({...formData, notes: text})}
            placeholder="Any special instructions or notes"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Upload Images (Optional, Max 6)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Ionicons name="camera" size={24} color="#FFD11E" />
            <Text style={styles.uploadButtonText}>Add Images</Text>
          </TouchableOpacity>
          {images.length > 0 && (
            <View style={styles.imagePreview}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: `${API_BASE_URL}/${uri}` }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Upload Video (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
            <Ionicons name="videocam" size={24} color="#FFD11E" />
            <Text style={styles.uploadButtonText}>Add Video</Text>
          </TouchableOpacity>
          {video && (
            <View style={styles.videoPreview}>
              <Text style={styles.videoText}>Video selected</Text>
              <TouchableOpacity onPress={removeVideo}>
                <Ionicons name="close-circle" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preferred Date</Text>
          <TouchableOpacity 
            style={styles.datePickerButton} 
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>
              {formData.preferred_date.toLocaleDateString()}
            </Text>
            <Ionicons name="calendar" size={20} color="#FFD11E" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Time Slot *</Text>
          <TouchableOpacity 
            style={[styles.timeSlotPickerButton, errors.timeSlot && styles.inputError]} 
            onPress={() => setShowTimeSlotPicker(true)}
          >
            <Text style={[
              styles.timeSlotPickerText,
              formData.time_slot_id === 0 && styles.placeholderText
            ]}>
              {getSelectedTimeSlotText()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#FFD11E" />
          </TouchableOpacity>
          {errors.timeSlot && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#dc3545" />
              <Text style={styles.errorText}>{errors.timeSlot}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
        {/* Services Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={styles.iconContainer}>
              <Ionicons name="construct" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Selected Services</Text>
            <Text style={styles.serviceCount}>{selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.servicesList}>
            {selectedServices.map((service, index) => (
              <View key={service.id} style={[styles.summaryItemRowEnhanced, index === selectedServices.length - 1 && styles.lastItem]}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.summaryItemNameEnhanced}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>
                <Text style={styles.summaryItemPriceEnhanced}>₹{service.price}</Text>
            </View>
          ))}
          </View>
        </View>

        {/* Contact Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B' }]}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Contact Information</Text>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Ionicons name="call" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>{user?.phone}</Text>
            </View>
          {formData.alternate_number && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color="#6c757d" style={styles.contactIcon} />
                <Text style={styles.summaryTextEnhanced}>{formData.alternate_number}</Text>
              </View>
          )}
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>{formData.email}</Text>
            </View>
          </View>
        </View>

        {/* Address Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Service Address</Text>
          </View>
          <View style={styles.addressInfo}>
            <Ionicons name="location-outline" size={16} color="#6c757d" style={styles.contactIcon} />
            <Text style={styles.summaryTextEnhanced}>{formData.address}</Text>
          </View>
        </View>

        {/* Schedule Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#45B7D1' }]}>
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Schedule</Text>
          </View>
          <View style={styles.scheduleInfo}>
            <View style={styles.scheduleRow}>
              <Ionicons name="calendar-outline" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>{formData.preferred_date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Ionicons name="time" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>{timeSlots.find(s => s.id === formData.time_slot_id)?.start_time} - {timeSlots.find(s => s.id === formData.time_slot_id)?.end_time}</Text>
            </View>
          </View>
        </View>

        {/* Notes Card */}
        {formData.notes && (
          <View style={styles.summaryCardEnhanced}>
            <View style={styles.summaryCardHeaderEnhanced}>
              <View style={[styles.iconContainer, { backgroundColor: '#96CEB4' }]}>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.summaryCardTitleEnhanced}>Special Notes</Text>
            </View>
            <View style={styles.notesInfo}>
              <Ionicons name="chatbubble-outline" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>{formData.notes}</Text>
            </View>
          </View>
        )}

        {/* Coupon Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFA726' }]}>
              <Ionicons name="pricetag" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Apply Coupon</Text>
          </View>
          <View style={styles.couponInputContainerEnhanced}>
            <TextInput
              style={styles.couponInput}
              value={coupon}
              onChangeText={setCoupon}
              placeholder="Enter coupon code"
              autoCapitalize="characters"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity style={styles.applyCouponButtonEnhanced} onPress={applyCoupon}>
              <Text style={styles.applyCouponTextEnhanced}>Apply</Text>
            </TouchableOpacity>
          </View>
          {couponError ? <Text style={styles.couponErrorEnhanced}>{couponError}</Text> : null}
          {appliedCoupon && (
            <View style={styles.couponSuccessContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#28a745" />
              <Text style={styles.couponSuccessEnhanced}>
              Coupon "{appliedCoupon.code}" applied! Discount: ₹{discount}
            </Text>
            </View>
          )}
        </View>

        {/* Payment Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="wallet" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Payment Method</Text>
          </View>
          <View style={styles.paymentOptionsContainerEnhanced}>
            <TouchableOpacity
              style={[styles.paymentOptionEnhanced, styles.paymentOptionDisabled]}
              disabled={true}
            >
              <Ionicons name="radio-button-off" size={20} color="#ccc" />
              <Text style={styles.paymentOptionTextDisabled}>Online (Coming Soon)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOptionEnhanced, paymentMethod === 'offline' && styles.paymentOptionSelectedEnhanced]}
              onPress={() => setPaymentMethod('offline')}
            >
              <Ionicons name={paymentMethod === 'offline' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#FFD11E" />
              <Text style={styles.paymentOptionTextEnhanced}>Offline (Cash)</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.paymentNoticeEnhanced}>
            Online payment will be available soon. For now, please use offline payment.
          </Text>
        </View>

        {/* Total Card - visually distinct */}
        <View style={styles.summaryTotalCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#28a745' }]}>
              <Ionicons name="cash" size={20} color="#FFFFFF" />
          </View>
            <Text style={styles.summaryTotalTitleEnhanced}>Total Amount</Text>
        </View>
          <View style={styles.totalBreakdownEnhanced}>
            <View style={styles.totalRow}>
              <Text style={styles.totalItemEnhanced}>Services</Text>
              <Text style={styles.totalValueEnhanced}>₹{selectedServices.reduce((sum, s) => sum + s.price, 0)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalItemEnhanced}>Mechanic Charge</Text>
              <Text style={styles.totalValueEnhanced}>₹{mechanicCharge}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalItemEnhanced}>Discount</Text>
                <Text style={[styles.totalValueEnhanced, { color: '#28a745' }]}>-₹{discount}</Text>
              </View>
          )}
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalText}>Total</Text>
              <Text style={styles.finalTotalAmount}>₹{calculateTotalWithDiscount()}</Text>
      </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <AuthGuard message="Loading repair services...">
    <SafeAreaView style={styles.container}>
        {/* Modern Header */}
      <View style={styles.header}>
                  <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
          <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Book Repair</Text>
            <Text style={styles.headerSubtitle}>Professional repair services</Text>
      </View>
          <View style={styles.headerSpacer} />
      </View>

        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={getCurrentStepIndex()}
          showStepNumbers={false}
        />

        {/* Animated Content - make scrollable and leave space for total+nav bar */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
      {step === 'services' && renderServicesStep()}
      {step === 'details' && renderDetailsStep()}
      {step === 'summary' && renderSummaryStep()}
          </ScrollView>
        </Animated.View>

        {/* Total Amount Bar (fixed above nav) */}
        <View style={styles.totalBarEnhanced}>
          <Text style={styles.totalBarText}>
            Total: ₹{calculateTotalWithDiscount()}
          </Text>
        </View>

        {/* Navigation Buttons (fixed at bottom) */}
        <View style={styles.navigationContainer}>
          {step !== 'services' && (
            <TouchableOpacity onPress={prevStep} style={styles.navButton}>
              <Ionicons name="arrow-back" size={20} color="#2D3E50" />
              <Text style={styles.navButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={nextStep}
            style={[
              styles.navButton,
              styles.nextButton,
              step === 'summary' && styles.submitButton,
            ]}
          >
            <Text style={styles.nextButtonText}>
              {step === 'summary' ? 'Submit' : 'Next'}
            </Text>
            <Ionicons
              name={step === 'summary' ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <ScrollView style={styles.dateList}>
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i + 1);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.dateOption}
                    onPress={() => selectDate(date)}
                  >
                    <Text style={styles.dateOptionText}>
                      {date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Slot Picker Modal */}
      <Modal
        visible={showTimeSlotPicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time Slot</Text>
            <ScrollView style={styles.timeSlotList}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={styles.timeSlotOption}
                  onPress={() => selectTimeSlot(slot.id)}
                >
                  <Text style={styles.timeSlotOptionText}>
                    {slot.start_time} - {slot.end_time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTimeSlotPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={styles.confirmationModalOverlay}>
          <View style={styles.confirmationModalContent}>
            {/* Header with Icon and Title */}
            <View style={styles.confirmationModalHeader}>
              <View style={styles.confirmationIconContainer}>
                <Ionicons name="construct" size={24} color="#FFD11E" />
              </View>
              <Text style={styles.confirmationModalTitle}>Confirm Repair</Text>
            </View>
            
            {/* Body with Details */}
            <View style={styles.confirmationModalBody}>
              <View style={styles.confirmationModalDetails}>
                <View style={styles.confirmationDetailCard}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="construct-outline" size={16} color="#FFD11E" />
                      <Text style={styles.confirmationDetailLabel}>Services</Text>
                    </View>
                    <Text style={styles.confirmationDetailValue}>
                      {selectedServices.length} service(s)
                    </Text>
                  </View>
                </View>
                
                <View style={styles.confirmationDetailCard}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="calendar-outline" size={16} color="#FFD11E" />
                      <Text style={styles.confirmationDetailLabel}>Date</Text>
                    </View>
                    <Text style={styles.confirmationDetailValue}>
                      {formData.preferred_date.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.confirmationDetailCard}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="time-outline" size={16} color="#FFD11E" />
                      <Text style={styles.confirmationDetailLabel}>Time</Text>
                    </View>
                    <Text style={styles.confirmationDetailValue}>
                      {getSelectedTimeSlotText()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.confirmationDetailCard}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="location-outline" size={16} color="#FFD11E" />
                      <Text style={styles.confirmationDetailLabel}>Address</Text>
                    </View>
                    <Text style={styles.confirmationDetailValue} numberOfLines={3}>
                      {formData.address}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.confirmationTotalCard}>
                  <View style={styles.confirmationDetailRow}>
                    <View style={styles.confirmationDetailLeft}>
                      <Ionicons name="pricetag-outline" size={16} color="#28a745" />
                      <Text style={styles.confirmationTotalLabel}>Total</Text>
                    </View>
                    <Text style={styles.confirmationTotalValue}>₹{calculateTotalWithDiscount()}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Footer with Action Buttons */}
            <View style={styles.confirmationModalFooter}>
              <TouchableOpacity
                style={styles.confirmationModalCancelButton}
                onPress={() => setShowConfirmationModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-outline" size={16} color="#6c757d" />
                <Text style={styles.confirmationModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmationModalConfirmButton}
                onPress={confirmSubmit}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.confirmationModalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFD11E',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#2D3E50',
    opacity: 0.8,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#FFF5CC',
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flex: 1,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
    marginLeft: 8,
  },
  nextButton: {
    backgroundColor: '#FFD11E',
    borderColor: '#FFD11E',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#dee2e6',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#FFD11E',
  },
  stepContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
  },
  servicesGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 4,
  },
  serviceCardCompact: {
    width: (width - 48) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    padding: 12,
    marginBottom: 8,
  },
  serviceCardSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  serviceCardContent: {
    position: 'relative',
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceNameCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  servicePriceCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD11E',
  },
  serviceDescriptionCompact: {
    fontSize: 12,
    color: '#4A4A4A',
    lineHeight: 16,
  },
  selectedIndicatorCompact: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  stepFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    textAlign: 'center',
    marginBottom: 16,
  },

  formContainer: {
    flex: 1,
    paddingBottom: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputValue: {
    fontSize: 16,
    color: '#2D3E50',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2D3E50',
  },
  imagePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  videoText: {
    fontSize: 16,
    color: '#2D3E50',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  datePickerText: {
    fontSize: 16,
    color: '#2D3E50',
  },
  timeSlotPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  timeSlotPickerText: {
    fontSize: 16,
    color: '#2D3E50',
  },
  placeholderText: {
    color: '#6c757d',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateList: {
    maxHeight: 300,
  },
  dateOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#2D3E50',
  },
  timeSlotList: {
    maxHeight: 300,
  },
  timeSlotOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeSlotOptionText: {
    fontSize: 16,
    color: '#2D3E50',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  summaryItemName: {
    fontSize: 16,
    color: '#2D3E50',
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD11E',
  },
  summaryText: {
    fontSize: 16,
    color: '#2D3E50',
    marginBottom: 8,
  },
  totalBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 12,
  },
  totalItem: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginTop: 8,
  },
  couponInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyCouponButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  applyCouponText: {
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  couponError: {
    color: '#dc3545',
    marginTop: 4,
  },
  couponSuccess: {
    color: '#28a745',
    marginTop: 4,
  },
  paymentOptionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginRight: 8,
  },
  paymentOptionSelected: {
    backgroundColor: '#FFF5CC',
    borderColor: '#FFD11E',
  },
  paymentOptionText: {
    marginLeft: 8,
    color: '#2D3E50',
    fontWeight: '600',
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  stepBackButton: {
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  testButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  testButtonText: {
    color: '#2D3E50',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8f9fa',
  },
  paymentOptionTextDisabled: {
    marginLeft: 8,
    color: '#ccc',
    fontWeight: '600',
  },
  paymentNotice: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  totalBar: {
    backgroundColor: '#FFF5CC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: '#FFD11E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalBarContent: {
    alignItems: 'center',
  },
  totalBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 14,
    color: '#2D3E50',
    fontWeight: '600',
  },
  discountValue: {
    color: '#28a745',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#FFD11E',
    marginTop: 4,
  },
  finalTotalLabel: {
    fontSize: 16,
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  finalTotalValue: {
    fontSize: 18,
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  summaryTotalCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTotalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 12,
  },
  summaryCardEnhanced: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryCardHeaderEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD11E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryCardTitleEnhanced: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  serviceCount: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  servicesList: {
    gap: 8,
  },
  summaryItemRowEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  serviceInfo: {
    flex: 1,
  },
  summaryItemNameEnhanced: {
    fontSize: 15,
    color: '#2D3E50',
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  summaryItemPriceEnhanced: {
    fontSize: 15,
    color: '#2D3E50',
    fontWeight: '600',
  },
  contactInfo: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIcon: {
    marginRight: 6,
  },
  summaryTextEnhanced: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  scheduleInfo: {
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  couponInputContainerEnhanced: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#2D3E50',
  },
  applyCouponButtonEnhanced: {
    backgroundColor: '#FFD11E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponTextEnhanced: {
    color: '#2D3E50',
    fontWeight: 'bold',
    fontSize: 14,
  },
  couponErrorEnhanced: {
    color: '#dc3545',
    fontSize: 13,
    marginTop: 3,
  },
  couponSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  couponSuccessEnhanced: {
    color: '#28a745',
    fontSize: 13,
  },
  paymentOptionsContainerEnhanced: {
    flexDirection: 'row',
    gap: 16,
  },
  paymentOptionEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    flex: 1,
  },
  paymentOptionSelectedEnhanced: {
    backgroundColor: '#FFF5CC',
    borderColor: '#FFD11E',
  },
  paymentOptionTextEnhanced: {
    fontSize: 16,
    color: '#2D3E50',
    fontWeight: '600',
  },
  paymentNoticeEnhanced: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryTotalCardEnhanced: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryTotalTitleEnhanced: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  totalBreakdownEnhanced: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  totalItemEnhanced: {
    fontSize: 15,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  totalValueEnhanced: {
    fontSize: 15,
    color: '#2D3E50',
    fontWeight: '600',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  finalTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  finalTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  totalBarEnhanced: {
    backgroundColor: '#FFF5CC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: '#FFD11E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  // Confirmation Modal Styles
  confirmationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  confirmationModalHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF5CC',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE066',
  },
  confirmationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD11E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FFD11E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    textAlign: 'center',
  },
  confirmationModalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  confirmationModalBody: {
    padding: 20,
    paddingBottom: 16,
  },
  confirmationModalDetails: {
    gap: 8,
  },
  confirmationDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  confirmationDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  confirmationDetailLabel: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  confirmationDetailValue: {
    fontSize: 13,
    color: '#2D3E50',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 6,
    lineHeight: 18,
  },
  confirmationTotalCard: {
    backgroundColor: '#d4edda',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  confirmationTotalLabel: {
    fontSize: 13,
    color: '#155724',
    fontWeight: '600',
  },
  confirmationTotalValue: {
    fontSize: 14,
    color: '#155724',
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 6,
  },
  confirmationModalFooter: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  confirmationModalCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  confirmationModalCancelText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationModalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#28a745',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmationModalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 