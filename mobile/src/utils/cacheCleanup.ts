import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/services/storage';

/**
 * Utility to clean up corrupted cache data that might cause JSON parsing errors
 */
export class CacheCleanup {
  /**
   * Clear all potentially corrupted cache data
   */
  static async clearAllCache(): Promise<void> {
    try {
      console.log('🧹 Starting cache cleanup...');

      // Clear AsyncStorage cache items
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.includes('cache') || 
        key.includes('Cache') ||
        key.includes('CACHE') ||
        key.includes('notification')
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Removed ${cacheKeys.length} AsyncStorage cache items`);
      }

      // Clear secure storage cache items
      const secureStorageKeys = [
        'cached_jobs',
        'cached_users', 
        'cached_messages',
        'cached_bookings',
        'cached_reviews',
        'pending_sync'
      ];

      for (const key of secureStorageKeys) {
        try {
          await secureStorage.removeItem(key);
        } catch (error) {
          // Ignore errors for non-existent keys
        }
      }

      console.log('✅ Cache cleanup completed');
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  /**
   * Check and fix corrupted JSON data in storage
   */
  static async validateAndFixStorageData(): Promise<void> {
    try {
      console.log('🔍 Validating storage data...');

      const allKeys = await AsyncStorage.getAllKeys();
      let fixedCount = 0;

      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value === 'undefined' || value === null) {
            await AsyncStorage.removeItem(key);
            fixedCount++;
          } else if (value) {
            // Try to parse as JSON to validate
            try {
              JSON.parse(value);
            } catch (parseError) {
              // If it's not valid JSON and not a simple string, remove it
              if (value.startsWith('{') || value.startsWith('[')) {
                await AsyncStorage.removeItem(key);
                fixedCount++;
                console.log(`🔧 Fixed corrupted JSON in key: ${key}`);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not validate key ${key}:`, error);
        }
      }

      if (fixedCount > 0) {
        console.log(`✅ Fixed ${fixedCount} corrupted storage items`);
      } else {
        console.log('✅ No corrupted storage data found');
      }
    } catch (error) {
      console.error('❌ Storage validation failed:', error);
    }
  }
}
