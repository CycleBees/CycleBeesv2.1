import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface RepairRequest {
  id: number;
  services: string[];
  total_amount: number;
  status: string;
  created_at: string;
  preferred_date: string;
  preferred_time_slot: string;
  notes: string;
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

export default function MyRequestsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'repair' | 'rental'>('repair');
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (activeTab === 'repair') {
        const response = await fetch('http://localhost:3000/api/repair/requests', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRepairRequests(data);
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
          setRentalRequests(data);
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
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

  const renderRepairRequests = () => (
    <ScrollView
      style={styles.requestsList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {repairRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={60} color="#4A4A4A" />
          <Text style={styles.emptyStateTitle}>No Repair Requests</Text>
          <Text style={styles.emptyStateSubtitle}>
            You haven't made any repair requests yet
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('BookRepair')}
          >
            <Text style={styles.emptyStateButtonText}>Book Your First Repair</Text>
          </TouchableOpacity>
        </View>
      ) : (
        repairRequests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestId}>
                <Text style={styles.requestIdText}>Repair #{request.id}</Text>
                <Text style={styles.requestDate}>
                  {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(request.status) }
              ]}>
                <Ionicons 
                  name={getStatusIcon(request.status) as any} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.statusText}>
                  {getStatusText(request.status)}
                </Text>
              </View>
            </View>

            <View style={styles.requestDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Services:</Text>
                <Text style={styles.detailValue}>
                  {request.services.join(', ')}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>₹{request.total_amount}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Preferred Date:</Text>
                <Text style={styles.detailValue}>{request.preferred_date}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time Slot:</Text>
                <Text style={styles.detailValue}>{request.preferred_time_slot}</Text>
              </View>
              
              {request.notes && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes:</Text>
                  <Text style={styles.detailValue}>{request.notes}</Text>
                </View>
              )}
            </View>

            {request.status === 'waiting_payment' && (
              <TouchableOpacity style={styles.paymentButton}>
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={styles.paymentButtonText}>Make Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
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
      {rentalRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bicycle-outline" size={60} color="#4A4A4A" />
          <Text style={styles.emptyStateTitle}>No Rental Requests</Text>
          <Text style={styles.emptyStateSubtitle}>
            You haven't made any rental requests yet
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('BookRental')}
          >
            <Text style={styles.emptyStateButtonText}>Rent Your First Bicycle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        rentalRequests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestId}>
                <Text style={styles.requestIdText}>Rental #{request.id}</Text>
                <Text style={styles.requestDate}>
                  {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(request.status) }
              ]}>
                <Ionicons 
                  name={getStatusIcon(request.status) as any} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.statusText}>
                  {getStatusText(request.status)}
                </Text>
              </View>
            </View>

            <View style={styles.requestDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bicycle:</Text>
                <Text style={styles.detailValue}>{request.bicycle_name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>
                  {request.duration} {request.duration_type === 'daily' ? 'Day(s)' : 'Week(s)'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>₹{request.total_amount}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery Address:</Text>
                <Text style={styles.detailValue}>{request.delivery_address}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery Charge:</Text>
                <Text style={styles.detailValue}>₹{request.delivery_charge}</Text>
              </View>
            </View>

            {request.status === 'waiting_payment' && (
              <TouchableOpacity style={styles.paymentButton}>
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={styles.paymentButtonText}>Make Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
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
}); 