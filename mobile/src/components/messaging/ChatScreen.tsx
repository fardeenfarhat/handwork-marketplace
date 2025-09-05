import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MessageBubble, MessageInput, TypingIndicator } from '@/components/messaging';
import { useMessaging } from '@/hooks/useMessaging';
import { Message } from '@/types';
import { COLORS } from '@/utils/constants';

interface ChatScreenProps {
  jobId: number;
  currentUserId: number;
  otherUserName?: string;
  otherUserId?: number;
  onSendMessage?: (message: Message) => void;
}

export default function ChatScreen({
  jobId,
  currentUserId,
  otherUserName = 'User',
  otherUserId = 0,
  onSendMessage,
}: ChatScreenProps) {
  const flatListRef = useRef<FlatList>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const {
    getConversationMessages,
    loadMessages,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    isUserTyping,
    isLoading,
  } = useMessaging();

  // Get messages for this conversation
  const messages = getConversationMessages(jobId);
  const otherUserTyping = isUserTyping(jobId, otherUserId);

  // Load messages when component mounts
  useEffect(() => {
    loadMessages(jobId);
  }, [jobId, loadMessages]);

  // Mark conversation as read when component mounts or messages change
  useEffect(() => {
    markAsRead(jobId);
  }, [jobId, markAsRead, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async (content: string, attachments?: string[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return;
    }

    try {
      const sentMessage = await sendMessage(jobId, otherUserId, content, attachments);
      onSendMessage?.(sentMessage.payload as Message);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleTyping = (typing: boolean) => {
    setIsTyping(typing);
    sendTypingIndicator(jobId, typing);
  };

  const handleAttachmentPress = (attachment: string) => {
    // Handle attachment viewing/downloading
    Alert.alert('Attachment', `Open: ${attachment}`);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === currentUserId;
    
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        onAttachmentPress={handleAttachmentPress}
      />
    );
  };

  const renderFooter = () => {
    if (otherUserTyping) {
      return <TypingIndicator isVisible={true} userName={otherUserName} />;
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />
      
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={isLoading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesList: {
    paddingVertical: 16,
  },
});