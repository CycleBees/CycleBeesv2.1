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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface RepairService {
  id: number;
  name: string;
  description: string;
  special_instructions: string;
  price: number;
}

interface TimeSlot {
  id: number;
  time_range: string;
}

const { width } = Dimensions.get('window');

export default function BookRepairScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<RepairService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [mechanicCharge, setMechanicCharge] = useState(0);
  const [selectedServices, setSelectedServices] = useState<RepairService[]>([]);
  const [bookingData, setBookingData] = useState({
    contact_number: '',
    alternate_number: '',
    email: '',
    notes: '',
    preferred_date: '',
    preferred_time_slot: '',
    payment_method: 'online'
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  useEffect(() => {
    fetchServices();
    fetchTimeSlots();
    fetchMechanicCharge();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/repair/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/repair/time-slots');
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data);
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
        setMechanicCharge(data.charge);
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
    if (uploadedImages.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload maximum 6 images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadedImages([...uploadedImages, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    return servicesTotal + mechanicCharge;
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one repair service');
      return;
    }

    if (!bookingData.preferred_date || !bookingData.preferred_time_slot) {
      Alert.alert('Error', 'Please select preferred date and time slot');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const formData = new FormData();

      // Add basic data
      formData.append('services', JSON.stringify(selectedServices.map(s => s.id)));
      formData.append('contact_number', bookingData.contact_number);
      formData.append('alternate_number', bookingData.alternate_number);
      formData.append('email', bookingData.email);
      formData.append('notes', bookingData.notes);
      formData.append('preferred_date', bookingData.preferred_date);
      formData.append('preferred_time_slot', bookingData.preferred_time_slot);
      formData.append('payment_method', bookingData.payment_method);

      // Add images
      uploadedImages.forEach((imageUri, index) => {
        const imageName = `image_${index}.jpg`;
        formData.append('images', {
          uri: imageUri,
          type: 'image/jpeg',
          name: imageName,
        } as any);
      });

      const response = await fetch('http://localhost:3000/api/repair/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Repair request submitted successfully! You will be notified once admin approves.',
          [{ text: 'OK', onPress: () => navigation.navigate('MyRequests') }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Select Repair Services</Text>
      <Text style={styles.stepSubtitle}>Choose the services you need</Text>

      <ScrollView style={styles.servicesList}>
        {services.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, isSelected && styles.selectedServiceCard]}
              onPress={() => toggleService(service)}
            >
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.servicePrice}>₹{service.price}</Text>
              </View>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              {service.special_instructions && (
                <Text style={styles.specialInstructions}>
                  Note: {service.special_instructions}
                </Text>
              )}
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.stepFooter}>
        <Text style={styles.totalText}>
          Total: ₹{calculateTotal()} (Services: ₹{selectedServices.reduce((sum, s) => sum + s.price, 0)} + Mechanic: ₹{mechanicCharge})
        </Text>
        <TouchableOpacity
          style={[styles.nextButton, selectedServices.length === 0 && styles.disabledButton]}
          onPress={() => setStep(2)}
          disabled={selectedServices.length === 0}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Contact & Schedule</Text>
      <Text style={styles.stepSubtitle}>Provide your details and preferred time</Text>

      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contact Number</Text>
          <TextInput
            style={styles.input}
            value={bookingData.contact_number}
            onChangeText={(text) => setBookingData({...bookingData, contact_number: text})}
            placeholder="Your contact number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Alternate Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={bookingData.alternate_number}
            onChangeText={(text) => setBookingData({...bookingData, alternate_number: text})}
            placeholder="Alternate contact number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={bookingData.email}
            onChangeText={(text) => setBookingData({...bookingData, email: text})}
            placeholder="Your email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preferred Date</Text>
          <TextInput
            style={styles.input}
            value={bookingData.preferred_date}
            onChangeText={(text) => setBookingData({...bookingData, preferred_date: text})}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preferred Time Slot</Text>
          <View style={styles.timeSlotsContainer}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.timeSlotButton,
                  bookingData.preferred_time_slot === slot.time_range && styles.selectedTimeSlot
                ]}
                onPress={() => setBookingData({...bookingData, preferred_time_slot: slot.time_range})}
              >
                <Text style={[
                  styles.timeSlotText,
                  bookingData.preferred_time_slot === slot.time_range && styles.selectedTimeSlotText
                ]}>
                  {slot.time_range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bookingData.notes}
            onChangeText={(text) => setBookingData({...bookingData, notes: text})}
            placeholder="Any special instructions or notes"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Upload Images (Optional)</Text>
          <Text style={styles.uploadHint}>Upload photos of your bicycle issues (max 6)</Text>
          
          <View style={styles.imagesContainer}>
            {uploadedImages.map((imageUri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ))}
            
            {uploadedImages.length < 6 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="add" size={30} color="#4A4A4A" />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Review & Submit</Text>
      <Text style={styles.stepSubtitle}>Review your booking details</Text>

      <ScrollView style={styles.reviewContainer}>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Selected Services</Text>
          {selectedServices.map((service) => (
            <View key={service.id} style={styles.reviewItem}>
              <Text style={styles.reviewItemText}>{service.name}</Text>
              <Text style={styles.reviewItemPrice}>₹{service.price}</Text>
            </View>
          ))}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemText}>Mechanic Charge</Text>
            <Text style={styles.reviewItemPrice}>₹{mechanicCharge}</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalItemText}>Total Amount</Text>
            <Text style={styles.totalItemPrice}>₹{calculateTotal()}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Booking Details</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemLabel}>Contact:</Text>
            <Text style={styles.reviewItemValue}>{bookingData.contact_number}</Text>
          </View>
          {bookingData.alternate_number && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewItemLabel}>Alternate:</Text>
              <Text style={styles.reviewItemValue}>{bookingData.alternate_number}</Text>
            </View>
          )}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemLabel}>Email:</Text>
            <Text style={styles.reviewItemValue}>{bookingData.email}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemLabel}>Date:</Text>
            <Text style={styles.reviewItemValue}>{bookingData.preferred_date}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemLabel}>Time:</Text>
            <Text style={styles.reviewItemValue}>{bookingData.preferred_time_slot}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                bookingData.payment_method === 'online' && styles.selectedPaymentOption
              ]}
              onPress={() => setBookingData({...bookingData, payment_method: 'online'})}
            >
              <Ionicons name="card-outline" size={20} color="#2D3E50" />
              <Text style={styles.paymentOptionText}>Online Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                bookingData.payment_method === 'offline' && styles.selectedPaymentOption
              ]}
              onPress={() => setBookingData({...bookingData, payment_method: 'offline'})}
            >
              <Ionicons name="cash-outline" size={20} color="#2D3E50" />
              <Text style={styles.paymentOptionText}>Cash Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Repair</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step >= 1 && styles.activeStep]} />
        <View style={[styles.progressStep, step >= 2 && styles.activeStep]} />
        <View style={[styles.progressStep, step >= 3 && styles.activeStep]} />
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  progressBar: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    borderRadius: 2,
  },
  activeStep: {
    backgroundColor: '#FFD11E',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 5,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 20,
  },
  servicesList: {
    flex: 1,
  },
  serviceCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedServiceCard: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD11E',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 5,
  },
  specialInstructions: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
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
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlotButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  selectedTimeSlotText: {
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  uploadHint: {
    fontSize: 12,
    color: '#4A4A4A',
    marginBottom: 10,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    position: 'relative',
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#4A4A4A',
    marginTop: 5,
  },
  reviewContainer: {
    flex: 1,
  },
  reviewSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 10,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  reviewItemText: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  reviewItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  reviewItemLabel: {
    fontSize: 14,
    color: '#4A4A4A',
    flex: 1,
  },
  reviewItemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 2,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
  },
  totalItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  totalItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD11E',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    gap: 8,
  },
  selectedPaymentOption: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#2D3E50',
  },
  stepFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  backButton: {
    backgroundColor: '#4A4A4A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 