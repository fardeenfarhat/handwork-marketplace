import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/utils/constants';

interface MessageAttachmentProps {
  attachment: string;
  onPress?: (attachment: string) => void;
  style?: any;
}

export default function MessageAttachment({ 
  attachment, 
  onPress,
  style 
}: MessageAttachmentProps) {
  const isImage = attachment.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
  const isPdf = attachment.toLowerCase().endsWith('.pdf');
  const isDoc = attachment.toLowerCase().match(/\.(doc|docx)$/);
  const fileName = attachment.split('/').pop() || 'Unknown file';

  const handlePress = () => {
    if (onPress) {
      onPress(attachment);
    } else {
      // Default behavior - try to open the file
      handleDefaultOpen();
    }
  };

  const handleDefaultOpen = async () => {
    try {
      const supported = await Linking.canOpenURL(attachment);
      if (supported) {
        await Linking.openURL(attachment);
      } else {
        Alert.alert('Error', 'Cannot open this file type');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const getFileIcon = () => {
    if (isImage) return 'image';
    if (isPdf) return 'document-text';
    if (isDoc) return 'document';
    return 'attach';
  };

  const getFileTypeColor = () => {
    if (isImage) return COLORS.success;
    if (isPdf) return COLORS.danger;
    if (isDoc) return COLORS.primary;
    return COLORS.textSecondary;
  };

  if (isImage) {
    return (
      <TouchableOpacity
        style={[styles.imageContainer, style]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: attachment }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <Ionicons name="expand" size={20} color={COLORS.background} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.fileContainer, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.fileIcon, { backgroundColor: getFileTypeColor() }]}>
        <Ionicons name={getFileIcon()} size={24} color={COLORS.background} />
      </View>
      
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>
        <Text style={styles.fileType}>
          {isImage ? 'Image' : isPdf ? 'PDF Document' : isDoc ? 'Word Document' : 'File'}
        </Text>
      </View>
      
      <Ionicons name="download" size={20} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 150,
  },
  imageOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.xs,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 200,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  fileInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  fileName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  fileType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});