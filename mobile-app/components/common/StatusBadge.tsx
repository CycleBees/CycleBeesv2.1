import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: '#ffc107',
          icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Pending Approval'
        };
      case 'waiting_payment':
        return {
          color: '#17a2b8',
          icon: 'card-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Waiting for Payment'
        };
      case 'active':
        return {
          color: '#28a745',
          icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Active'
        };
      case 'arranging_delivery':
        return {
          color: '#6f42c1',
          icon: 'car-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Arranging Delivery'
        };
      case 'active_rental':
        return {
          color: '#28a745',
          icon: 'bicycle-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Active Rental'
        };
      case 'completed':
        return {
          color: '#6c757d',
          icon: 'checkmark-done-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Completed'
        };
      case 'expired':
        return {
          color: '#dc3545',
          icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap,
          text: 'Expired'
        };
      default:
        return {
          color: '#6c757d',
          icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
          text: status.replace('_', ' ').toUpperCase()
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View style={[
      styles.statusBadge,
      styles[size],
      { backgroundColor: config.color }
    ]}>
      <Ionicons
        name={config.icon}
        size={size === 'small' ? 10 : size === 'large' ? 16 : 12}
        color="#fff"
      />
      <Text style={[styles.statusText, styles[`${size}Text`]]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  small: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medium: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  large: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
});