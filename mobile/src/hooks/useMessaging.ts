import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  addMessage,
  setTypingStatus,
  setUserOnlineStatus,
  markConversationAsRead,
} from '@/store/slices/messageSlice';
import webSocketService from '@/services/websocket';
import notificationService from '@/services/notifications';
import { Message } from '@/types';

export const useMessaging = () => {
  const dispatch = useDispatch();
  const {
    conversations,
    conversationsList,
    typingStatus,
    isLoading,
    error,
    searchResults,
    isSearching,
  } = useSelector((state: RootState) => state.messages);
  
  const { user, token } = useSelector((state: RootState) => state.auth);

  // Initialize WebSocket connection
  useEffect(() => {
    if (token && user) {
      webSocketService.setToken(token);
      webSocketService.connect();

      // Set up WebSocket event listeners
      const handleNewMessage = (message: Message) => {
        dispatch(addMessage({ jobId: message.jobId.toString(), message }));
        
        // Show notification if app is in background
        if (message.senderId !== user.id) {
          notificationService.scheduleLocalNotification(
            'New Message',
            message.content || 'You received a new message',
            {
              type: 'message',
              jobId: message.jobId,
              messageId: message.id,
              userId: message.senderId,
            }
          );
        }
      };

      const handleTyping = (data: { userId: number; jobId: number; isTyping: boolean }) => {
        if (data.userId !== user.id) {
          dispatch(setTypingStatus({
            jobId: data.jobId.toString(),
            userId: data.userId.toString(),
            isTyping: data.isTyping,
          }));
        }
      };

      const handleUserStatus = (data: { userId: number; isOnline: boolean }) => {
        dispatch(setUserOnlineStatus(data));
      };

      webSocketService.on('message', handleNewMessage);
      webSocketService.on('typing', handleTyping);
      webSocketService.on('user_status', handleUserStatus);

      return () => {
        webSocketService.off('message', handleNewMessage);
        webSocketService.off('typing', handleTyping);
        webSocketService.off('user_status', handleUserStatus);
        webSocketService.disconnect();
      };
    }
  }, [token, user, dispatch]);

  // Load conversations
  const loadConversations = useCallback(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  // Load messages for a specific job
  const loadMessages = useCallback((jobId: number) => {
    dispatch(fetchMessages(jobId));
  }, [dispatch]);

  // Send a message
  const sendMessageToJob = useCallback(async (
    jobId: number,
    receiverId: number,
    content: string,
    attachments?: string[]
  ) => {
    try {
      const result = await dispatch(sendMessage({
        jobId,
        receiverId,
        content,
        attachments,
      }));
      
      // Send via WebSocket for real-time delivery
      if (webSocketService.isConnected()) {
        webSocketService.sendMessage({
          senderId: user?.id || 0,
          receiverId,
          jobId,
          content,
          attachments: attachments || [],
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [dispatch, user]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((jobId: number, isTyping: boolean) => {
    if (webSocketService.isConnected()) {
      webSocketService.sendTyping(jobId, isTyping);
    }
  }, []);

  // Mark conversation as read
  const markAsRead = useCallback((jobId: number) => {
    dispatch(markConversationAsRead(jobId.toString()));
  }, [dispatch]);

  // Get unread count for a conversation
  const getUnreadCount = useCallback((jobId: number) => {
    const conversation = conversationsList.find(conv => conv.jobId === jobId);
    return conversation?.unreadCount || 0;
  }, [conversationsList]);

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    return conversationsList.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversationsList]);

  // Check if someone is typing in a conversation
  const isUserTyping = useCallback((jobId: number, userId: number) => {
    return typingStatus[jobId.toString()]?.[userId.toString()] || false;
  }, [typingStatus]);

  // Get messages for a conversation
  const getConversationMessages = useCallback((jobId: number) => {
    return conversations[jobId.toString()] || [];
  }, [conversations]);

  // Check if user is online
  const isUserOnline = useCallback((userId: number) => {
    const conversation = conversationsList.find(conv => conv.otherUserId === userId);
    return conversation?.isOnline || false;
  }, [conversationsList]);

  return {
    // State
    conversations,
    conversationsList,
    isLoading,
    error,
    searchResults,
    isSearching,
    
    // Actions
    loadConversations,
    loadMessages,
    sendMessage: sendMessageToJob,
    sendTypingIndicator,
    markAsRead,
    
    // Getters
    getUnreadCount,
    getTotalUnreadCount,
    isUserTyping,
    getConversationMessages,
    isUserOnline,
    
    // WebSocket status
    isConnected: webSocketService.isConnected(),
  };
};