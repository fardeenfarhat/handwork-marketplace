import { withRetry, RetryError, defaultShouldRetry } from '@/utils/retry';

// Mock setTimeout to make tests run faster
jest.useFakeTimers();

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should succeed on first attempt', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    const result = await withRetry(mockOperation, { maxAttempts: 3 });
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const promise = withRetry(mockOperation, { 
      maxAttempts: 3,
      baseDelay: 100
    });
    
    // Fast-forward timers to resolve delays
    jest.runAllTimers();
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should throw RetryError after max attempts', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const promise = withRetry(mockOperation, { 
      maxAttempts: 2,
      baseDelay: 100
    });
    
    jest.runAllTimers();
    
    await expect(promise).rejects.toThrow(RetryError);
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  describe('defaultShouldRetry', () => {
    it('should retry on timeout errors', () => {
      const timeoutError = { name: 'AbortError' };
      expect(defaultShouldRetry(timeoutError)).toBe(true);
    });

    it('should retry on network errors', () => {
      const networkError = { message: 'Network error occurred' };
      expect(defaultShouldRetry(networkError)).toBe(true);
    });

    it('should retry on 5xx server errors', () => {
      const serverError = { response: { status: 500 } };
      expect(defaultShouldRetry(serverError)).toBe(true);
    });

    it('should retry on 408 timeout', () => {
      const timeoutError = { response: { status: 408 } };
      expect(defaultShouldRetry(timeoutError)).toBe(true);
    });

    it('should retry on 429 rate limit', () => {
      const rateLimitError = { response: { status: 429 } };
      expect(defaultShouldRetry(rateLimitError)).toBe(true);
    });

    it('should not retry on 4xx client errors (except 408, 429)', () => {
      const clientError = { response: { status: 400 } };
      expect(defaultShouldRetry(clientError)).toBe(false);
    });

    it('should not retry on authentication errors', () => {
      const authError = { response: { status: 401 } };
      expect(defaultShouldRetry(authError)).toBe(false);
    });
  });
});