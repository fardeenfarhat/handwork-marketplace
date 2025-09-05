import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

export class ClipboardService {
  /**
   * Copy text to clipboard with haptic feedback and user notification
   */
  static async copyToClipboard(text: string, showAlert: boolean = true): Promise<void> {
    try {
      await Clipboard.setStringAsync(text);
      
      // Provide haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (showAlert) {
        Alert.alert('Copied!', 'Text copied to clipboard');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      if (showAlert) {
        Alert.alert('Error', 'Failed to copy to clipboard');
      }
      throw error;
    }
  }

  /**
   * Get text from clipboard
   */
  static async getFromClipboard(): Promise<string> {
    try {
      return await Clipboard.getStringAsync();
    } catch (error) {
      console.error('Error reading from clipboard:', error);
      return '';
    }
  }

  /**
   * Check if clipboard has text
   */
  static async hasText(): Promise<boolean> {
    try {
      const text = await Clipboard.getStringAsync();
      return text.length > 0;
    } catch (error) {
      console.error('Error checking clipboard:', error);
      return false;
    }
  }

  /**
   * Copy job link with formatted message
   */
  static async copyJobLink(jobId: number, jobTitle: string): Promise<void> {
    const url = `https://handwork-marketplace.com/jobs/${jobId}`;
    const message = `Check out this job: ${jobTitle}\n${url}`;
    await this.copyToClipboard(message);
  }

  /**
   * Copy profile link with formatted message
   */
  static async copyProfileLink(userId: number, userName: string): Promise<void> {
    const url = `https://handwork-marketplace.com/profile/${userId}`;
    const message = `Check out ${userName}'s profile on Handwork Marketplace\n${url}`;
    await this.copyToClipboard(message);
  }

  /**
   * Copy booking tracking link
   */
  static async copyBookingLink(bookingId: number): Promise<void> {
    const url = `https://handwork-marketplace.com/payments/tracking/${bookingId}`;
    const message = `Track your booking: ${url}`;
    await this.copyToClipboard(message);
  }
}