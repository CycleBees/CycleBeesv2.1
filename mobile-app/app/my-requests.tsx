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
  duration: number;
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
          // Backend returns { success: true, data: [...] }
          setRentalRequests(data.success && data.data ? data.data : []);
        } else {
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
              style={styles.requestCardCompact}
              onPress={() => openRepairRequestDetails(request)}
            >
              <View style={styles.requestCardHeader}>
                <Text style={styles.requestId}>#{request.id}</Text>
                <View style={[
                  styles.statusBadgeCompact,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.statusTextCompact}>
                    {getStatusText(request.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.requestCardContent}>
                <View style={styles.requestSummary}>
                  <Text style={styles.requestAmount}>₹{request.total_amount}</Text>
                  <Text style={styles.requestDate}>{request.preferred_date}</Text>
                </View>
                
                <View style={styles.requestMeta}>
                  <Text style={styles.requestTime}>{request.start_time} - {request.end_time}</Text>
                  <Text style={styles.requestPayment}>{request.payment_method}</Text>
                </View>
                
                {request.address && (
                  <View style={styles.addressContainer}>
                    <Ionicons name="location-outline" size={12} color="#4A4A4A" />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {request.address}
                    </Text>
                  </View>
                )}
                
                {/* Media Files Display */}
                {request.files && request.files.length > 0 && (
                  <View style={styles.mediaContainer}>
                    <View style={styles.mediaHeader}>
                      <Ionicons name="images-outline" size={12} color="#4A4A4A" />
                      <Text style={styles.mediaCount}>
                        {request.files.filter(f => f.file_type === 'image').length} photos, 
                        {request.files.filter(f => f.file_type === 'video').length} video
                      </Text>
                    </View>
                    <View style={styles.mediaPreview}>
                      {request.files.slice(0, 3).map((file, index) => (
                        <View key={file.id} style={styles.mediaItem}>
                          {file.file_type === 'image' ? (
                            <View style={styles.imageThumbnail}>
                              <Text style={styles.mediaText}>📷</Text>
                            </View>
                          ) : (
                            <View style={styles.videoThumbnail}>
                              <Text style={styles.mediaText}>🎥</Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {request.files.length > 3 && (
                        <View style={styles.mediaMore}>
                          <Text style={styles.mediaMoreText}>+{request.files.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {request.status === 'pending' && request.expires_at && (
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={12} color="#ffc107" />
                    <Text style={styles.expiryText}>{getTimeRemaining(request.expires_at)}</Text>
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
          {rentalRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCardCompact}
              onPress={() => openRentalRequestDetails(request)}
            >
              <View style={styles.requestCardHeader}>
                <Text style={styles.requestId}>#{request.id}</Text>
                <View style={[
                  styles.statusBadgeCompact,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.statusTextCompact}>
                    {getStatusText(request.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.requestCardContent}>
                <View style={styles.requestSummary}>
                  <Text style={styles.requestAmount}>₹{request.total_amount}</Text>
                  <Text style={styles.requestDateCompact}>
                    {new Date(request.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.requestMeta}>
                  <Text style={styles.requestTime}>{request.bicycle_name}</Text>
                  <Text style={styles.requestPayment}>{request.duration} {request.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}</Text>
                </View>
                
                {request.status === 'pending' && (
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={12} color="#ffc107" />
                    <Text style={styles.expiryText}>Pending approval</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
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
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Request Information</Text>
                      <Text style={styles.modalDetail}>Request ID: #{selectedRepairRequest.id}</Text>
                      <Text style={styles.modalDetail}>Status: {getStatusText(selectedRepairRequest.status)}</Text>
                      <Text style={styles.modalDetail}>Total Amount: ₹{selectedRepairRequest.total_amount}</Text>
                      <Text style={styles.modalDetail}>Payment Method: {selectedRepairRequest.payment_method}</Text>
                    </View>
                    
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Contact Information</Text>
                      <Text style={styles.modalDetail}>Phone: {selectedRepairRequest.contact_number}</Text>
                      {selectedRepairRequest.alternate_number && (
                        <Text style={styles.modalDetail}>Alternate: {selectedRepairRequest.alternate_number}</Text>
                      )}
                      {selectedRepairRequest.email && (
                        <Text style={styles.modalDetail}>Email: {selectedRepairRequest.email}</Text>
                      )}
                      {selectedRepairRequest.address && (
                        <Text style={styles.modalDetail}>Address: {selectedRepairRequest.address}</Text>
                      )}
                    </View>
                    
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Service Details</Text>
                      <Text style={styles.modalDetail}>Preferred Date: {selectedRepairRequest.preferred_date}</Text>
                      <Text style={styles.modalDetail}>Time Slot: {selectedRepairRequest.start_time} - {selectedRepairRequest.end_time}</Text>
                      {selectedRepairRequest.notes && (
                        <Text style={styles.modalDetail}>Notes: {selectedRepairRequest.notes}</Text>
                      )}
                    </View>
                    
                    {/* Media Files Display */}
                    {selectedRepairRequest.files && selectedRepairRequest.files.length > 0 && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Media Files</Text>
                        <View style={styles.modalMediaGrid}>
                          {selectedRepairRequest.files.map((file, index) => (
                            <View key={file.id} style={styles.modalMediaItem}>
                              {file.file_type === 'image' ? (
                                <View style={styles.modalImageThumbnail}>
                                  <Text style={styles.modalMediaText}>📷</Text>
                                  <Text style={styles.modalMediaLabel}>Photo {index + 1}</Text>
                                </View>
                              ) : (
                                <View style={styles.modalVideoThumbnail}>
                                  <Text style={styles.modalMediaText}>🎥</Text>
                                  <Text style={styles.modalMediaLabel}>Video</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {selectedRepairRequest.status === 'pending' && selectedRepairRequest.expires_at && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Request Expiry</Text>
                        <Text style={[styles.modalDetail, { color: '#ffc107', fontWeight: 'bold' }]}>
                          {getTimeRemaining(selectedRepairRequest.expires_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                {selectedRentalRequest && (
                  <View>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Request Information</Text>
                      <Text style={styles.modalDetail}>Request ID: #{selectedRentalRequest.id}</Text>
                      <Text style={styles.modalDetail}>Status: {getStatusText(selectedRentalRequest.status)}</Text>
                      <Text style={styles.modalDetail}>Total Amount: ₹{selectedRentalRequest.total_amount}</Text>
                    </View>
                    
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Bicycle Details</Text>
                      <Text style={styles.modalDetail}>Bicycle: {selectedRentalRequest.bicycle_name}</Text>
                      <Text style={styles.modalDetail}>Duration: {selectedRentalRequest.duration} {selectedRentalRequest.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}</Text>
                      <Text style={styles.modalDetail}>Delivery Charge: ₹{selectedRentalRequest.delivery_charge}</Text>
                    </View>
                    
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Delivery Information</Text>
                      <Text style={styles.modalDetail}>Delivery Address: {selectedRentalRequest.delivery_address}</Text>
                    </View>
                    
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Request Date</Text>
                      <Text style={styles.modalDetail}>
                        {new Date(selectedRentalRequest.created_at).toLocaleDateString()} at {new Date(selectedRentalRequest.created_at).toLocaleTimeString()}
                      </Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
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
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  requestId: {
    flex: 1,
  },
  requestIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 5,
  },
  requestDate: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  requestDateCompact: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusTextCompact: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  requestDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2D3E50',
    flex: 2,
    textAlign: 'right',
  },
  paymentButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  requestCardCompact: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
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
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  requestCardContent: {
    flexDirection: 'column',
  },
  requestSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTime: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  requestPayment: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  expiryText: {
    fontSize: 14,
    color: '#ffc107',
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
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    marginBottom: 5,
  },
  closeButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  addressText: {
    fontSize: 14,
    color: '#4A4A4A',
    marginLeft: 4,
  },
  mediaContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  mediaCount: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  mediaPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  videoThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mediaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  mediaMore: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  mediaMoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  modalMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalMediaItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  modalImageThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalVideoThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalMediaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  modalMediaLabel: {
    fontSize: 12,
    color: '#4A4A4A',
  },
}); 