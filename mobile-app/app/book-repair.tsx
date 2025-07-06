import React, { useState, useEffect } from 'react';
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
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

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

export default function BookRepairScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'services' | 'details' | 'summary'>('services');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [repairServices, setRepairServices] = useState<RepairService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [mechanicCharge, setMechanicCharge] = useState(0);
  
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

  useEffect(() => {
    fetchUserProfile();
    fetchRepairServices();
    fetchTimeSlots();
    fetchMechanicCharge();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
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
      const response = await fetch('http://localhost:3000/api/repair/services');
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
      const response = await fetch('http://localhost:3000/api/repair/time-slots');
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
      const response = await fetch('http://localhost:3000/api/repair/mechanic-charge');
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
    if (images.length >= 6) {
      Alert.alert('Error', 'Maximum 6 images allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setVideo(result.assets[0].uri);
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
      
      const response = await fetch('http://localhost:3000/api/coupon/apply', {
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

      // Add images and video as 'files' - backend expects files array
      images.forEach((imageUri, index) => {
        formDataToSend.append('files', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`
        } as any);
      });

      if (video) {
        formDataToSend.append('files', {
          uri: video,
          type: 'video/mp4',
          name: 'video.mp4'
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

      const response = await fetch('http://localhost:3000/api/repair/requests', {
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
        console.error('Backend error:', data);
        const errorMessage = data.message || data.errors?.map((e: any) => e.msg).join(', ') || 'Failed to submit repair request';
        Alert.alert('Error', errorMessage);
        setLoading(false);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
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

      <View style={styles.stepFooter}>
        <Text style={styles.totalText}>
          Total: ₹{calculateTotal()} (Services: ₹{selectedServices.reduce((sum, s) => sum + s.price, 0)} + Mechanic: ₹{mechanicCharge})
        </Text>
        <TouchableOpacity
          style={[styles.nextButton, selectedServices.length === 0 && styles.buttonDisabled]}
          onPress={() => setStep('details')}
          disabled={selectedServices.length === 0}
        >
          <Text style={styles.nextButtonText}>Next: Contact Details</Text>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            placeholder="Enter email address"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({...formData, address: text})}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
          />
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
                  <Image source={{ uri }} style={styles.previewImage} />
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
          <Text style={styles.inputLabel}>Time Slot</Text>
          <TouchableOpacity 
            style={styles.timeSlotPickerButton} 
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
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity
          style={styles.stepBackButton}
          onPress={() => setStep('services')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !formData.time_slot_id && styles.buttonDisabled]}
          onPress={() => setStep('summary')}
          disabled={!formData.time_slot_id}
        >
          <Text style={styles.nextButtonText}>Next: Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Order Summary</Text>
      <Text style={styles.stepSubtitle}>Review your repair request</Text>
      
      <ScrollView style={styles.summaryContainer}>
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Selected Services</Text>
          {selectedServices.map((service) => (
            <View key={service.id} style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>{service.name}</Text>
              <Text style={styles.summaryItemPrice}>₹{service.price}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Contact Information</Text>
          <Text style={styles.summaryText}>Phone: {user?.phone}</Text>
          {formData.alternate_number && (
            <Text style={styles.summaryText}>Alternate: {formData.alternate_number}</Text>
          )}
          <Text style={styles.summaryText}>Email: {formData.email}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Address</Text>
          <Text style={styles.summaryText}>{formData.address}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Schedule</Text>
          <Text style={styles.summaryText}>
            Date: {formData.preferred_date.toLocaleDateString()}
          </Text>
          <Text style={styles.summaryText}>
            Time: {timeSlots.find(s => s.id === formData.time_slot_id)?.start_time} - {timeSlots.find(s => s.id === formData.time_slot_id)?.end_time}
          </Text>
        </View>

        {formData.notes && (
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Notes</Text>
            <Text style={styles.summaryText}>{formData.notes}</Text>
          </View>
        )}

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Coupon</Text>
          <View style={styles.couponInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={coupon}
              onChangeText={setCoupon}
              placeholder="Enter coupon code"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyCouponButton} onPress={applyCoupon}>
              <Text style={styles.applyCouponText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {/* Test buttons for development */}
          <View style={styles.testButtonsContainer}>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={() => {
                setCoupon('FIRST50');
                setTimeout(() => applyCoupon(), 100); // Small delay to ensure state is updated
              }}
            >
              <Text style={styles.testButtonText}>Test FIRST50</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={() => {
                setCoupon('WELCOME10');
                setTimeout(() => applyCoupon(), 100); // Small delay to ensure state is updated
              }}
            >
              <Text style={styles.testButtonText}>Test WELCOME10</Text>
            </TouchableOpacity>
          </View>
          {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
          {appliedCoupon && (
            <Text style={styles.couponSuccess}>
              Coupon "{appliedCoupon.code}" applied! Discount: ₹{discount}
            </Text>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptionsContainer}>
            <TouchableOpacity
              style={[styles.paymentOption, styles.paymentOptionDisabled]}
              disabled={true}
            >
              <Ionicons name="radio-button-off" size={20} color="#ccc" />
              <Text style={styles.paymentOptionTextDisabled}>Online (Coming Soon)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'offline' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('offline')}
            >
              <Ionicons name={paymentMethod === 'offline' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#FFD11E" />
              <Text style={styles.paymentOptionText}>Offline (Cash)</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.paymentNotice}>
            Online payment will be available soon. For now, please use offline payment.
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Total Amount</Text>
          <View style={styles.totalBreakdown}>
            <Text style={styles.totalItem}>Services: ₹{selectedServices.reduce((sum, s) => sum + s.price, 0)}</Text>
            <Text style={styles.totalItem}>Mechanic Charge: ₹{mechanicCharge}</Text>
            {discount > 0 && <Text style={styles.totalItem}>Discount: -₹{discount}</Text>}
            <Text style={styles.totalAmount}>Total: ₹{calculateTotalWithDiscount()}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity
          style={styles.stepBackButton}
          onPress={() => setStep('details')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2D3E50" />
              <Text style={styles.loadingText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Repair</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step === 'services' && styles.progressActive]} />
        <View style={[styles.progressStep, step === 'details' && styles.progressActive]} />
        <View style={[styles.progressStep, step === 'summary' && styles.progressActive]} />
      </View>

      {step === 'services' && renderServicesStep()}
      {step === 'details' && renderDetailsStep()}
      {step === 'summary' && renderSummaryStep()}

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
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
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
  nextButton: {
    backgroundColor: '#FFD11E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
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
  summarySection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 12,
  },
  summaryItem: {
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
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
}); 