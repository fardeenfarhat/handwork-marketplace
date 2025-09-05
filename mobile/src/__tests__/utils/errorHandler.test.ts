import { ErrorHandler } from '@/utils/errorHandler';
import { AuthError } from '@/types';

describe('ErrorHandler', () => {
  describe('createAuthError', () => {
    it('should create timeout error correctly', () => {
      const error = { name: 'AbortError', message: 'Request timeout' };
      const authError = ErrorHandler.createAuthError(error, 'login');

      expect(authError.type).toBe('timeout');
      expect(authError.isRetryable).toBe(true);
      expect(authError.message).toContain('timeout');
    });

    it('should create network error correctly', () => {
      const error = { message: 'Network connection failed' };
      const authError = ErrorHandler.createAuthError(error, 'register');

      expect(authError.type).toBe('network');
      expect(authError.isRetryable).toBe(true);
      expect(authError.message).toContain('Network error');
    });

    it('should create validation error correctly', () => {
      const error = { 
        response: { 
          status: 400, 
          data: { message: 'Invalid email format' } 
        } 
      };
      const authError = ErrorHandler.createAuthError(error, 'register');

      expect(authError.type).toBe('validation');
      expect(authError.isRetryable).toBe(false);
      expect(authError.statusCode).toBe(400);
    });

    it('should create auth error for login failures', () => {
      const error = { 
        response: { 
          status: 401, 
          data: { message: 'Invalid credentials' } 
        } 
      };
      const authError = ErrorHandler.createAuthError(error, 'login');

      expect(authError.type).toBe('auth');
      expect(authError.isRetryable).toBe(false);
      expect(authError.message).toContain('Invalid email or password');
    });

    it('should create server error correctly', () => {
      const error = { 
        response: { 
          status: 500, 
          data: { message: 'Internal server error' } 
        } 
      };
      const authError = ErrorHandler.createAuthError(error, 'login');

      expect(authError.type).toBe('server');
      expect(authError.isRetryable).toBe(true);
      expect(authError.statusCode).toBe(500);
    });
  });

  describe('getLoadingMessage', () => {
    it('should return correct message for login', () => {
      const message = ErrorHandler.getLoadingMessage('login', false, 0);
      expect(message).toBe('Signing in...');
    });

    it('should return correct message for register', () => {
      const message = ErrorHandler.getLoadingMessage('register', false, 0);
      expect(message).toBe('Creating account...');
    });

    it('should return retry message when retrying', () => {
      const message = ErrorHandler.getLoadingMessage('login', true, 2);
      expect(message).toBe('Retrying login... (2/3)');
    });
  });

  describe('shouldShowTimeoutWarning', () => {
    it('should return true when threshold exceeded', () => {
      const startTime = Date.now() - 10000; // 10 seconds ago
      const shouldShow = ErrorHandler.shouldShowTimeoutWarning(startTime, 8000);
      expect(shouldShow).toBe(true);
    });

    it('should return false when threshold not exceeded', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago
      const shouldShow = ErrorHandler.shouldShowTimeoutWarning(startTime, 8000);
      expect(shouldShow).toBe(false);
    });
  });
});