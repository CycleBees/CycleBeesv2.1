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
  Platform
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
    preferred_date: new Date(),
    time_slot_id: 0
  });
  
  // File uploads
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

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
          email: data.data.user.email
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

  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one repair service');
      return;
    }

    if (!formData.time_slot_id) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Create form data for file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('user_id', user?.id.toString() || '');
      formDataToSend.append('time_slot_id', formData.time_slot_id.toString());
      formDataToSend.append('alternate_number', formData.alternate_number);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('notes', formData.notes);
      formDataToSend.append('preferred_date', formData.preferred_date.toISOString().split('T')[0]);
      formDataToSend.append('payment_method', 'online'); // Default for now
      
      // Add selected services
      selectedServices.forEach((service, index) => {
        formDataToSend.append(`services[${index}]`, service.id.toString());
      });

      // Add images
      images.forEach((imageUri, index) => {
        const imageFile = {
          uri: imageUri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`
        } as any;
        formDataToSend.append(`images`, imageFile);
      });

      // Add video
      if (video) {
        const videoFile = {
          uri: video,
          type: 'video/mp4',
          name: 'video.mp4'
        } as any;
        formDataToSend.append('video', videoFile);
      }

      const response = await fetch('http://localhost:3000/api/repair/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Repair request submitted successfully!', [
          { text: 'OK', onPress: () => router.push('/my-requests') }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to submit repair request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderServicesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Repair Services</Text>
      <Text style={styles.stepSubtitle}>Choose the services you need</Text>
      
      <ScrollView style={styles.servicesList}>
        {repairServices.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              onPress={() => toggleService(service)}
            >
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.servicePrice}>₹{service.price}</Text>
              </View>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              {service.special_instructions && (
                <Text style={styles.serviceInstructions}>
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
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({...formData, notes: text})}
            placeholder="Any special instructions or notes..."
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
          <Text style={styles.inputValue}>
            {formData.preferred_date.toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Time Slot</Text>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.timeSlotButton,
                formData.time_slot_id === slot.id && styles.timeSlotSelected
              ]}
              onPress={() => setFormData({...formData, time_slot_id: slot.id})}
            >
              <Text style={styles.timeSlotText}>
                {slot.start_time} - {slot.end_time}
              </Text>
            </TouchableOpacity>
          ))}
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
          <Text style={styles.summarySectionTitle}>Total Amount</Text>
          <View style={styles.totalBreakdown}>
            <Text style={styles.totalItem}>Services: ₹{selectedServices.reduce((sum, s) => sum + s.price, 0)}</Text>
            <Text style={styles.totalItem}>Mechanic Charge: ₹{mechanicCharge}</Text>
            <Text style={styles.totalAmount}>Total: ₹{calculateTotal()}</Text>
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
            <ActivityIndicator color="#2D3E50" />
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
  servicesList: {
    flex: 1,
  },
  serviceCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  serviceCardSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD11E',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  serviceInstructions: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  timeSlotButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  timeSlotSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#2D3E50',
    textAlign: 'center',
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
}); 