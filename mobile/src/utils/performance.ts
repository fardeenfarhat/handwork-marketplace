/**
 * Mobile app performance optimization utilities
 */
import { InteractionManager, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private static instance: PerformanceTracker;

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  startTimer(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata,
    });
  }

  endTimer(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    console.log(`Performance: ${name} took ${duration}ms`);
    return duration;
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

export const performanceTracker = PerformanceTracker.getInstance();

// Image optimization utilities
export class ImageOptimizer {
  static getOptimalImageSize(originalWidth: number, originalHeight: number, maxSize: number = 800): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth > originalHeight) {
      return {
        width: Math.min(originalWidth, maxSize),
        height: Math.min(originalWidth, maxSize) / aspectRatio,
      };
    } else {
      return {
        width: Math.min(originalHeight, maxSize) * aspectRatio,
        height: Math.min(originalHeight, maxSize),
      };
    }
  }

  static getImageUri(uri: string, width?: number, height?: number): string {
    if (!width && !height) return uri;
    
    // Add resize parameters to image URI
    const separator = uri.includes('?') ? '&' : '?';
    const params = [];
    
    if (width) params.push(`w=${width}`);
    if (height) params.push(`h=${height}`);
    
    return `${uri}${separator}${params.join('&')}`;
  }
}

// Memory management utilities
export class MemoryManager {
  private static imageCache = new Map<string, any>();
  private static maxCacheSize = 50;

  static cacheImage(uri: string, imageData: any): void {
    if (this.imageCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    
    this.imageCache.set(uri, imageData);
  }

  static getCachedImage(uri: string): any | null {
    return this.imageCache.get(uri) || null;
  }

  static clearImageCache(): void {
    this.imageCache.clear();
  }

  static getMemoryUsage(): { cacheSize: number; maxSize: number } {
    return {
      cacheSize: this.imageCache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Lazy loading utilities
export const withLazyLoading = <T extends object>(
  Component: React.ComponentType<T>
): React.ComponentType<T> => {
  return (props: T) => {
    const [isReady, setIsReady] = React.useState(false);

    React.useEffect(() => {
      InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
    }, []);

    if (!isReady) {
      return null; // or a loading placeholder
    }

    return <Component {...props} />;
  };
};

// Debounce utility for search and input
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Screen size utilities
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

export const isTablet = (): boolean => {
  const { width, height } = getScreenDimensions();
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  return minDimension >= 600 && maxDimension >= 900;
};

// Storage optimization
export class StorageOptimizer {
  private static readonly CACHE_PREFIX = 'cache_';
  private static readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  static async setCache(key: string, data: any, ttl?: number): Promise<void> {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.MAX_CACHE_AGE,
    };
    
    try {
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  static async getCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached || cached === 'undefined') return null;

      try {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        
        if (now - cacheData.timestamp > cacheData.ttl) {
          // Cache expired
          await this.removeCache(key);
          return null;
        }

        return cacheData.data;
      } catch (error) {
        console.warn('Failed to get cache:', error);
        return null;
      }
  }

  static async removeCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to remove cache:', error);
    }
  }

  static async clearExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      const now = Date.now();

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached && cached !== 'undefined') {
          try {
            const cacheData = JSON.parse(cached);
            if (now - cacheData.timestamp > cacheData.ttl) {
              await AsyncStorage.removeItem(key);
            }
          } catch (error) {
            console.warn('Failed to parse cache data, removing:', key);
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }
}

// Bundle size optimization - code splitting helper
export const loadComponent = <T>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>
): React.ComponentType<T> => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props: T) => (
    <React.Suspense fallback={<div>Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    performanceTracker.startTimer(`${componentName}_mount`);
    
    return () => {
      performanceTracker.endTimer(`${componentName}_mount`);
    };
  }, [componentName]);

  const trackAction = React.useCallback((actionName: string) => {
    performanceTracker.startTimer(`${componentName}_${actionName}`);
    
    return () => {
      performanceTracker.endTimer(`${componentName}_${actionName}`);
    };
  }, [componentName]);

  return { trackAction };
};