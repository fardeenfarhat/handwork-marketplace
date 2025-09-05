import React from 'react';
import { TouchableOpacity, Alert, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClipboardService } from '../../utils/clipboard';
import { HapticService } from '../../utils/haptics';

interface ShareButtonProps {
  type: 'job' | 'profile' | 'booking';
  id: number;
  title?: string;
  userName?: string;
  style?: ViewStyle;
  size?: number;
  color?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  type,
  id,
  title,
  userName,
  style,
  size = 24,
  color = '#007AFF',
}) => {
  const handleShare = async () => {
    try {
      await HapticService.light();
      
      switch (type) {
        case 'job':
          if (title) {
            await ClipboardService.copyJobLink(id, title);
          } else {
            Alert.alert('Error', 'Job title is required for sharing');
          }
          break;
        
        case 'profile':
          if (userName) {
            await ClipboardService.copyProfileLink(id, userName);
          } else {
            Alert.alert('Error', 'User name is required for sharing');
          }
          break;
        
        case 'booking':
          await ClipboardService.copyBookingLink(id);
          break;
        
        default:
          Alert.alert('Error', 'Invalid share type');
          return;
      }
      
      await HapticService.success();
    } catch (error) {
      console.error('Error sharing:', error);
      await HapticService.error();
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.shareButton, style]}
      onPress={handleShare}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="share-outline" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});