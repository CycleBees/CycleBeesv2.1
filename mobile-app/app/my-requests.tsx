import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AuthGuard from '@/components/AuthGuard';

interface RepairRequest {
  id: number;
  contact_number: string;
  alternate_number?: string;
  email?: string;
  notes?: string;
  address?: string;
  preferred_date: string;
  time_slot_id: number;
  total_amount: number;
  payment_method: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  services?: Array<{
    id: number;
    name: string;
    description: string;
    special_instructions: string;
    price: number;
    discount_amount: number;
  }>;
  files?: Array<{
    id: number;
    file_url: string;
    file_type: string;
    display_order: number;
  }>;
}

interface RentalRequest {
  id: number;
  bicycle_name: string;
  duration_type: string;
  duration_count: number;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  delivery_charge: number;
}

const { width } = Dimensions.get('window');

export default function MyRequestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'repair' | 'rental'>(
    (params.tab as string) === 'rental' ? 'rental' : 'repair'
  );
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Request details modal
  const [selectedRepairRequest, setSelectedRepairRequest] = useState<RepairRequest | null>(null);
  const [selectedRentalRequest, setSelectedRentalRequest] = useState<RentalRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    fetchRequests();
    
    // Auto-refresh every 30 seconds to update countdown and check status changes
    const interval = setInterval(() => {
      fetchRequests();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (activeTab === 'repair') {
        const response = await fetch('http://localhost:3000/api/repair/requests', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Backend returns { success: true, data: [...] }
          setRepairRequests(data.success && data.data ? data.data : []);
        } else {
          setRepairRequests([]);
        }
      } else {
        const response = await fetch('http://localhost:3000/api/rental/requests', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Rental requests API response:', data); // Debug log
          // Backend returns { success: true, data: [...] }
          const requests = data.success && data.data ? data.data : [];
          console.log('Rental requests data:', requests); // Debug log
          setRentalRequests(requests);
        } else {
          console.error('Failed to fetch rental requests:', response.status);
          setRentalRequests([]);
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      // Set empty arrays on error to prevent map errors
      if (activeTab === 'repair') {
        setRepairRequests([]);
      } else {
        setRentalRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'waiting_payment': return '#17a2b8';
      case 'active': return '#28a745';
      case 'arranging_delivery': return '#6f42c1';
      case 'active_rental': return '#28a745';
      case 'completed': return '#6c757d';
      case 'expired': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'waiting_payment': return 'Waiting for Payment';
      case 'active': return 'Active';
      case 'arranging_delivery': return 'Arranging Delivery';
      case 'active_rental': return 'Active Rental';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'waiting_payment': return 'card-outline';
      case 'active': return 'checkmark-circle-outline';
      case 'arranging_delivery': return 'car-outline';
      case 'active_rental': return 'bicycle-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'expired': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s remaining`;
  };

  const openRepairRequestDetails = (request: RepairRequest) => {
    setSelectedRepairRequest(request);
    setSelectedRentalRequest(null);
    setShowRequestModal(true);
  };

  const openRentalRequestDetails = (request: RentalRequest) => {
    console.log('Opening rental request details:', request); // Debug log
    setSelectedRentalRequest(request);
    setSelectedRepairRequest(null);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRepairRequest(null);
    setSelectedRentalRequest(null);
  };

  const renderRepairRequests = () => (
    <ScrollView
      style={styles.requestsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {!Array.isArray(repairRequests) || repairRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={60} color="#4A4A4A" />
          <Text style={styles.emptyStateTitle}>No Repair Requests</Text>
          <Text style={styles.emptyStateSubtitle}>
            You haven't made any repair requests yet
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/book-repair')}
          >
            <Text style={styles.emptyStateButtonText}>Book Your First Repair</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.requestsGrid}>
          {repairRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCardModern}
              onPress={() => openRepairRequestDetails(request)}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.requestIdContainer}>
                  <Ionicons name="construct-outline" size={16} color="#FFD11E" />
                  <Text style={styles.requestIdModern}>#{request.id}</Text>
                </View>
                <View style={[
                  styles.statusBadgeModern,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.statusTextModern}>
                    {getStatusText(request.status)}
                  </Text>
                </View>
              </View>
              
              {/* Card Content */}
              <View style={styles.cardContent}>
                {/* Amount and Date Row */}
                <View style={styles.amountDateRow}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>₹{request.total_amount}</Text>
                  </View>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Date</Text>
                    <Text style={styles.dateValue}>{request.preferred_date}</Text>
                  </View>
                </View>
                
                {/* Time and Payment Row */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color="#6c757d" />
                    <Text style={styles.detailText}>{request.start_time} - {request.end_time}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="card-outline" size={14} color="#6c757d" />
                    <Text style={styles.detailText}>{request.payment_method}</Text>
                  </View>
                </View>
                
                {/* Address */}
                {request.address && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color="#6c757d" />
                    <Text style={styles.addressTextModern} numberOfLines={1}>
                      {request.address}
                    </Text>
                  </View>
                )}
                
                {/* Media Files */}
                {request.files && request.files.length > 0 && (
                  <View style={styles.mediaSection}>
                    <View style={styles.mediaHeader}>
                      <Ionicons name="images-outline" size={14} color="#6c757d" />
                      <Text style={styles.mediaLabel}>
                        {request.files.filter(f => f.file_type === 'image').length} photos, 
                        {request.files.filter(f => f.file_type === 'video').length} video
                      </Text>
                    </View>
                    <View style={styles.mediaGrid}>
                      {request.files.slice(0, 3).map((file, index) => (
                        <View key={file.id} style={styles.mediaItemModern}>
                          {file.file_type === 'image' ? (
                            <View style={styles.imageThumbnailModern}>
                              <Text style={styles.mediaIcon}>📷</Text>
                            </View>
                          ) : (
                            <View style={styles.videoThumbnailModern}>
                              <Text style={styles.mediaIcon}>🎥</Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {request.files.length > 3 && (
                        <View style={styles.mediaMoreModern}>
                          <Text style={styles.mediaMoreText}>+{request.files.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {/* Expiry Timer */}
                {request.status === 'pending' && request.expires_at && (
                  <View style={styles.expirySection}>
                    <Ionicons name="time-outline" size={14} color="#ffc107" />
                    <Text style={styles.expiryTextModern}>{getTimeRemaining(request.expires_at)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRentalRequests = () => (
    <ScrollView
      style={styles.requestsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {!Array.isArray(rentalRequests) || rentalRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bicycle-outline" size={60} color="#4A4A4A" />
          <Text style={styles.emptyStateTitle}>No Rental Requests</Text>
          <Text style={styles.emptyStateSubtitle}>
            You haven't made any rental requests yet
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/book-rental')}
          >
            <Text style={styles.emptyStateButtonText}>Book Your First Rental</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.requestsGrid}>
          {rentalRequests.map((request) => {
            console.log('Rendering rental request card:', {
              id: request.id,
              bicycle_name: request.bicycle_name,
              total_amount: request.total_amount,
              delivery_charge: request.delivery_charge,
              duration_count: request.duration_count,
              duration_type: request.duration_type
            });
            return (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCardModern}
              onPress={() => openRentalRequestDetails(request)}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.requestIdContainer}>
                  <Ionicons name="bicycle-outline" size={16} color="#FFD11E" />
                  <Text style={styles.requestIdModern}>#{request.id}</Text>
                </View>
                <View style={[
                  styles.statusBadgeModern,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.statusTextModern}>
                    {getStatusText(request.status)}
                  </Text>
                </View>
              </View>
              
              {/* Card Content */}
              <View style={styles.cardContent}>
                {/* Amount and Date Row */}
                <View style={styles.amountDateRow}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>₹{Number(request.total_amount) || 0}</Text>
                  </View>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Requested</Text>
                    <Text style={styles.dateValue}>
                      {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>
                
                {/* Bicycle and Duration Row */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="bicycle-outline" size={14} color="#6c757d" />
                    <Text style={styles.detailText}>{request.bicycle_name || 'Unknown Bicycle'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6c757d" />
                    <Text style={styles.detailText}>
                      {request.duration_count || 0} {request.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
                    </Text>
                  </View>
                </View>
                
                {/* Rental Rate Row */}
                <View style={styles.rentalRateRow}>
                  <View style={styles.rentalRateItem}>
                    <Ionicons name="pricetag-outline" size={14} color="#6c757d" />
                    <Text style={styles.rentalRateText}>
                      Rate: ₹{(() => {
                        const total = Number(request.total_amount) || 0;
                        const delivery = Number(request.delivery_charge) || 0;
                        const duration = Number(request.duration_count) || 1;
                        const rate = Math.round((total - delivery) / duration);
                        console.log('Rental rate calculation:', { 
                          requestId: request.id,
                          total, 
                          delivery, 
                          duration, 
                          rate,
                          calculation: `${total} - ${delivery} / ${duration} = ${rate}`
                        }); // Debug log
                        return rate > 0 ? rate : 0;
                      })()}/{request.duration_type === 'daily' ? 'day' : 'week'}
                    </Text>
                  </View>
                </View>
                
                {/* Delivery Address */}
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color="#6c757d" />
                  <Text style={styles.addressTextModern} numberOfLines={1}>
                    {request.delivery_address || 'No address provided'}
                  </Text>
                </View>
                
                {/* Delivery Charge */}
                <View style={styles.deliveryRow}>
                  <Ionicons name="car-outline" size={14} color="#6c757d" />
                  <Text style={styles.deliveryText}>Delivery: ₹{Number(request.delivery_charge) || 0}</Text>
                </View>
                
                {/* Pending Status */}
                {request.status === 'pending' && (
                  <View style={styles.expirySection}>
                    <Ionicons name="time-outline" size={14} color="#ffc107" />
                    <Text style={styles.expiryTextModern}>Pending approval</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
          })}
        </View>
      )}
    </ScrollView>
  );

  return (
    <AuthGuard message="Loading your requests...">
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>My Requests</Text>
          <Text style={styles.headerSubtitle}>Manage all your requests</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'repair' && styles.activeTabButton]}
          onPress={() => setActiveTab('repair')}
        >
          <Ionicons 
            name="construct-outline" 
            size={20} 
            color={activeTab === 'repair' ? '#2D3E50' : '#4A4A4A'} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'repair' && styles.activeTabButtonText
          ]}>
            Repair Requests
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rental' && styles.activeTabButton]}
          onPress={() => setActiveTab('rental')}
        >
          <Ionicons 
            name="bicycle-outline" 
            size={20} 
            color={activeTab === 'rental' ? '#2D3E50' : '#4A4A4A'} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'rental' && styles.activeTabButtonText
          ]}>
            Rental Requests
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'repair' ? renderRepairRequests() : renderRentalRequests()}

      {showRequestModal && (
        <Modal
          visible={showRequestModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeRequestModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedRepairRequest ? 'Repair Request Details' : 'Rental Request Details'}
                </Text>
                <TouchableOpacity onPress={closeRequestModal}>
                  <Ionicons name="close" size={24} color="#4A4A4A" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {selectedRepairRequest && (
                  <View>
                    {/* Header with Status and Amount */}
                    <View style={styles.modalHeaderSection}>
                      <View style={styles.modalHeaderLeft}>
                        <View style={styles.modalRequestIdContainer}>
                          <Ionicons name="construct-outline" size={20} color="#FFD11E" />
                          <Text style={styles.modalRequestId}>#{selectedRepairRequest.id}</Text>
                        </View>
                        <View style={[
                          styles.modalStatusBadge,
                          { backgroundColor: getStatusColor(selectedRepairRequest.status) }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(selectedRepairRequest.status) as any} 
                            size={14} 
                            color="#fff" 
                          />
                          <Text style={styles.modalStatusText}>
                            {getStatusText(selectedRepairRequest.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalAmountContainer}>
                        <Text style={styles.modalAmountLabel}>Total Amount</Text>
                        <Text style={styles.modalAmountValue}>₹{selectedRepairRequest.total_amount}</Text>
                        {selectedRepairRequest.services && selectedRepairRequest.services.length > 0 && (
                          <>
                            <Text style={styles.modalServiceChargeLabel}>Service Charge</Text>
                            <Text style={styles.modalServiceChargeValue}>
                              ₹{selectedRepairRequest.total_amount - selectedRepairRequest.services.reduce((sum, service) => sum + service.price, 0)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    
                    {/* Key Information Cards */}
                    <View style={styles.modalCardsContainer}>
                      {/* Selected Services Card */}
                      {selectedRepairRequest.services && selectedRepairRequest.services.length > 0 && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="construct-outline" size={18} color="#FFD11E" />
                            <Text style={styles.modalCardTitle}>Selected Services</Text>
                            <Text style={styles.modalMediaCount}>
                              ({selectedRepairRequest.services.length} services)
                            </Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            {selectedRepairRequest.services.map((service, index) => (
                              <View key={service.id} style={styles.modalServiceItem}>
                                <View style={styles.modalServiceHeader}>
                                  <Text style={styles.modalServiceName}>{service.name}</Text>
                                  <Text style={styles.modalServicePrice}>₹{service.price}</Text>
                                </View>
                                {service.description && (
                                  <Text style={styles.modalServiceDescription}>{service.description}</Text>
                                )}
                                {service.special_instructions && (
                                  <Text style={styles.modalServiceInstructions}>
                                    <Text style={styles.modalServiceInstructionsLabel}>Instructions: </Text>
                                    {service.special_instructions}
                                  </Text>
                                )}
                                {service.discount_amount > 0 && (
                                  <View style={styles.modalServiceDiscount}>
                                    <Text style={styles.modalServiceDiscountText}>
                                      Discount: ₹{service.discount_amount}
                                    </Text>
                                  </View>
                                )}
                                {selectedRepairRequest.services && index < selectedRepairRequest.services.length - 1 && (
                                  <View style={styles.modalServiceDivider} />
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Service Details Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="calendar-outline" size={18} color="#FFD11E" />
                          <Text style={styles.modalCardTitle}>Service Details</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Date:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.preferred_date}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Time:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.start_time} - {selectedRepairRequest.end_time}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Payment:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.payment_method}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Contact Information Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="person-outline" size={18} color="#FFD11E" />
                          <Text style={styles.modalCardTitle}>Contact Information</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Phone:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRepairRequest.contact_number}</Text>
                          </View>
                      {selectedRepairRequest.alternate_number && (
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Alternate:</Text>
                              <Text style={styles.modalInfoValue}>{selectedRepairRequest.alternate_number}</Text>
                            </View>
                      )}
                      {selectedRepairRequest.email && (
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Email:</Text>
                              <Text style={styles.modalInfoValue}>{selectedRepairRequest.email}</Text>
                            </View>
                      )}
                        </View>
                      </View>

                      {/* Address Card */}
                      {selectedRepairRequest.address && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="location-outline" size={18} color="#FFD11E" />
                            <Text style={styles.modalCardTitle}>Service Address</Text>
                    </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalAddressText}>{selectedRepairRequest.address}</Text>
                          </View>
                        </View>
                      )}
                    
                      {/* Notes Card */}
                      {selectedRepairRequest.notes && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="document-text-outline" size={18} color="#FFD11E" />
                            <Text style={styles.modalCardTitle}>Special Notes</Text>
                    </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalNotesText}>{selectedRepairRequest.notes}</Text>
                          </View>
                        </View>
                      )}
                    
                      {/* Media Files Card */}
                    {selectedRepairRequest.files && selectedRepairRequest.files.length > 0 && (
                        <View style={styles.modalInfoCard}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="images-outline" size={18} color="#FFD11E" />
                            <Text style={styles.modalCardTitle}>Media Files</Text>
                            <Text style={styles.modalMediaCount}>
                              ({selectedRepairRequest.files.length} files)
                            </Text>
                          </View>
                          <View style={styles.modalCardContent}>
                        <View style={styles.modalMediaGrid}>
                          {selectedRepairRequest.files.map((file, index) => (
                            <View key={file.id} style={styles.modalMediaItem}>
                              {file.file_type === 'image' ? (
                                <View style={styles.modalImageThumbnail}>
                                      <Text style={styles.modalMediaIcon}>📷</Text>
                                  <Text style={styles.modalMediaLabel}>Photo {index + 1}</Text>
                                </View>
                              ) : (
                                <View style={styles.modalVideoThumbnail}>
                                      <Text style={styles.modalMediaIcon}>🎥</Text>
                                  <Text style={styles.modalMediaLabel}>Video</Text>
                                </View>
                              )}
                            </View>
                          ))}
                            </View>
                        </View>
                      </View>
                    )}
                    
                      {/* Expiry Timer Card */}
                    {selectedRepairRequest.status === 'pending' && selectedRepairRequest.expires_at && (
                        <View style={[styles.modalInfoCard, styles.modalExpiryCard]}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="time-outline" size={18} color="#ffc107" />
                            <Text style={styles.modalCardTitle}>Request Expiry</Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalExpiryText}>
                          {getTimeRemaining(selectedRepairRequest.expires_at)}
                        </Text>
                          </View>
                      </View>
                    )}
                    </View>
                  </View>
                )}
                
                {selectedRentalRequest && (
                  <View>
                    {/* Header with Status and Amount */}
                    <View style={styles.modalHeaderSection}>
                      <View style={styles.modalHeaderLeft}>
                        <View style={styles.modalRequestIdContainer}>
                          <Ionicons name="bicycle-outline" size={20} color="#FFD11E" />
                          <Text style={styles.modalRequestId}>#{selectedRentalRequest.id}</Text>
                        </View>
                        <View style={[
                          styles.modalStatusBadge,
                          { backgroundColor: getStatusColor(selectedRentalRequest.status) }
                        ]}>
                          <Ionicons 
                            name={getStatusIcon(selectedRentalRequest.status) as any} 
                            size={14} 
                            color="#fff" 
                          />
                          <Text style={styles.modalStatusText}>
                            {getStatusText(selectedRentalRequest.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalAmountContainer}>
                        <Text style={styles.modalAmountLabel}>Total Amount</Text>
                        <Text style={styles.modalAmountValue}>₹{Number(selectedRentalRequest.total_amount) || 0}</Text>
                      </View>
                    </View>

                    {/* Amount Details Card */}
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalCardHeader}>
                        <Ionicons name="pricetag-outline" size={18} color="#FFD11E" />
                        <Text style={styles.modalCardTitle}>Amount Details</Text>
                      </View>
                      <View style={styles.modalCardContent}>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalInfoLabel}>Rental Rate:</Text>
                          <Text style={styles.modalInfoValue}>
                            ₹{(() => {
                              const total = Number(selectedRentalRequest.total_amount) || 0;
                              const delivery = Number(selectedRentalRequest.delivery_charge) || 0;
                              const duration = Number(selectedRentalRequest.duration_count) || 1;
                              const rate = Math.round((total - delivery) / duration);
                              return rate > 0 ? rate : 0;
                            })()}/{selectedRentalRequest.duration_type === 'daily' ? 'day' : 'week'}
                          </Text>
                        </View>
                        <View style={styles.modalInfoRow}>
                          <Text style={styles.modalInfoLabel}>Delivery Charge:</Text>
                          <Text style={styles.modalInfoValue}>₹{Number(selectedRentalRequest.delivery_charge) || 0}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Key Information Cards */}
                    <View style={styles.modalCardsContainer}>
                      {/* Bicycle Details Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="bicycle-outline" size={18} color="#FFD11E" />
                          <Text style={styles.modalCardTitle}>Bicycle Details</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Bicycle:</Text>
                            <Text style={styles.modalInfoValue}>{selectedRentalRequest.bicycle_name}</Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Duration:</Text>
                            <Text style={styles.modalInfoValue}>
                              {selectedRentalRequest.duration_count} {selectedRentalRequest.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
                            </Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Delivery Charge:</Text>
                            <Text style={styles.modalInfoValue}>₹{Number(selectedRentalRequest.delivery_charge) || 0}</Text>
                          </View>
                        </View>
                    </View>
                    
                      {/* Delivery Information Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="location-outline" size={18} color="#FFD11E" />
                          <Text style={styles.modalCardTitle}>Delivery Information</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <Text style={styles.modalAddressText}>{selectedRentalRequest.delivery_address}</Text>
                        </View>
                    </View>
                    
                      {/* Request Information Card */}
                      <View style={styles.modalInfoCard}>
                        <View style={styles.modalCardHeader}>
                          <Ionicons name="calendar-outline" size={18} color="#FFD11E" />
                          <Text style={styles.modalCardTitle}>Request Information</Text>
                        </View>
                        <View style={styles.modalCardContent}>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Request Date:</Text>
                            <Text style={styles.modalInfoValue}>
                              {new Date(selectedRentalRequest.created_at).toLocaleDateString()}
                      </Text>
                          </View>
                          <View style={styles.modalInfoRow}>
                            <Text style={styles.modalInfoLabel}>Request Time:</Text>
                            <Text style={styles.modalInfoValue}>
                              {new Date(selectedRentalRequest.created_at).toLocaleTimeString()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Pending Status Card */}
                      {selectedRentalRequest.status === 'pending' && (
                        <View style={[styles.modalInfoCard, styles.modalExpiryCard]}>
                          <View style={styles.modalCardHeader}>
                            <Ionicons name="time-outline" size={18} color="#ffc107" />
                            <Text style={styles.modalCardTitle}>Request Status</Text>
                          </View>
                          <View style={styles.modalCardContent}>
                            <Text style={styles.modalExpiryText}>Pending approval</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeRequestModal}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 8,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#FFF5CC',
    borderWidth: 1,
    borderColor: '#FFD11E',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  activeTabButtonText: {
    color: '#2D3E50',
    fontWeight: 'bold',
  },
  requestsList: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyStateButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  requestCardModern: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    padding: 12,
    marginBottom: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIdModern: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  statusBadgeModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusTextModern: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  cardContent: {
    flexDirection: 'column',
  },
  amountDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  dateValue: {
    fontSize: 12,
    color: '#2D3E50',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#4A4A4A',
    marginLeft: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addressTextModern: {
    fontSize: 12,
    color: '#4A4A4A',
    marginLeft: 4,
    flex: 1,
  },
  mediaSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mediaLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginLeft: 4,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaItemModern: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  imageThumbnailModern: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  videoThumbnailModern: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mediaIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  mediaMoreModern: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  mediaMoreText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  expirySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  expiryTextModern: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '600',
    marginLeft: 4,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deliveryText: {
    fontSize: 12,
    color: '#4A4A4A',
    marginLeft: 4,
  },
  rentalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rentalRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rentalRateText: {
    fontSize: 13,
    color: '#2D3E50',
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  modalScroll: {
    flex: 1,
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 8,
  },
  modalDetail: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#FFD11E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalMediaItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalImageThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  modalVideoThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  modalMediaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  modalMediaLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  modalHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalRequestIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalRequestId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginLeft: 8,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  modalAmountContainer: {
    alignItems: 'flex-end',
  },
  modalAmountLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  modalAmountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
  },
  modalServiceChargeLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    marginBottom: 2,
  },
  modalServiceChargeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  modalCardsContainer: {
    gap: 12,
  },
  modalInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 16,
    marginBottom: 8,
  },
  modalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginLeft: 8,
    flex: 1,
  },
  modalCardContent: {
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#2D3E50',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  modalAddressText: {
    fontSize: 14,
    color: '#2D3E50',
    lineHeight: 20,
  },
  modalNotesText: {
    fontSize: 14,
    color: '#2D3E50',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalMediaCount: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  modalMediaIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  modalExpiryCard: {
    borderColor: '#ffc107',
    backgroundColor: '#fff3cd',
  },
  modalExpiryText: {
    fontSize: 16,
    color: '#ffc107',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalServiceItem: {
    marginBottom: 12,
  },
  modalServiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalServiceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3E50',
    flex: 1,
  },
  modalServicePrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#28a745',
  },
  modalServiceDescription: {
    fontSize: 13,
    color: '#4A4A4A',
    lineHeight: 18,
    marginBottom: 4,
  },
  modalServiceInstructions: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 4,
  },
  modalServiceInstructionsLabel: {
    fontWeight: '600',
    color: '#2D3E50',
  },
  modalServiceDiscount: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalServiceDiscountText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
  },
  modalServiceDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginTop: 12,
    marginBottom: 12,
  },
}); 