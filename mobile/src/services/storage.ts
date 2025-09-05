import * as SecureStore from 'expo-secure-store';

class SecureStorage {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error storing secure item:', error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing secure item:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear all auth-related items
      const keys = ['access_token', 'refresh_token', 'user_data'];
      await Promise.all(keys.map(key => this.removeItem(key)));
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      throw error;
    }
  }
}

export const secureStorage = new SecureStorage();
export default secureStorage;