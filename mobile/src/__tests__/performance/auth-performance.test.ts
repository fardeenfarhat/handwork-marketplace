/**
 * Mobile authentication performance validation tests
 * Requirements: 4.1, 4.2, 4.3
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '@/store/slices/authSlice';
import { useAuthWithRetry } from '@/hooks/useAuthWithRetry';
import { API_CONFIG, RETRY_CONFIG } from '@/config/api';
import { ErrorHandler } from '@/utils/errorHandler';
import { withRetry } from '@/utils/retry';

// Mock API service
const mockApiService = {
  register: jest.fn(),
  login: jest.fn(),
};

jest.mock('@/services/api', () => ({
  apiService: mockApiService,
}));

// Performance tracking utilities
class PerformanceTracker {
  private startTime: number = 0;
  private measurements: number[] = [];

  start() {
    this.startTime = Date.now();
  }

  stop(): number {
    const duration = Date.now() - this.startTime;
    this.measurements.push(duration);
    return duration;
  }

  getAverage(): number {
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
  }

  getMax(): number {
    return Math.max(...this.measurements);
  }

  getMin(): number {
    return Math.min(...this.measurements);
  }

  getAllMeasurements(): number[] {
    return [...this.measurements];
  }

  reset() {
    this.measurements = [];
  }
}

describe('Mobile Authentication Performance Tests', () => {
  let store: any;
  let performanceTracker: PerformanceTracker;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });
    performanceTracker = new PerformanceTracker();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };

  describe('API Timeout Configuration - Requirement 4.1', () => {
    it('should have correct timeout configuration', () => {
      // Validate that timeout is set to 15 seconds as per requirement
      expect(API_CONFIG.REQUEST_TIMEOUT).toBe(15000);
      expect(API_CONFIG.RETRY_ATTEMPTS).toBe(3);
      expect(API_CONFIG.RETRY_DELAY).toBe(1000);
    });

    it('should timeout requests after configured duration', async () => {
      // Mock a request that never resolves
      mockApiService.login.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuthWithRetry(), { wrapper });

      performanceTracker.start();

      const loginPromise = act(async () => {
        try {
          await result.current.loginWithRetry('test@example.com', 'password');
        } catch (error) {
          // Expected to timeout
        }
      });

      // Fast-forward to just before timeout
      act(() => {
        jest.advanceTimersByTime(API_CONFIG.REQUEST_TIMEOUT - 1000);
      });

      // Should still be loading
      expect(store.getState().auth.isLoading).toBe(true);

      // Fast-forward past timeout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await loginPromise;

      const duration = performanceTracker.stop();

      // Should have timed out within expected range
      expect(duration).toBeLessThanOrEqual(API_CONFIG.REQUEST_TIMEOUT + 1000);
      expect(store.getState().auth.isLoading).toBe(false);
    });

    it('should handle multiple concurrent timeout scenarios', async () => {
      const timeoutPromises: Promise<any>[] = [];
      
      // Create multiple concurrent requests that will timeout
      for (let i = 0; i < 5; i++) {
        mockApiService.login.mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        const { result } = renderHook(() => useAuthWithRetry(), { wrapper });

        const promise = act(async () => {
          try {
            await result.current.loginWithRetry(`test${i}@example.com`, 'password');
          } catch (error) {
            // Expected to timeout
          }
        });

        timeoutPromises.push(promise);
      }

      performanceTracker.start();

      // Fast-forward past timeout for all requests
      act(() => {
        jest.advanceTimersByTime(API_CONFIG.REQUEST_TIMEOUT + 1000);
      });

      await Promise.all(timeoutPromises);

      const duration = performanceTracker.stop();

      // All requests should timeout within reasonable time
      expect(duration).toBeLessThanOrEqual(API_CONFIG.REQUEST_TIMEOUT + 2000);
    });
  });

  describe('Error Handling Performance - Requirement 4.2', () => {
    it('should quickly identify and categorize timeout errors', () => {
      const timeoutError = { name: 'AbortError', message: 'Request timeout' };
      
      performanceTracker.start();
      const authError = ErrorHandler.createAuthError(timeoutError, 'login');
      const duration = performanceTracker.stop();

      // Error handling should be very fast
      expect(duration).toBeLessThan(10);
      expect(authError.type).toBe('timeout');
      expect(authError.isRetryable).toBe(true);
    });

    it('should efficiently handle network error categorization', () => {
      const testCases = [
        { error: { name: 'AbortError' }, expectedType: 'timeout' },
        { error: { message: 'Network request failed' }, expectedType: 'network' },
        { error: { response: { status: 500 } }, expectedType: 'server' },
        { error: { response: { status: 401 } }, expectedType: 'auth' },
        { error: { response: { status: 408 } }, expectedType: 'timeout' },
      ];

      const durations: number[] = [];

      testCases.forEach(({ error, expectedType }) => {
        performanceTracker.start();
        const authError = ErrorHandler.createAuthError(error, 'login');
        const duration = performanceTracker.stop();

        durations.push(duration);
        expect(authError.type).toBe(expectedType);
      });

      // All error categorizations should be very fast
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(5);
    });

    it('should provide timeout warnings efficiently', () => {
      const testCases = [
        { startTime: Date.now() - 10000, threshold: 8000, expected: true },
        { startTime: Date.now() - 5000, threshold: 8000, expected: false },
        { startTime: Date.now() - 15000, threshold: 10000, expected: true },
      ];

      testCases.forEach(({ startTime, threshold, expected }) => {
        performanceTracker.start();
        const shouldShow = ErrorHandler.shouldShowTimeoutWarning(startTime, threshold);
        const duration = performanceTracker.stop();

        expect(shouldShow).toBe(expected);
        expect(duration).toBeLessThan(1); // Should be nearly instantaneous
      });
    });
  });

  describe('Retry Logic Performance - Requirement 4.3', () => {
    it('should implement efficient exponential backoff', async () => {
      const delays: number[] = [];
      let callCount = 0;

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test
      }) as any;

      mockApiService.login.mockImplementation(() => {
        callCount++;
        if (callCount < 4) {
          return Promise.reject({ response: { status: 500 } });
        }
        return Promise.resolve({
          user: { id: 1, email: 'test@example.com' },
          token: { access_token: 'token123' }
        });
      });

      const retryableFunction = withRetry(mockApiService.login, RETRY_CONFIG);

      performanceTracker.start();

      await act(async () => {
        await retryableFunction('test@example.com', 'password');
      });

      const totalDuration = performanceTracker.stop();

      // Verify exponential backoff pattern
      expect(delays).toEqual([
        RETRY_CONFIG.baseDelay,
        RETRY_CONFIG.baseDelay * RETRY_CONFIG.backoffFactor,
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, 2)
      ]);

      // Total duration should be reasonable (excluding actual delays in test)
      expect(totalDuration).toBeLessThan(100);
      expect(callCount).toBe(4);

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should respect maximum delay limits', async () => {
      const delays: number[] = [];

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      mockApiService.login.mockImplementation(() => {
        return Promise.reject({ response: { status: 500 } });
      });

      const retryableFunction = withRetry(mockApiService.login, {
        ...RETRY_CONFIG,
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 5000,
        backoffFactor: 3
      });

      try {
        await act(async () => {
          await retryableFunction('test@example.com', 'password');
        });
      } catch (error) {
        // Expected to fail after retries
      }

      // Verify that delays don't exceed maxDelay
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(5000);
      });

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should efficiently determine retry eligibility', () => {
      const testCases = [
        { error: { name: 'AbortError' }, shouldRetry: true },
        { error: { response: { status: 500 } }, shouldRetry: true },
        { error: { response: { status: 502 } }, shouldRetry: true },
        { error: { response: { status: 408 } }, shouldRetry: true },
        { error: { response: { status: 429 } }, shouldRetry: true },
        { error: { response: { status: 401 } }, shouldRetry: false },
        { error: { response: { status: 403 } }, shouldRetry: false },
        { error: { response: { status: 404 } }, shouldRetry: false },
      ];

      testCases.forEach(({ error, shouldRetry }) => {
        performanceTracker.start();
        
        // Import the retry logic function
        const { defaultShouldRetry } = require('@/utils/retry');
        const result = defaultShouldRetry(error);
        
        const duration = performanceTracker.stop();

        expect(result).toBe(shouldRetry);
        expect(duration).toBeLessThan(1); // Should be very fast
      });
    });
  });

  describe('Loading State Performance', () => {
    it('should efficiently manage loading states', async () => {
      mockApiService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          user: { id: 1, email: 'test@example.com' },
          token: { access_token: 'token123' }
        }), 100))
      );

      const { result } = renderHook(() => useAuthWithRetry(), { wrapper });

      // Measure time to set loading state
      performanceTracker.start();
      
      act(() => {
        result.current.loginWithRetry('test@example.com', 'password');
      });

      const loadingSetDuration = performanceTracker.stop();

      // Loading state should be set immediately
      expect(loadingSetDuration).toBeLessThan(10);
      expect(store.getState().auth.isLoading).toBe(true);

      // Complete the request
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(store.getState().auth.isLoading).toBe(false);
    });

    it('should handle rapid state changes efficiently', async () => {
      const stateChanges: any[] = [];
      
      // Subscribe to state changes
      const unsubscribe = store.subscribe(() => {
        stateChanges.push({
          timestamp: Date.now(),
          state: store.getState().auth
        });
      });

      mockApiService.login.mockResolvedValue({
        user: { id: 1, email: 'test@example.com' },
        token: { access_token: 'token123' }
      });

      const { result } = renderHook(() => useAuthWithRetry(), { wrapper });

      performanceTracker.start();

      await act(async () => {
        await result.current.loginWithRetry('test@example.com', 'password');
      });

      const totalDuration = performanceTracker.stop();

      // Should complete quickly with minimal state changes
      expect(totalDuration).toBeLessThan(50);
      expect(stateChanges.length).toBeLessThan(10); // Reasonable number of state updates

      unsubscribe();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not create memory leaks with multiple auth attempts', async () => {
      const initialMemoryUsage = process.memoryUsage();

      // Perform multiple auth operations
      for (let i = 0; i < 50; i++) {
        mockApiService.login.mockResolvedValue({
          user: { id: i, email: `test${i}@example.com` },
          token: { access_token: `token${i}` }
        });

        const { result } = renderHook(() => useAuthWithRetry(), { wrapper });

        await act(async () => {
          await result.current.loginWithRetry(`test${i}@example.com`, 'password');
        });
      }

      const finalMemoryUsage = process.memoryUsage();
      const memoryIncrease = finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;

      // Memory increase should be reasonable (less than 10MB for 50 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up timers and resources properly', async () => {
      const activeTimers: any[] = [];
      
      // Mock setTimeout to track active timers
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        const timerId = originalSetTimeout(callback, delay);
        activeTimers.push(timerId);
        return timerId;
      }) as any;

      global.clearTimeout = jest.fn((timerId) => {
        const index = activeTimers.indexOf(timerId);
        if (index > -1) {
          activeTimers.splice(index, 1);
        }
        return originalClearTimeout(timerId);
      }) as any;

      mockApiService.login.mockRejectedValue({ response: { status: 500 } });

      const retryableFunction = withRetry(mockApiService.login, {
        maxAttempts: 3,
        baseDelay: 1000
      });

      try {
        await act(async () => {
          await retryableFunction('test@example.com', 'password');
        });
      } catch (error) {
        // Expected to fail
      }

      // All timers should be cleaned up
      expect(activeTimers.length).toBe(0);

      // Restore original functions
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    });
  });
});