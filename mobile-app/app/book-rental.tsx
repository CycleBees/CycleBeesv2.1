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

interface Bicycle {
  id: number;
  name: string;
  model: string;
  special_instructions: string;
  daily_rate: number;
  weekly_rate: number;
  delivery_charge: number;
  specifications: string;
  photos: string[];
}

const { width } = Dimensions.get('window');

export default function BookRentalScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bicycles, setBicycles] = useState<Bicycle[]>([]);
  const [selectedBicycle, setSelectedBicycle] = useState<Bicycle | null>(null);
  const [bookingData, setBookingData] = useState({
    duration_type: 'daily',
    duration: 1,
    contact_number: '',
    alternate_number: '',
    delivery_address: '',
    special_instructions: '',
    payment_method: 'online'
  });
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');

  useEffect(() => {
    fetchBicycles();
  }, []);

  const fetchBicycles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/rental/bicycles');
      if (response.ok) {
        const data = await response.json();
        setBicycles(data);
      }
    } catch (error) {
      console.error('Error fetching bicycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/coupon/apply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coupon_code: couponCode,
          amount: calculateTotal(),
          item_type: 'rental_bicycles'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAppliedCoupon(data);
        Alert.alert('Success', `Coupon applied! Discount: ₹${data.discount_amount}`);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Invalid coupon code');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const calculateRentalCost = () => {
    if (!selectedBicycle) return 0;
    const rate = bookingData.duration_type === 'daily' 
      ? selectedBicycle.daily_rate 
      : selectedBicycle.weekly_rate;
    return rate * bookingData.duration;
  };

  const calculateTotal = () => {
    const rentalCost = calculateRentalCost();
    const deliveryCharge = selectedBicycle?.delivery_charge || 0;
    const subtotal = rentalCost + deliveryCharge;
    
    if (appliedCoupon) {
      const discount = appliedCoupon.discount_amount;
      return Math.max(0, subtotal - discount);
    }
    
    return subtotal;
  };

  const handleSubmit = async () => {
    if (!selectedBicycle) {
      Alert.alert('Error', 'Please select a bicycle');
      return;
    }

    if (!bookingData.delivery_address.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/rental/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bicycle_id: selectedBicycle.id,
          duration_type: bookingData.duration_type,
          duration: bookingData.duration,
          contact_number: bookingData.contact_number,
          alternate_number: bookingData.alternate_number,
          delivery_address: bookingData.delivery_address,
          special_instructions: bookingData.special_instructions,
          payment_method: bookingData.payment_method,
          coupon_code: appliedCoupon?.code || null
        })
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Rental request submitted successfully! You will be notified once admin approves.',
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
      <Text style={styles.stepTitle}>Step 1: Select Bicycle</Text>
      <Text style={styles.stepSubtitle}>Choose the bicycle you want to rent</Text>

      <ScrollView style={styles.bicyclesList}>
        {bicycles.map((bicycle) => (
          <TouchableOpacity
            key={bicycle.id}
            style={[
              styles.bicycleCard,
              selectedBicycle?.id === bicycle.id && styles.selectedBicycleCard
            ]}
            onPress={() => setSelectedBicycle(bicycle)}
          >
            {bicycle.photos && bicycle.photos.length > 0 && (
              <Image
                source={{ uri: `http://localhost:3000/${bicycle.photos[0]}` }}
                style={styles.bicycleImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.bicycleInfo}>
              <View style={styles.bicycleHeader}>
                <Text style={styles.bicycleName}>{bicycle.name}</Text>
                <Text style={styles.bicycleModel}>{bicycle.model}</Text>
              </View>
              
              <View style={styles.ratesContainer}>
                <View style={styles.rateItem}>
                  <Text style={styles.rateLabel}>Daily Rate:</Text>
                  <Text style={styles.rateValue}>₹{bicycle.daily_rate}</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={styles.rateLabel}>Weekly Rate:</Text>
                  <Text style={styles.rateValue}>₹{bicycle.weekly_rate}</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={styles.rateLabel}>Delivery Charge:</Text>
                  <Text style={styles.rateValue}>₹{bicycle.delivery_charge}</Text>
                </View>
              </View>

              {bicycle.special_instructions && (
                <Text style={styles.specialInstructions}>
                  Note: {bicycle.special_instructions}
                </Text>
              )}

              {bicycle.specifications && (
                <View style={styles.specificationsContainer}>
                  <Text style={styles.specificationsTitle}>Specifications:</Text>
                  <Text style={styles.specificationsText}>{bicycle.specifications}</Text>
                </View>
              )}

              {selectedBicycle?.id === bicycle.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity
          style={[styles.nextButton, !selectedBicycle && styles.disabledButton]}
          onPress={() => setStep(2)}
          disabled={!selectedBicycle}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Rental Details</Text>
      <Text style={styles.stepSubtitle}>Configure your rental preferences</Text>

      <ScrollView style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Duration Type</Text>
          <View style={styles.durationTypeContainer}>
            <TouchableOpacity
              style={[
                styles.durationTypeButton,
                bookingData.duration_type === 'daily' && styles.selectedDurationType
              ]}
              onPress={() => setBookingData({...bookingData, duration_type: 'daily'})}
            >
              <Text style={[
                styles.durationTypeText,
                bookingData.duration_type === 'daily' && styles.selectedDurationTypeText
              ]}>
                Daily
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.durationTypeButton,
                bookingData.duration_type === 'weekly' && styles.selectedDurationType
              ]}
              onPress={() => setBookingData({...bookingData, duration_type: 'weekly'})}
            >
              <Text style={[
                styles.durationTypeText,
                bookingData.duration_type === 'weekly' && styles.selectedDurationTypeText
              ]}>
                Weekly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Duration ({bookingData.duration_type === 'daily' ? 'Days' : 'Weeks'})</Text>
          <TextInput
            style={styles.input}
            value={bookingData.duration.toString()}
            onChangeText={(text) => setBookingData({...bookingData, duration: parseInt(text) || 1})}
            placeholder="1"
            keyboardType="number-pad"
          />
        </View>

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
          <Text style={styles.inputLabel}>Delivery Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bookingData.delivery_address}
            onChangeText={(text) => setBookingData({...bookingData, delivery_address: text})}
            placeholder="Enter your complete delivery address"
            multiline
            numberOfLines={3}
          />
          {selectedBicycle && (
            <Text style={styles.deliveryChargeNote}>
              Delivery Charge: ₹{selectedBicycle.delivery_charge}
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Special Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bookingData.special_instructions}
            onChangeText={(text) => setBookingData({...bookingData, special_instructions: text})}
            placeholder="Any special instructions or notes"
            multiline
            numberOfLines={3}
          />
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
      <Text style={styles.stepTitle}>Step 3: Review & Payment</Text>
      <Text style={styles.stepSubtitle}>Review your rental details and complete payment</Text>

      <ScrollView style={styles.reviewContainer}>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Selected Bicycle</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemText}>{selectedBicycle?.name}</Text>
            <Text style={styles.reviewItemSubtext}>{selectedBicycle?.model}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Rental Details</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemLabel}>Duration:</Text>
            <Text style={styles.reviewItemValue}>
              {bookingData.duration} {bookingData.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
            </Text>
          </View>
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
            <Text style={styles.reviewItemLabel}>Delivery Address:</Text>
            <Text style={styles.reviewItemValue}>{bookingData.delivery_address}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Cost Breakdown</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemText}>Rental Cost</Text>
            <Text style={styles.reviewItemPrice}>₹{calculateRentalCost()}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewItemText}>Delivery Charge</Text>
            <Text style={styles.reviewItemPrice}>₹{selectedBicycle?.delivery_charge || 0}</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewItemText}>Discount ({appliedCoupon.code})</Text>
              <Text style={[styles.reviewItemPrice, styles.discountText]}>
                -₹{appliedCoupon.discount_amount}
              </Text>
            </View>
          )}
          <View style={styles.totalItem}>
            <Text style={styles.totalItemText}>Total Amount</Text>
            <Text style={styles.totalItemPrice}>₹{calculateTotal()}</Text>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Apply Coupon (Optional)</Text>
          <View style={styles.couponContainer}>
            <TextInput
              style={styles.couponInput}
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter coupon code"
            />
            <TouchableOpacity style={styles.applyCouponButton} onPress={applyCoupon}>
              <Text style={styles.applyCouponText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {appliedCoupon && (
            <View style={styles.appliedCouponContainer}>
              <Text style={styles.appliedCouponText}>
                ✓ {appliedCoupon.code} applied - ₹{appliedCoupon.discount_amount} off
              </Text>
              <TouchableOpacity onPress={() => setAppliedCoupon(null)}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
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

  if (loading && step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD11E" />
          <Text style={styles.loadingText}>Loading bicycles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Rental</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A4A4A',
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
  bicyclesList: {
    flex: 1,
  },
  bicycleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedBicycleCard: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  bicycleImage: {
    width: '100%',
    height: 200,
  },
  bicycleInfo: {
    padding: 15,
  },
  bicycleHeader: {
    marginBottom: 10,
  },
  bicycleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  bicycleModel: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  ratesContainer: {
    marginBottom: 10,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  rateLabel: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  specialInstructions: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  specificationsContainer: {
    marginBottom: 10,
  },
  specificationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 5,
  },
  specificationsText: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  selectedText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
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
  deliveryChargeNote: {
    fontSize: 12,
    color: '#4A4A4A',
    marginTop: 5,
    fontStyle: 'italic',
  },
  durationTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  durationTypeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  selectedDurationType: {
    borderColor: '#FFD11E',
    backgroundColor: '#FFF5CC',
  },
  durationTypeText: {
    fontSize: 16,
    color: '#4A4A4A',
  },
  selectedDurationTypeText: {
    color: '#2D3E50',
    fontWeight: 'bold',
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
  reviewItemSubtext: {
    fontSize: 12,
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
  discountText: {
    color: '#28a745',
  },
  couponContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  applyCouponButton: {
    backgroundColor: '#FFD11E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyCouponText: {
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  appliedCouponContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#d4edda',
    borderRadius: 8,
  },
  appliedCouponText: {
    fontSize: 14,
    color: '#155724',
  },
  removeCouponText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: 'bold',
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