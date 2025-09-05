import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthError } from '@/types';

interface ErrorDisplayProps {
  error: AuthError;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: any;
}

export default function ErrorDisplay({ error, onRetry, onDismiss, style }: ErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'timeout':
        return 'time-outline';
      case 'network':
        return 'wifi-outline';
      case 'server':
        return 'server-outline';
      case 'auth':
        return 'lock-closed-outline';
      case 'validation':
        return 'alert-circle-outline';
      default:
        return 'warning-outline';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'timeout':
        return '#FF9500';
      case 'network':
        return '#FF3B30';
      case 'server':
        return '#FF3B30';
      case 'auth':
        return '#FF3B30';
      case 'validation':
        return '#FF9500';
      default:
        return '#FF3B30';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons 
          name={getErrorIcon()} 
          size={24} 
          color={getErrorColor()} 
          style={styles.icon}
        />
        <Text style={styles.message}>{error.message}</Text>
        
        <View style={styles.actions}>
          {onDismiss && (
            <TouchableOpacity 
              style={[styles.button, styles.dismissButton]} 
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
          
          {error.isRetryable && onRetry && (
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]} 
              onPress={onRetry}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  content: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  dismissButton: {
    backgroundColor: '#F2F2F7',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});