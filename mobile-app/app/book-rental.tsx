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
    if (!selectedBicycle) {
      Alert.alert('Error', 'Please select a bicycle');
      return;
    }
    if (!formData.delivery_address.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
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

  const renderBicyclesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Bicycle</Text>
      <Text style={styles.stepSubtitle}>Choose the bicycle you want to rent</Text>
      
      <ScrollView style={styles.bicyclesList}>
        {bicycles.map((bicycle) => {
          const isSelected = selectedBicycle?.id === bicycle.id;
          return (
            <TouchableOpacity
              key={bicycle.id}
              style={[styles.bicycleCard, isSelected && styles.bicycleCardSelected]}
              onPress={() => setSelectedBicycle(bicycle)}
            >
              <View style={styles.bicycleCardContent}>
                {/* Bicycle Photos */}
                {bicycle.photos && bicycle.photos.length > 0 && (
                  <View style={styles.bicyclePhotosContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {bicycle.photos.map((photo, index) => (
                        <View key={index} style={styles.photoContainer}>
                          <Image
                            source={{ 
                              uri: photo.photo_url.startsWith('http') 
                                ? photo.photo_url 
                                : `http://localhost:3000/${photo.photo_url}`
                            }}
                            style={styles.bicyclePhoto}
                            resizeMode="cover"
                            onError={() => console.log(`Failed to load photo: ${photo.photo_url}`)}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* Show placeholder if no photos */}
                {(!bicycle.photos || bicycle.photos.length === 0) && (
                  <View style={styles.bicyclePhotosContainer}>
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="bicycle" size={40} color="#ccc" />
                      <Text style={styles.photoPlaceholderText}>No photos available</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.bicycleCardHeader}>
                  <Text style={styles.bicycleName}>{bicycle.name}</Text>
                  <Text style={styles.bicycleModel}>{bicycle.model}</Text>
                </View>
                
                <Text style={styles.bicycleDescription} numberOfLines={2}>
                  {bicycle.description}
                </Text>
                
                {/* Specifications */}
                {bicycle.specifications && (
                  <View style={styles.specificationsContainer}>
                    <Text style={styles.specificationsTitle}>Specifications:</Text>
                    {(() => {
                      try {
                        const specs = JSON.parse(bicycle.specifications);
                        return Object.entries(specs).map(([key, value]) => (
                          <Text key={key} style={styles.specificationItem}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}: {String(value)}
                          </Text>
                        ));
                      } catch (e) {
                        return <Text style={styles.specificationItem}>{bicycle.specifications}</Text>;
                      }
                    })()}
                  </View>
                )}
                
                <View style={styles.bicycleRates}>
                  <Text style={styles.rateText}>Daily: ₹{bicycle.daily_rate}</Text>
                  <Text style={styles.rateText}>Weekly: ₹{bicycle.weekly_rate}</Text>
                  <Text style={styles.deliveryText}>Delivery: ₹{bicycle.delivery_charge}</Text>
                </View>
                
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Bicycle Total Preview */}
      {selectedBicycle && (
        <View style={styles.totalAmountContainer}>
          <Text style={styles.totalAmountLabel}>Estimated Total</Text>
          <View style={styles.amountBreakdown}>
            <Text style={styles.breakdownText}>
              Daily Rate: ₹{selectedBicycle.daily_rate} | Weekly Rate: ₹{selectedBicycle.weekly_rate}
            </Text>
            <Text style={styles.breakdownText}>
              Delivery Charge: ₹{selectedBicycle.delivery_charge}
            </Text>
            <View style={styles.totalLine} />
            <Text style={styles.totalAmountText}>
              Select duration in next step
            </Text>
          </View>
        </View>
      )}

      <View style={styles.stepFooter}>
        <TouchableOpacity
          style={[styles.nextButton, !selectedBicycle && styles.buttonDisabled]}
          onPress={() => setStep('details')}
          disabled={!selectedBicycle}
        >
          <Text style={styles.nextButtonText}>Next: Rental Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Rental Details</Text>
      <Text style={styles.stepSubtitle}>Provide rental information</Text>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Selected Bicycle</Text>
          <Text style={styles.inputValue}>{selectedBicycle?.name}</Text>
        </View>

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
            autoCapitalize="none"
          />
        </View>

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

        {/* Real-time Total Amount Display */}
        <View style={styles.totalAmountContainer}>
          <Text style={styles.totalAmountLabel}>Total Amount</Text>
          <View style={styles.amountBreakdown}>
            <Text style={styles.breakdownText}>
              Rate: ₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)} × {formData.duration} {formData.duration_type === 'daily' ? 'day(s)' : 'week(s)'}
            </Text>
            <Text style={styles.breakdownText}>
              = ₹{(formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)) * formData.duration}
            </Text>
            <Text style={styles.breakdownText}>
              + Delivery: ₹{selectedBicycle?.delivery_charge || 0}
            </Text>
            <View style={styles.totalLine} />
            <Text style={styles.totalAmountText}>
              Total: ₹{calculateTotal()}
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.delivery_address}
            onChangeText={(text) => setFormData({...formData, delivery_address: text})}
            placeholder="Enter delivery address"
            multiline
            numberOfLines={3}
          />
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
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity
          style={styles.stepBackButton}
          onPress={() => setStep('bicycles')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !formData.delivery_address.trim() && styles.buttonDisabled]}
          onPress={() => setStep('summary')}
          disabled={!formData.delivery_address.trim()}
        >
          <Text style={styles.nextButtonText}>Next: Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Rental Summary</Text>
      <Text style={styles.stepSubtitle}>Review your rental request</Text>
      
      <ScrollView style={styles.summaryContainer}>
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Selected Bicycle</Text>
          <Text style={styles.summaryText}>Name: {selectedBicycle?.name || ''}</Text>
          <Text style={styles.summaryText}>Model: {selectedBicycle?.model || ''}</Text>
          <Text style={styles.summaryText}>Description: {selectedBicycle?.description || ''}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Rental Details</Text>
          <Text style={styles.summaryText}>
            Duration: {formData.duration} {formData.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
          </Text>
          <Text style={styles.summaryText}>
            Rate: ₹{formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)} per {formData.duration_type === 'daily' ? 'day' : 'week'}
          </Text>
          <Text style={styles.summaryText}>Delivery Charge: ₹{selectedBicycle?.delivery_charge || 0}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Cost Breakdown</Text>
          <View style={styles.totalBreakdown}>
            <Text style={styles.totalItem}>
              Rental Cost: ₹{(formData.duration_type === 'daily' ? (selectedBicycle?.daily_rate || 0) : (selectedBicycle?.weekly_rate || 0)) * formData.duration}
            </Text>
            <Text style={styles.totalItem}>
              Delivery Charge: ₹{selectedBicycle?.delivery_charge || 0}
            </Text>
            {appliedCoupon && (
              <Text style={[styles.totalItem, { color: '#28a745' }]}>
                Coupon Discount: -₹{discount}
              </Text>
            )}
            <View style={styles.totalLine} />
            <Text style={styles.totalAmount}>
              Final Total: ₹{calculateTotalWithDiscount()}
            </Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Contact Information</Text>
          <Text style={styles.summaryText}>Phone: {user?.phone || ''}</Text>
          {formData.alternate_number && (
            <Text style={styles.summaryText}>Alternate: {formData.alternate_number}</Text>
          )}
          <Text style={styles.summaryText}>Email: {formData.email || ''}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Delivery Address</Text>
          <Text style={styles.summaryText}>{formData.delivery_address || ''}</Text>
        </View>

        {formData.special_instructions && (
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Special Instructions</Text>
            <Text style={styles.summaryText}>{formData.special_instructions}</Text>
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
            <Text style={styles.totalItem}>
              Rental: ₹{selectedBicycle ? (formData.duration_type === 'daily' ? (selectedBicycle.daily_rate || 0) : (selectedBicycle.weekly_rate || 0)) * formData.duration : 0}
            </Text>
            <Text style={styles.totalItem}>Delivery: ₹{selectedBicycle?.delivery_charge || 0}</Text>
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
        <Text style={styles.headerTitle}>Book Rental</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step === 'bicycles' && styles.progressActive]} />
        <View style={[styles.progressStep, step === 'details' && styles.progressActive]} />
        <View style={[styles.progressStep, step === 'summary' && styles.progressActive]} />
      </View>

      {step === 'bicycles' && renderBicyclesStep()}
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
  bicyclesList: {
    flex: 1,
  },
  bicycleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    padding: 16,
    marginBottom: 12,
  },
  bicycleCardSelected: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  bicycleCardContent: {
    position: 'relative',
  },
  bicycleCardHeader: {
    marginBottom: 8,
  },
  bicycleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  bicycleModel: {
    fontSize: 14,
    color: '#6c757d',
  },
  bicycleDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 12,
  },
  bicycleRates: {
    marginBottom: 8,
  },
  rateText: {
    fontSize: 14,
    color: '#2D3E50',
    fontWeight: '600',
  },
  deliveryText: {
    fontSize: 14,
    color: '#FFD11E',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  stepFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBackButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  backButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#FFD11E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  nextButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#dee2e6',
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
  loadingText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bicyclePhotosContainer: {
    marginBottom: 12,
  },
  bicyclePhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  photoPlaceholderText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  specificationsContainer: {
    marginBottom: 12,
  },
  specificationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 8,
  },
  specificationItem: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
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
}); 