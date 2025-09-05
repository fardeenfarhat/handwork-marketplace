import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/utils/constants';
import { formatRelativeTime } from '@/utils/helpers';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onAttachmentPress?: (attachment: string) => void;
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  onAttachmentPress 
}: MessageBubbleProps) {
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    return message.attachments.map((attachment, index) => (
      <TouchableOpacity
        key={index}
        style={styles.attachmentItem}
        onPress={() => onAttachmentPress?.(attachment)}
      >
        {attachment.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
          <Image 
            source={{ uri: attachment }} 
            style={styles.attachmentImage} 
            testID="attachment-image"
          />
        ) : (
          <View style={styles.fileAttachment}>
            <Ionicons name="document" size={24} color={COLORS.primary} />
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.split('/').pop() || 'File'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    ));
  };

  return (
    <View 
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}
      testID="message-container"
    >
      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        {message.content ? (
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
        ) : null}
        
        <View style={[styles.attachmentsContainer, { marginTop: message.content ? SPACING.sm : 0 }]}>
          {renderAttachments()}
        </View>
        
        <View style={styles.messageFooter}>
          <Text style={[
            styles.timestamp,
            isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
          ]}>
            {formatRelativeTime(message.createdAt)}
          </Text>
          
          {isOwnMessage && (
            <Ionicons
              name={message.isRead ? "checkmark-done" : "checkmark"}
              size={16}
              color={message.isRead ? COLORS.primary : COLORS.textTertiary}
              style={styles.readStatus}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
  },
  otherBubble: {
    backgroundColor: COLORS.backgroundTertiary,
  },
  messageText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.base,
  },
  ownMessageText: {
    color: COLORS.background,
  },
  otherMessageText: {
    color: COLORS.textPrimary,
  },
  attachmentsContainer: {
    marginTop: SPACING.sm,
  },
  attachmentItem: {
    marginBottom: SPACING.xs,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: BORDER_RADIUS.md,
    resizeMode: 'cover',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileName: {
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
    flex: 1,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  timestamp: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  ownTimestamp: {
    color: COLORS.background,
    opacity: 0.8,
  },
  otherTimestamp: {
    color: COLORS.textTertiary,
  },
  readStatus: {
    marginLeft: SPACING.xs,
  },
});