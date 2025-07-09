import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthUtils = {
  /**
   * Get the stored authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  /**
   * Store authentication token
   */
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('userToken', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  },

  /**
   * Remove authentication token
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('userToken');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  },

  /**
   * Get authorization headers for API requests
   */
  async getAuthHeaders(): Promise<{ [key: string]: string }> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
};