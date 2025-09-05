import { API_CONFIG, RETRY_CONFIG } from '@/config/api';

describe('API Configuration', () => {
  it('should have correct timeout configuration', () => {
    expect(API_CONFIG.REQUEST_TIMEOUT).toBe(15000); // 15 seconds
    expect(API_CONFIG.RETRY_ATTEMPTS).toBe(3);
    expect(API_CONFIG.RETRY_DELAY).toBe(1000); // 1 second
  });

  it('should have proper error messages', () => {
    expect(API_CONFIG.ERROR_MESSAGES.TIMEOUT).toContain('timed out');
    expect(API_CONFIG.ERROR_MESSAGES.NETWORK).toContain('Network');
    expect(API_CONFIG.ERROR_MESSAGES.RETRY_FAILED).toContain('multiple attempts');
  });

  it('should have correct retry configuration', () => {
    expect(RETRY_CONFIG.maxAttempts).toBe(3);
    expect(RETRY_CONFIG.baseDelay).toBe(1000);
    expect(RETRY_CONFIG.maxDelay).toBe(10000);
    expect(RETRY_CONFIG.backoffFactor).toBe(2);
  });
});