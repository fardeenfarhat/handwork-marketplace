import { Alert } from 'react-native';
import { API_CONFIG } from '@/config/api';
import { AuthError } from '@/types';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export class ErrorHandler {
  static createAuthError(error: any, operation?: string): AuthError {
    const timestamp = Date.now();
    
    console.log('🔍 ErrorHandler analyzing error:', {
      message: error?.message,
      status: error?.status || error?.response?.status,
      responseData: error?.response?.data,
      type: typeof error,
    });
    
    // Handle timeout errors
    if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
      return {
        message: API_CONFIG.ERROR_MESSAGES.TIMEOUT,
        type: 'timeout',
        isRetryable: true,
        timestamp,
      };
    }

    // Get status code from either error.status or error.response.status
    const statusCode = error?.status || error?.response?.status;
    
    // Handle authentication errors (401/403) - BEFORE network check
    if (statusCode === 401 || statusCode === 403) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.detail;
      return {
        message: operation === 'login' 
          ? (serverMessage === 'Incorrect email or password' 
              ? 'Invalid email or password. Please check your credentials and try again.'
              : 'Invalid email or password. Please try again.')
          : 'Authentication failed. Please check your credentials.',
        type: 'auth',
        isRetryable: false,
        statusCode: statusCode,
        timestamp,
      };
    }

    // Handle network errors (only if no status code)
    if (!statusCode && (error?.message?.toLowerCase().includes('network') || 
        error?.message?.toLowerCase().includes('connection') ||
        !navigator.onLine)) {
      return {
        message: API_CONFIG.ERROR_MESSAGES.NETWORK,
        type: 'network',
        isRetryable: true,
        timestamp,
      };
    }

    // Handle validation errors
    if (statusCode === 400 || statusCode === 422) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.detail;
      return {
        message: serverMessage || 'Please check your input and try again.',
        type: 'validation',
        isRetryable: false,
        statusCode: statusCode,
        timestamp,
      };
    }

    // Handle server errors
    if (statusCode >= 500) {
      return {
        message: 'Server error. Please try again later.',
        type: 'server',
        isRetryable: true,
        statusCode: statusCode,
        timestamp,
      };
    }

    // Handle specific error messages
    const serverMessage = error?.response?.data?.message || error?.response?.data?.detail;
    if (serverMessage) {
      let type: AuthError['type'] = 'unknown';
      let isRetryable = false;

        if (serverMessage.toLowerCase().includes('email already exists')) {
        type = 'validation';
        return {
          message: 'An account with this email already exists. Please sign in instead.',
          type,
          isRetryable,
          statusCode: statusCode,
          timestamp,
        };
      }      if (serverMessage.toLowerCase().includes('user not found')) {
        type = 'auth';
        return {
          message: 'No account found with this email address.',
          type,
          isRetryable,
          statusCode: statusCode,
          timestamp,
        };
      }

      return {
        message: serverMessage,
        type,
        isRetryable: statusCode >= 500,
        statusCode: statusCode,
        timestamp,
      };
    }

    // Default error
    return {
      message: error?.message || 'An unexpected error occurred. Please try again.',
      type: 'unknown',
      isRetryable: true,
      timestamp,
    };
  }

  static handle(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    // Handle timeout errors
    if (error?.message?.includes('timeout') || error?.name === 'AbortError') {
      return API_CONFIG.ERROR_MESSAGES.TIMEOUT;
    }

    // Handle network errors
    if (error?.message?.toLowerCase().includes('network') || 
        error?.message?.toLowerCase().includes('connection') ||
        !navigator.onLine) {
      return API_CONFIG.ERROR_MESSAGES.NETWORK;
    }

    // Handle retry errors
    if (error?.message?.includes('failed after multiple attempts')) {
      return API_CONFIG.ERROR_MESSAGES.RETRY_FAILED;
    }

    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (error?.message) {
      return error.message;
    }

    // Handle specific HTTP status codes
    if (error?.response?.status) {
      switch (error.response.status) {
        case 400:
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Authentication failed. Please check your credentials.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This email address is already registered.';
        case 422:
          return 'Please check your input and try again.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }

  static showAlert(error: any, title: string = 'Error') {
    const message = this.handle(error);
    Alert.alert(title, message);
  }

  static showAuthError(error: any) {
    const message = this.handle(error);
    
    // Customize messages for common auth errors
    let customMessage = message;
    if (message.toLowerCase().includes('invalid credentials')) {
      customMessage = 'Invalid email or password. Please try again.';
    } else if (message.toLowerCase().includes('email already exists')) {
      customMessage = 'An account with this email already exists. Please sign in instead.';
    } else if (message.toLowerCase().includes('user not found')) {
      customMessage = 'No account found with this email address.';
    }

    Alert.alert('Authentication Error', customMessage);
  }

  static showNetworkError() {
    Alert.alert(
      'Network Error',
      API_CONFIG.ERROR_MESSAGES.NETWORK,
      [{ text: 'OK' }]
    );
  }

  static showTimeoutError() {
    Alert.alert(
      'Request Timeout',
      API_CONFIG.ERROR_MESSAGES.TIMEOUT,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => {} } // Caller should handle retry
      ]
    );
  }

  static showValidationError(errors: Record<string, string>) {
    const firstError = Object.values(errors)[0];
    if (firstError) {
      Alert.alert('Validation Error', firstError);
    }
  }

  static showTimeoutWarning(onRetry?: () => void, onCancel?: () => void) {
    Alert.alert(
      'Request Taking Longer Than Expected',
      'This request is taking longer than usual. Would you like to continue waiting or try again?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: onCancel
        },
        { 
          text: 'Keep Waiting', 
          style: 'default'
        },
        { 
          text: 'Try Again', 
          onPress: onRetry
        }
      ]
    );
  }

  static showRetryPrompt(error: AuthError, onRetry: () => void, onCancel?: () => void) {
    if (!error.isRetryable) {
      Alert.alert('Error', error.message, [{ text: 'OK', onPress: onCancel }]);
      return;
    }

    let title = 'Error';
    let retryText = 'Retry';

    switch (error.type) {
      case 'timeout':
        title = 'Request Timeout';
        retryText = 'Try Again';
        break;
      case 'network':
        title = 'Network Error';
        retryText = 'Retry';
        break;
      case 'server':
        title = 'Server Error';
        retryText = 'Try Again';
        break;
    }

    Alert.alert(
      title,
      error.message,
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: retryText, onPress: onRetry }
      ]
    );
  }

  static getLoadingMessage(operation: string, isRetrying: boolean, retryCount: number): string {
    if (isRetrying) {
      return `Retrying ${operation}... (${retryCount}/3)`;
    }

    switch (operation) {
      case 'login':
        return 'Signing in...';
      case 'register':
        return 'Creating account...';
      case 'socialLogin':
        return 'Connecting...';
      case 'loadStored':
        return 'Loading...';
      default:
        return 'Processing...';
    }
  }

  static shouldShowTimeoutWarning(startTime: number, warningThreshold: number = 8000): boolean {
    return Date.now() - startTime > warningThreshold;
  }
}

export default ErrorHandler;