import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusUtils } from '@/utils/status';

interface BaseRequest {
  id: number;
  status: string;
  total_amount: number;
  created_at: string;
}

interface RepairRequest extends BaseRequest {
  type: 'repair';
  preferred_date: string;
  start_time: string;
  end_time: string;
  payment_method: string;
  address?: string;
  expires_at?: string;
  files?: Array<{
    id: number;
    file_type: string;
  }>;
}

interface RentalRequest extends BaseRequest {
  type: 'rental';
  bicycle_name: string;
  duration_type: string;
  duration_count: number;
  delivery_address: string;
  delivery_charge: number;
}

type RequestData = RepairRequest | RentalRequest;

interface RequestCardProps {
  request: RequestData;
  onPress: () => void;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const isRepair = request.type === 'repair';
  const iconName = isRepair ? 'construct-outline' : 'bicycle-outline';

  return (
    <TouchableOpacity style={styles.requestCard} onPress={onPress}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.requestIdContainer}>
          <Ionicons name={iconName} size={16} color="#FFD11E" />
          <Text style={styles.requestId}>#{request.id}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: StatusUtils.getStatusColor(request.status) }
        ]}>
          <Ionicons 
            name={StatusUtils.getStatusIcon(request.status) as any} 
            size={12} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {StatusUtils.getStatusText(request.status)}
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
            <Text style={styles.dateLabel}>
              {isRepair ? 'Date' : 'Requested'}
            </Text>
            <Text style={styles.dateValue}>
              {isRepair 
                ? (request as RepairRequest).preferred_date
                : new Date(request.created_at).toLocaleDateString()
              }
            </Text>
          </View>
        </View>
        
        {/* Request-specific details */}
        {isRepair ? (
          <RepairDetails request={request as RepairRequest} />
        ) : (
          <RentalDetails request={request as RentalRequest} />
        )}
        
        {/* Address */}
        <AddressRow request={request} />
        
        {/* Media files for repair requests */}
        {isRepair && (request as RepairRequest).files && (
          <MediaSection files={(request as RepairRequest).files!} />
        )}
        
        {/* Expiry timer for pending requests */}
        {request.status === 'pending' && (
          <ExpirySection request={request} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function RepairDetails({ request }: { request: RepairRequest }) {
  return (
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
  );
}

function RentalDetails({ request }: { request: RentalRequest }) {
  const calculateRate = () => {
    const total = Number(request.total_amount) || 0;
    const delivery = Number(request.delivery_charge) || 0;
    const duration = Number(request.duration_count) || 1;
    return Math.round((total - delivery) / duration);
  };

  return (
    <>
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
      
      <View style={styles.rentalRateRow}>
        <View style={styles.rentalRateItem}>
          <Ionicons name="pricetag-outline" size={14} color="#6c757d" />
          <Text style={styles.rentalRateText}>
            Rate: ₹{calculateRate()}/{request.duration_type === 'daily' ? 'day' : 'week'}
          </Text>
        </View>
      </View>
      
      <View style={styles.deliveryRow}>
        <Ionicons name="car-outline" size={14} color="#6c757d" />
        <Text style={styles.deliveryText}>Delivery: ₹{Number(request.delivery_charge) || 0}</Text>
      </View>
    </>
  );
}

function AddressRow({ request }: { request: RequestData }) {
  const address = request.type === 'repair' 
    ? (request as RepairRequest).address
    : (request as RentalRequest).delivery_address;

  if (!address) return null;

  return (
    <View style={styles.addressRow}>
      <Ionicons name="location-outline" size={14} color="#6c757d" />
      <Text style={styles.addressText} numberOfLines={1}>
        {address}
      </Text>
    </View>
  );
}

function MediaSection({ files }: { files: Array<{ id: number; file_type: string }> }) {
  if (!files.length) return null;

  const imageCount = files.filter(f => f.file_type === 'image').length;
  const videoCount = files.filter(f => f.file_type === 'video').length;

  return (
    <View style={styles.mediaSection}>
      <View style={styles.mediaHeader}>
        <Ionicons name="images-outline" size={14} color="#6c757d" />
        <Text style={styles.mediaLabel}>
          {imageCount} photos, {videoCount} video
        </Text>
      </View>
      <View style={styles.mediaGrid}>
        {files.slice(0, 3).map((file) => (
          <View key={file.id} style={styles.mediaItem}>
            {file.file_type === 'image' ? (
              <View style={styles.imageThumbnail}>
                <Text style={styles.mediaIcon}>📷</Text>
              </View>
            ) : (
              <View style={styles.videoThumbnail}>
                <Text style={styles.mediaIcon}>🎥</Text>
              </View>
            )}
          </View>
        ))}
        {files.length > 3 && (
          <View style={styles.mediaMore}>
            <Text style={styles.mediaMoreText}>+{files.length - 3}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ExpirySection({ request }: { request: RequestData }) {
  const isRepair = request.type === 'repair';
  const expiresAt = isRepair ? (request as RepairRequest).expires_at : undefined;
  
  return (
    <View style={styles.expirySection}>
      <Ionicons name="time-outline" size={14} color="#ffc107" />
      <Text style={styles.expiryText}>
        {expiresAt ? StatusUtils.getTimeRemaining(expiresAt) : 'Pending approval'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  requestIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    padding: 16,
  },
  amountDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28a745',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
    flex: 1,
  },
  rentalRateRow: {
    marginBottom: 8,
  },
  rentalRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rentalRateText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
    flex: 1,
  },
  mediaSection: {
    marginBottom: 8,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediaLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageThumbnail: {
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  mediaIcon: {
    fontSize: 16,
  },
  mediaMore: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaMoreText: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '600',
  },
  expirySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  expiryText: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '600',
    marginLeft: 6,
  },
});