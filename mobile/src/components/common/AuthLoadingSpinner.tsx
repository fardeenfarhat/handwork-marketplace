import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ErrorHandler } from '@/utils/errorHandler';

interface AuthLoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  overlay?: boolean;
  customMessage?: string;
}

export default function AuthLoadingSpinner({
  size = 'large',
  color = '#007AFF',
  overlay = false,
  customMessage,
}: AuthLoadingSpinnerProps) {
  const { isLoading, isRetrying, retryCount, lastOperation } = useSelector((state: RootState) => state.auth);

  if (!isLoading && !isRetrying) {
    return null;
  }

  const containerStyle = overlay ? [styles.container, styles.overlay] : styles.container;
  
  const getMessage = () => {
    if (customMessage) return customMessage;
    if (!lastOperation) return 'Loading...';
    return ErrorHandler.getLoadingMessage(lastOperation, isRetrying, retryCount);
  };

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        <ActivityIndicator size={size} color={color} />
        <Text style={styles.text}>{getMessage()}</Text>
        {isRetrying && (
          <Text style={styles.retryText}>
            Attempt {retryCount} of 3
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    minWidth: 200,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});