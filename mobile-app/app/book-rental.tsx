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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import AuthGuard from '@/components/AuthGuard';
import PageTransition from '@/components/PageTransition';
import StepIndicator from '@/components/StepIndicator';

interface Bicycle {
  id: number;
  name: string;
  model: string;
  description: string;
  special_instructions: string;
  daily_rate: number;
  weekly_rate: number;
  delivery_charge: number;
  specifications: string;
  photos: Array<{
    id: number;
    photo_url: string;
    display_order: number;
  }>;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
}

const { width } = Dimensions.get('window');

export default function BookRentalScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'bicycles' | 'details' | 'summary'>('bicycles');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [bicycles, setBicycles] = useState<Bicycle[]>([]);
  
  // Form data
  const [selectedBicycle, setSelectedBicycle] = useState<Bicycle | null>(null);
  const [formData, setFormData] = useState({
    alternate_number: '',
    email: '',
    delivery_address: '',
    special_instructions: '',
    duration_type: 'daily' as 'daily' | 'weekly',
    duration: 1
  });

  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'offline'>('offline');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Animation states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showBicycleModal, setShowBicycleModal] = useState(false);
  const [selectedBicycleForModal, setSelectedBicycleForModal] = useState<Bicycle | null>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchBicycles();
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
          delivery_address: data.data.user.address || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchBicycles = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rental/bicycles');
      if (response.ok) {
        const data = await response.json();
        setBicycles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bicycles:', error);
    }
  };

  const calculateTotal = () => {
    if (!selectedBicycle) return 0;
    const baseRate = formData.duration_type === 'daily' 
      ? selectedBicycle.daily_rate 
      : selectedBicycle.weekly_rate;
    const total = (baseRate * formData.duration) + selectedBicycle.delivery_charge;
    return total;
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
      
      // Prepare items array for rental - match backend expectations
      const items = ['rental_services', 'delivery_charge'];
      const totalAmount = calculateTotal();
      
      const response = await fetch('http://localhost:3000/api/coupon/apply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: coupon, 
          requestType: 'rental',
          items: items,
          totalAmount: totalAmount
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAppliedCoupon(data.data);
        setDiscount(data.data.discount || 0);
        setCouponError('');
      } else {
        setCouponError(data.message || 'Invalid coupon');
      }
    } catch (error) {
      console.error('Coupon apply error:', error);
      setCouponError('Network error. Please try again.');
    }
  };

  const calculateTotalWithDiscount = () => {
    const total = calculateTotal();
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        const discount = (total * appliedCoupon.discountValue) / 100;
        return Math.max(total - discount, 0);
      } else {
        return Math.max(total - appliedCoupon.discountValue, 0);
      }
    }
    return total;
  };

  const handleDurationChange = (type: 'daily' | 'weekly') => {
    setFormData(prev => ({
      ...prev,
      duration_type: type,
      duration: 1 // Reset to 1 when changing type
    }));
  };

  const handleDurationCountChange = (count: number) => {
    setFormData(prev => ({
      ...prev,
      duration: count
    }));
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});
    
    if (!selectedBicycle) {
      setErrors({ bicycle: 'Please select a bicycle to continue.' });
      return;
    }
    if (!formData.delivery_address.trim()) {
      setErrors({ delivery_address: 'Please enter delivery address to continue.' });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ email: 'Please enter your email address to continue.' });
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Use JSON instead of FormData to avoid validation issues
      const requestData: {
        bicycleId: number;
        contactNumber: string;
        alternateNumber: string;
        email: string;
        deliveryAddress: string;
        specialInstructions: string;
        durationType: 'daily' | 'weekly';
        durationCount: number;
        paymentMethod: 'online' | 'offline';
        totalAmount: number;
        couponCode?: string;
      } = {
        bicycleId: selectedBicycle.id,
        contactNumber: user?.phone || '',
        alternateNumber: formData.alternate_number || '',
        email: formData.email || '',
        deliveryAddress: formData.delivery_address,
        specialInstructions: formData.special_instructions || '',
        durationType: formData.duration_type,
        durationCount: formData.duration,
        paymentMethod: paymentMethod,
        totalAmount: calculateTotalWithDiscount()
      };
      
      // Add coupon if applied
      if (appliedCoupon) {
        requestData.couponCode = appliedCoupon.code;
      }
      
      console.log('Submitting rental request with data:', requestData);
      
      const response = await fetch('http://localhost:3000/api/rental/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success) {
        console.log('Rental request submitted successfully');
        
        // Reset loading state first
        setLoading(false);
        
        // Navigate to My Requests with rental tab active
        router.replace('/my-requests?tab=rental');
        
      } else {
        console.error('Backend error:', data);
        const errorMessage = data.message || data.errors?.map((e: any) => e.msg).join(', ') || 'Failed to submit rental request';
        Alert.alert('Error', errorMessage);
        setLoading(false);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleStepChange = (newStep: 'bicycles' | 'details' | 'summary') => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
    }, 300);
  };

  const nextStep = () => {
    // Clear previous errors
    setErrors({});
    
    if (step === 'bicycles') {
      if (!selectedBicycle) {
        setErrors({ bicycle: 'Please select a bicycle to continue.' });
        return;
      }
      handleStepChange('details');
    } else if (step === 'details') {
      const newErrors: {[key: string]: string} = {};
      
      if (!formData.delivery_address.trim()) {
        newErrors.delivery_address = 'Please enter delivery address to continue.';
      }
      if (!formData.email.trim()) {
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
      handleStepChange('bicycles');
    } else if (step === 'summary') {
      handleStepChange('details');
    }
  };

  const openBicycleModal = (bicycle: Bicycle) => {
    setSelectedBicycleForModal(bicycle);
    setShowBicycleModal(true);
  };

  const closeBicycleModal = () => {
    setShowBicycleModal(false);
    setSelectedBicycleForModal(null);
  };

  const selectBicycleFromModal = () => {
    if (selectedBicycleForModal) {
      setSelectedBicycle(selectedBicycleForModal);
      closeBicycleModal();
    }
  };

  const renderBicyclesStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.bicyclesList} showsVerticalScrollIndicator={false}>
        <View style={styles.bicyclesGrid}>
          {bicycles.map((bicycle) => {
            const isSelected = selectedBicycle?.id === bicycle.id;
            return (
              <TouchableOpacity
                key={bicycle.id}
                style={[styles.bicycleCardCompact, isSelected && styles.bicycleCardSelected]}
                onPress={() => openBicycleModal(bicycle)}
              >
                <View style={styles.bicycleCardContentCompact}>
                  {/* Bicycle Photo */}
                  {bicycle.photos && bicycle.photos.length > 0 ? (
                    <Image
                      source={{ 
                        uri: bicycle.photos[0].photo_url.startsWith('http') 
                          ? bicycle.photos[0].photo_url 
                          : `http://localhost:3000/${bicycle.photos[0].photo_url}`
                      }}
                      style={styles.bicyclePhotoCompact}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholderCompact}>
                      <Ionicons name="bicycle" size={24} color="#ccc" />
                    </View>
                  )}
                  
                  <View style={styles.bicycleInfoCompact}>
                    <Text style={styles.bicycleNameCompact} numberOfLines={1}>
                      {bicycle.name}
                    </Text>
                    <Text style={styles.bicycleModelCompact} numberOfLines={1}>
                      {bicycle.model}
                    </Text>
                    <Text style={styles.bicycleDescriptionCompact} numberOfLines={2}>
                      {bicycle.description}
                    </Text>
                    <View style={styles.bicycleRatesCompact}>
                      <Text style={styles.rateTextCompact}>₹{bicycle.daily_rate}/day</Text>
                      <Text style={styles.rateTextCompact}>₹{bicycle.weekly_rate}/week</Text>
                    </View>
                  </View>
                  
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
      </ScrollView>

      {errors.bicycle && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#dc3545" />
          <Text style={styles.errorText}>{errors.bicycle}</Text>
        </View>
      )}

      {/* Selected Bicycle Text */}
      {selectedBicycle && (
        <View style={styles.selectedBicycleContainer}>
          <Text style={styles.selectedBicycleText}>
            Selected: {selectedBicycle.name}
          </Text>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, !selectedBicycle && styles.buttonDisabled]}
          onPress={nextStep}
          disabled={!selectedBicycle}
        >
          <Text style={styles.navButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Selected Bicycle Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={styles.iconContainer}>
              <Ionicons name="bicycle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Selected Bicycle</Text>
          </View>
          <View style={styles.bicycleInfo}>
            <Text style={styles.summaryTextEnhanced}>{selectedBicycle?.name}</Text>
            <Text style={styles.bicycleModelText}>{selectedBicycle?.model}</Text>
          </View>
        </View>

        {/* Contact Information Card */}
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
                autoCapitalize="none"
              />
              {errors.email && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#dc3545" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Rental Duration Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="time" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Rental Duration</Text>
          </View>
          <View style={styles.durationInfo}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration Type</Text>
              <View style={styles.durationTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.durationTypeButton,
                    formData.duration_type === 'daily' && styles.durationTypeSelected
                  ]}
                  onPress={() => handleDurationChange('daily')}
                >
                  <Text style={[
                    styles.durationTypeText,
                    formData.duration_type === 'daily' && styles.durationTypeTextSelected
                  ]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.durationTypeButton,
                    formData.duration_type === 'weekly' && styles.durationTypeSelected
                  ]}
                  onPress={() => handleDurationChange('weekly')}
                >
                  <Text style={[
                    styles.durationTypeText,
                    formData.duration_type === 'weekly' && styles.durationTypeTextSelected
                  ]}>Weekly</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration Count</Text>
              <View style={styles.durationCountContainer}>
                <TouchableOpacity
                  style={styles.durationCountButton}
                  onPress={() => handleDurationCountChange(Math.max(1, formData.duration - 1))}
                >
                  <Ionicons name="remove" size={20} color="#2D3E50" />
                </TouchableOpacity>
                <Text style={styles.durationCountText}>{formData.duration}</Text>
                <TouchableOpacity
                  style={styles.durationCountButton}
                  onPress={() => handleDurationCountChange(formData.duration + 1)}
                >
                  <Ionicons name="add" size={20} color="#2D3E50" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Cost Breakdown Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#45B7D1' }]}>
              <Ionicons name="calculator" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Cost Breakdown</Text>
          </View>
          <View style={styles.costBreakdown}>
            <View style={styles.costRow}>
              <Text style={styles.costItem}>Rate</Text>
              <Text style={styles.costValue}>
                ₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)} × {formData.duration} {formData.duration_type === 'daily' ? 'day(s)' : 'week(s)'}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costItem}>Rental Cost</Text>
              <Text style={styles.costValue}>
                ₹{(formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)) * formData.duration}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costItem}>Delivery Charge</Text>
              <Text style={styles.costValue}>₹{selectedBicycle?.delivery_charge || 0}</Text>
            </View>
            <View style={styles.totalLine} />
            <View style={styles.costRow}>
              <Text style={styles.totalAmountText}>Total</Text>
              <Text style={styles.totalAmountText}>₹{calculateTotal()}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Information Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#96CEB4' }]}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Delivery Information</Text>
          </View>
          <View style={styles.deliveryInfo}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.delivery_address && styles.inputError]}
                value={formData.delivery_address}
                onChangeText={(text) => {
                  setFormData({...formData, delivery_address: text});
                  if (errors.delivery_address) setErrors(prev => ({...prev, delivery_address: ''}));
                }}
                placeholder="Enter delivery address"
                multiline
                numberOfLines={3}
              />
              {errors.delivery_address && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#dc3545" />
                  <Text style={styles.errorText}>{errors.delivery_address}</Text>
                </View>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Special Instructions (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.special_instructions}
                onChangeText={(text) => setFormData({...formData, special_instructions: text})}
                placeholder="Any special instructions or notes"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={prevStep} style={styles.backNavButton}>
          <Ionicons name="arrow-back" size={20} color="#2D3E50" />
          <Text style={styles.backNavButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={nextStep}
        >
          <Text style={styles.navButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
        {/* Bicycle Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={styles.iconContainer}>
              <Ionicons name="bicycle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Selected Bicycle</Text>
          </View>
          <View style={styles.bicycleInfo}>
            <Text style={styles.summaryTextEnhanced}>{selectedBicycle?.name}</Text>
            <Text style={styles.bicycleModelText}>{selectedBicycle?.model}</Text>
            <Text style={styles.summaryTextEnhanced}>{selectedBicycle?.description}</Text>
          </View>
        </View>

        {/* Rental Details Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="time" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Rental Details</Text>
          </View>
          <View style={styles.rentalDetailsInfo}>
            <View style={styles.contactRow}>
              <Ionicons name="calendar" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>
                Duration: {formData.duration} {formData.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="pricetag" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>
                Rate: ₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)} per {formData.duration_type === 'daily' ? 'day' : 'week'}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="car" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>
                Delivery Charge: ₹{selectedBicycle?.delivery_charge || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Information Card */}
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

        {/* Delivery Address Card */}
        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeaderEnhanced}>
            <View style={[styles.iconContainer, { backgroundColor: '#96CEB4' }]}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.summaryCardTitleEnhanced}>Delivery Address</Text>
          </View>
          <View style={styles.addressInfo}>
            <Ionicons name="location-outline" size={16} color="#6c757d" style={styles.contactIcon} />
            <Text style={styles.summaryTextEnhanced}>{formData.delivery_address}</Text>
          </View>
        </View>

        {/* Special Instructions Card */}
        {formData.special_instructions && (
          <View style={styles.summaryCardEnhanced}>
            <View style={styles.summaryCardHeaderEnhanced}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFA726' }]}>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.summaryCardTitleEnhanced}>Special Instructions</Text>
            </View>
            <View style={styles.notesInfo}>
              <Ionicons name="chatbubble-outline" size={16} color="#6c757d" style={styles.contactIcon} />
              <Text style={styles.summaryTextEnhanced}>{formData.special_instructions}</Text>
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
          
          {/* Test buttons for development */}
          <View style={styles.testButtonsContainer}>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={() => {
                setCoupon('FIRST50');
                setTimeout(() => applyCoupon(), 100);
              }}
            >
              <Text style={styles.testButtonText}>Test FIRST50</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={() => {
                setCoupon('WELCOME10');
                setTimeout(() => applyCoupon(), 100);
              }}
            >
              <Text style={styles.testButtonText}>Test WELCOME10</Text>
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
              <Text style={styles.totalItemEnhanced}>Rental Cost</Text>
              <Text style={styles.totalValueEnhanced}>₹{(formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)) * formData.duration}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalItemEnhanced}>Delivery Charge</Text>
              <Text style={styles.totalValueEnhanced}>₹{selectedBicycle?.delivery_charge || 0}</Text>
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

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={prevStep} style={styles.backNavButton}>
          <Ionicons name="arrow-back" size={20} color="#2D3E50" />
          <Text style={styles.backNavButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitNavButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingTextInline}>Submitting...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.submitNavButtonText}>Submit</Text>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container}>
        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2D3E50" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Book Rental</Text>
            <Text style={styles.headerSubtitle}>Quality bicycle rentals</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Step Indicator */}
        <StepIndicator
          steps={[
            { id: 'bicycles', title: 'Select Bicycle', icon: 'bicycle' },
            { id: 'details', title: 'Rental Details', icon: 'document-text' },
            { id: 'summary', title: 'Summary', icon: 'checkmark-circle' }
          ]}
          currentStep={step === 'bicycles' ? 0 : step === 'details' ? 1 : 2}
        />

        {/* Main Content */}
        <PageTransition isVisible={!isTransitioning}>
          {step === 'bicycles' && renderBicyclesStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'summary' && renderSummaryStep()}
        </PageTransition>

        {/* Bicycle Detail Modal */}
        <Modal
          visible={showBicycleModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeBicycleModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedBicycleForModal && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Bicycle Details</Text>
                    <TouchableOpacity onPress={closeBicycleModal} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color="#2D3E50" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    {/* Bicycle Photos */}
                    {selectedBicycleForModal.photos && selectedBicycleForModal.photos.length > 0 && (
                      <View style={styles.modalPhotosContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {selectedBicycleForModal.photos.map((photo, index) => (
                            <View key={index} style={styles.modalPhotoContainer}>
                              <Image
                                source={{ 
                                  uri: photo.photo_url.startsWith('http') 
                                    ? photo.photo_url 
                                    : `http://localhost:3000/${photo.photo_url}`
                                }}
                                style={styles.modalPhoto}
                                resizeMode="cover"
                              />
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    
                    {/* Show placeholder if no photos */}
                    {(!selectedBicycleForModal.photos || selectedBicycleForModal.photos.length === 0) && (
                      <View style={styles.modalPhotoPlaceholder}>
                        <Ionicons name="bicycle" size={60} color="#ccc" />
                        <Text style={styles.modalPhotoPlaceholderText}>No photos available</Text>
                      </View>
                    )}
                    
                    <View style={styles.modalBicycleInfo}>
                      <Text style={styles.modalBicycleName}>{selectedBicycleForModal.name}</Text>
                      <Text style={styles.modalBicycleModel}>{selectedBicycleForModal.model}</Text>
                      
                      <Text style={styles.modalBicycleDescription}>
                        {selectedBicycleForModal.description}
                      </Text>
                      
                      {/* Specifications */}
                      {selectedBicycleForModal.specifications && (
                        <View style={styles.modalSpecificationsContainer}>
                          <Text style={styles.modalSpecificationsTitle}>Specifications:</Text>
                          {(() => {
                            try {
                              const specs = JSON.parse(selectedBicycleForModal.specifications);
                              return Object.entries(specs).map(([key, value]) => (
                                <Text key={key} style={styles.modalSpecificationItem}>
                                  {key.charAt(0).toUpperCase() + key.slice(1)}: {String(value)}
                                </Text>
                              ));
                            } catch (e) {
                              return <Text style={styles.modalSpecificationItem}>{selectedBicycleForModal.specifications}</Text>;
                            }
                          })()}
                        </View>
                      )}
                      
                      <View style={styles.modalBicycleRates}>
                        <Text style={styles.modalRateText}>Daily Rate: ₹{selectedBicycleForModal.daily_rate}</Text>
                        <Text style={styles.modalRateText}>Weekly Rate: ₹{selectedBicycleForModal.weekly_rate}</Text>
                        <Text style={styles.modalDeliveryText}>Delivery Charge: ₹{selectedBicycleForModal.delivery_charge}</Text>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.modalSelectButton}
                      onPress={selectBicycleFromModal}
                    >
                      <Text style={styles.modalSelectButtonText}>Select This Bicycle</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFD11E" />
            <Text style={styles.loadingOverlayText}>Submitting rental request...</Text>
          </View>
        )}
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
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 10,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E50',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  bicyclesList: {
    flex: 1,
  },
  bicyclesGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  bicycleCardCompact: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    padding: 16,
    marginBottom: 8,
  },
  bicycleCardSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  bicycleCardContentCompact: {
    position: 'relative',
  },
  bicyclePhotoCompact: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoPlaceholderCompact: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bicycleInfoCompact: {
    gap: 4,
  },
  bicycleNameCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  bicycleModelCompact: {
    fontSize: 16,
    color: '#6c757d',
  },
  bicycleDescriptionCompact: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  bicycleRatesCompact: {
    marginTop: 8,
    backgroundColor: '#FFF5CC',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD11E',
  },
  rateTextCompact: {
    fontSize: 16,
    color: '#2D3E50',
    fontWeight: '700',
  },
  selectedIndicatorCompact: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3E50',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalPhotosContainer: {
    marginBottom: 16,
  },
  modalPhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  modalPhoto: {
    width: '100%',
    height: '100%',
  },
  modalPhotoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPhotoPlaceholderText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
  },
  modalBicycleInfo: {
    gap: 12,
  },
  modalBicycleName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E50',
  },
  modalBicycleModel: {
    fontSize: 16,
    color: '#6c757d',
  },
  modalBicycleDescription: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
  },
  modalSpecificationsContainer: {
    marginTop: 8,
  },
  modalSpecificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3E50',
    marginBottom: 8,
  },
  modalSpecificationItem: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  modalBicycleRates: {
    marginTop: 8,
    gap: 4,
  },
  modalRateText: {
    fontSize: 16,
    color: '#2D3E50',
    fontWeight: '600',
  },
  modalDeliveryText: {
    fontSize: 16,
    color: '#FFD11E',
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalSelectButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSelectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E50',
  },
  totalAmountContainer: {
    backgroundColor: '#FFF5CC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD11E',
  },
  totalAmountLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  amountBreakdown: {
    gap: 8,
  },
  breakdownText: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  totalLine: {
    height: 1,
    backgroundColor: '#FFD11E',
    marginVertical: 8,
  },
  totalAmountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
    textAlign: 'center',
    marginTop: 8,
  },
  nextButton: {
    flex: 1,
    marginLeft: 15,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FFD11E',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3E50',
  },
  buttonDisabled: {
    backgroundColor: '#e9ecef',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    backgroundColor: '#FFD11E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8f9fa',
  },
  paymentOptionTextDisabled: {
    fontSize: 16,
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
  inputValue: {
    fontSize: 16,
    color: '#2D3E50',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2D3E50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  durationTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  durationTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    alignItems: 'center',
  },
  durationTypeSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  durationTypeText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  durationTypeTextSelected: {
    color: '#2D3E50',
  },
  durationCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  durationCountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  durationCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    minWidth: 30,
    textAlign: 'center',
  },
  summaryContainer: {
    flex: 1,
  },
  summarySection: {
    marginBottom: 24,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  couponInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  applyCouponButton: {
    backgroundColor: '#FFD11E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponText: {
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  couponError: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  couponSuccess: {
    color: '#28a745',
    fontSize: 14,
    marginTop: 4,
  },
  paymentOptionsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    flex: 1,
  },
  paymentOptionSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#2D3E50',
    fontWeight: '600',
  },
  totalBreakdown: {
    gap: 8,
  },
  totalItem: {
    fontSize: 16,
    color: '#4A4A4A',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#FFD11E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  submitButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTextInline: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedBicycleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF5CC',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
    backgroundColor: '#FFD11E',
    borderWidth: 1,
    borderColor: '#FFD11E',
    flex: 1,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  backNavButton: {
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
  backNavButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
    marginLeft: 8,
  },
  submitNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#28a745',
    borderWidth: 1,
    borderColor: '#28a745',
    flex: 1,
  },
  submitNavButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  // Enhanced Card Styles
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
  summaryTextEnhanced: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  bicycleInfo: {
    gap: 6,
  },
  bicycleModelText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
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
  durationInfo: {
    gap: 12,
  },
  costBreakdown: {
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costItem: {
    fontSize: 15,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 15,
    color: '#2D3E50',
    fontWeight: '600',
  },
  deliveryInfo: {
    gap: 12,
  },
  rentalDetailsInfo: {
    gap: 8,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    gap: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    flex: 1,
  },
  paymentOptionSelectedEnhanced: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  paymentOptionTextEnhanced: {
    fontSize: 15,
    color: '#2D3E50',
    fontWeight: '600',
  },
  paymentNoticeEnhanced: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
  },
  summaryTotalCardEnhanced: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#28a745',
  },
  summaryTotalTitleEnhanced: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  totalBreakdownEnhanced: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
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
  stepFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  selectedBicycleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
    textAlign: 'center',
  },
  stepBackButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6c757d',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlayText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
}); 