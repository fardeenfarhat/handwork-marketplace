import { useCallback } from 'react';
import { ErrorHandler } from '../utils/errorHandler';

export const useErrorHandler = () => {
  const handleError = useCallback((error: any, title?: string) => {
    ErrorHandler.showAlert(error, title);
  }, []);

  const handleAuthError = useCallback((error: any) => {
    ErrorHandler.showAuthError(error);
  }, []);

  const handleNetworkError = useCallback(() => {
    ErrorHandler.showNetworkError();
  }, []);

  const handleValidationError = useCallback((errors: Record<string, string>) => {
    ErrorHandler.showValidationError(errors);
  }, []);

  return {
    handleError,
    handleAuthError,
    handleNetworkError,
    handleValidationError,
  };
};