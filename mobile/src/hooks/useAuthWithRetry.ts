import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  loginUser, 
  registerUser, 
  setRetrying, 
  incrementRetryCount, 
  resetRetryCount,
  clearError,
  setTimeoutWarningShown
} from '@/store/slices/authSlice';
import { LoginCredentials, RegisterData, AuthError } from '@/types';
import { ErrorHandler } from '@/utils/errorHandler';
import { API_CONFIG } from '@/config/api';

export const useAuthWithRetry = () => {
  const dispatch = useDispatch();
  const { isRetrying, retryCount, error, isLoading, lastOperation, timeoutWarningShown } = useSelector((state: RootState) => state.auth);
  const operationStartTime = useRef<number>(0);
  const timeoutWarningTimer = useRef<NodeJS.Timeout | null>(null);

  // Setup timeout warning for long-running operations
  useEffect(() => {
    if (isLoading && !timeoutWarningShown && lastOperation) {
      operationStartTime.current = Date.now();
      
      // Show warning after 8 seconds
      timeoutWarningTimer.current = setTimeout(() => {
        if (isLoading && !timeoutWarningShown) {
          dispatch(setTimeoutWarningShown(true));
          ErrorHandler.showTimeoutWarning(
            () => {
              // User chose to retry
              if (lastOperation && retryCount < 3) {
                handleRetry();
              }
            },
            () => {
              // User chose to cancel
              dispatch(clearError());
            }
          );
        }
      }, 8000);
    }

    return () => {
      if (timeoutWarningTimer.current) {
        clearTimeout(timeoutWarningTimer.current);
        timeoutWarningTimer.current = null;
      }
    };
  }, [isLoading, timeoutWarningShown, lastOperation, retryCount, dispatch]);

  const handleAuthError = useCallback((error: AuthError, onRetry?: () => void) => {
    if (error.isRetryable && retryCount < 3) {
      ErrorHandler.showRetryPrompt(
        error,
        () => {
          if (onRetry) {
            onRetry();
          }
        },
        () => {
          dispatch(clearError());
        }
      );
    } else {
      ErrorHandler.showRetryPrompt(
        error,
        () => {},
        () => {
          dispatch(clearError());
        }
      );
    }
  }, [retryCount, dispatch]);

  const handleRetry = useCallback(() => {
    if (retryCount >= 3) {
      return;
    }

    dispatch(setRetrying(true));
    dispatch(incrementRetryCount());
    
    // The actual retry logic will be handled by the calling component
    // This just updates the state to indicate a retry is happening
  }, [dispatch, retryCount]);

  const loginWithRetry = useCallback(async (credentials: LoginCredentials, isRetryAttempt = false) => {
    try {
      if (!isRetryAttempt) {
        dispatch(clearError());
        dispatch(resetRetryCount());
      }
      
      const result = await dispatch(loginUser(credentials)).unwrap();
      dispatch(setRetrying(false));
      return result;
    } catch (error: any) {
      dispatch(setRetrying(false));
      
      if (!isRetryAttempt) {
        handleAuthError(error as AuthError, () => {
          loginWithRetry(credentials, true);
        });
      }
      throw error;
    }
  }, [dispatch, handleAuthError]);

  const registerWithRetry = useCallback(async (userData: RegisterData, isRetryAttempt = false) => {
    try {
      if (!isRetryAttempt) {
        dispatch(clearError());
        dispatch(resetRetryCount());
      }
      
      const result = await dispatch(registerUser(userData)).unwrap();
      dispatch(setRetrying(false));
      return result;
    } catch (error: any) {
      dispatch(setRetrying(false));
      
      if (!isRetryAttempt) {
        handleAuthError(error as AuthError, () => {
          registerWithRetry(userData, true);
        });
      }
      throw error;
    }
  }, [dispatch, handleAuthError]);

  const retryLastOperation = useCallback((operation: () => Promise<any>) => {
    if (retryCount >= 3) {
      return;
    }

    handleRetry();
    
    operation()
      .finally(() => {
        dispatch(setRetrying(false));
      });
  }, [dispatch, retryCount, handleRetry]);

  const getLoadingMessage = useCallback(() => {
    if (!lastOperation) return 'Loading...';
    return ErrorHandler.getLoadingMessage(lastOperation, isRetrying, retryCount);
  }, [lastOperation, isRetrying, retryCount]);

  return {
    loginWithRetry,
    registerWithRetry,
    retryLastOperation,
    isRetrying,
    retryCount,
    error,
    handleAuthError,
    getLoadingMessage,
    handleRetry,
  };
};

export default useAuthWithRetry;