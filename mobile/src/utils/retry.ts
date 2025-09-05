import { RETRY_CONFIG, API_CONFIG } from '@/config/api';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: any;

  constructor(message: string, attempts: number, lastError: any) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = RETRY_CONFIG.maxAttempts,
    baseDelay = RETRY_CONFIG.baseDelay,
    maxDelay = RETRY_CONFIG.maxDelay,
    backoffFactor = RETRY_CONFIG.backoffFactor,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.log(`❌ Attempt ${attempt} failed:`, error?.message);
      
      // Don't retry on the last attempt or if error shouldn't be retried
      if (attempt === maxAttempts || !shouldRetry(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new RetryError(
    API_CONFIG.ERROR_MESSAGES.RETRY_FAILED,
    maxAttempts,
    lastError
  );
}

function defaultShouldRetry(error: any): boolean {
  // Retry on network errors, timeouts, and 5xx server errors
  if (error?.name === 'AbortError') {
    return true; // Timeout
  }
  
  if (error?.message?.toLowerCase().includes('network')) {
    return true; // Network error
  }
  
  if (error?.response?.status >= 500) {
    return true; // Server error
  }
  
  // Don't retry on 4xx client errors (except 408 timeout and 429 rate limit)
  if (error?.response?.status >= 400 && error?.response?.status < 500) {
    return error?.response?.status === 408 || error?.response?.status === 429;
  }
  
  return false;
}

export { defaultShouldRetry };