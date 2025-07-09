import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export function LoadingButton({
  title,
  loading = false,
  icon,
  variant = 'primary',
  size = 'medium',
  disabled,
  style,
  ...touchableProps
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        style
      ]}
      disabled={isDisabled}
      {...touchableProps}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' ? '#007bff' : '#FFFFFF'}
            style={styles.loadingIndicator}
          />
        ) : (
          icon && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={variant === 'secondary' ? '#007bff' : '#FFFFFF'}
              style={styles.icon}
            />
          )
        )}
        <Text
          style={[
            styles.buttonText,
            styles[`${variant}Text`],
            styles[`${size}Text`]
          ]}
        >
          {loading ? 'Loading...' : title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Variants
  primary: {
    backgroundColor: '#007bff',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  success: {
    backgroundColor: '#28a745',
    borderWidth: 2,
    borderColor: '#28a745',
  },
  danger: {
    backgroundColor: '#dc3545',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  disabled: {
    opacity: 0.6,
  },
  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  // Text styles
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#007bff',
  },
  successText: {
    color: '#FFFFFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  icon: {
    marginRight: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
});