import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Message } from '../../services/FirebaseMessagingService';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onLongPress?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  onLongPress,
}) => {
  const handleAttachmentPress = (url: string, fileName: string) => {
    Alert.alert(
      'Open Attachment',
      `Do you want to open ${fileName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            Linking.openURL(url).catch((error) => {
              console.error('Error opening attachment:', error);
              Alert.alert('Error', 'Could not open attachment');
            });
          },
        },
      ]
    );
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    return (
      <View style={styles.attachmentsContainer}>
        {message.attachments.map((attachment, index) => (
          <TouchableOpacity
            key={index}
            style={styles.attachmentItem}
            onPress={() => handleAttachmentPress(attachment.url, attachment.fileName)}
          >
            {attachment.type === 'image' ? (
              <Image
                source={{ uri: attachment.url }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.fileAttachment}>
                <Text style={styles.fileIcon}>📄</Text>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {attachment.fileName}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(attachment.fileSize)}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.bubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}
      >
        {message.isModerated && (
          <View style={styles.moderationWarning}>
            <Text style={styles.moderationText}>⚠️ This message was moderated</Text>
          </View>
        )}

        {renderAttachments()}

        {message.content && (
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {message.content}
          </Text>
        )}

        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.timestamp,
              isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp,
            ]}
          >
            {format(message.timestamp, 'HH:mm')}
          </Text>
          
          {isCurrentUser && (
            <Text
              style={[
                styles.readStatus,
                message.isRead ? styles.readStatusRead : styles.readStatusUnread,
              ]}
            >
              {message.isRead ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  currentUserContainer: {
    alignItems: 'flex-end',
  },
  otherUserContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  currentUserBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  moderationWarning: {
    backgroundColor: '#FFF3CD',
    padding: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  moderationText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  attachmentsContainer: {
    marginBottom: 8,
  },
  attachmentItem: {
    marginBottom: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    marginRight: 4,
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTimestamp: {
    color: '#666',
  },
  readStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  readStatusRead: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  readStatusUnread: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default MessageBubble;