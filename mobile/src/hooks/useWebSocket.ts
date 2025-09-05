import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'react-native';

import websocketService from '../services/websocketService';
import { RootState } from '../store';
import { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onJobUpdate?: (data: any) => void;
  onBookingUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
  onTyping?: (data: any) => void;
  onReadReceipt?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const appStateRef = useRef(AppState.currentState);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    onMessage,
    onJobUpdate,
    onBookingUpdate,
    onNotification,
    onTyping,
    onReadReceipt,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  // Connect to WebSocket when user is authenticated
  const connect = useCallback(async () => {
    if (user && token) {
      try {
        await websocketService.connect(user.id, token);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        onError?.(error);
      }
    }
  }, [user, token, onError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (onMessage) {
      websocketService.on('message', onMessage);
    }
    if (onJobUpdate) {
      websocketService.on('jobUpdate', onJobUpdate);
    }
    if (onBookingUpdate) {
      websocketService.on('bookingUpdate', onBookingUpdate);
    }
    if (onNotification) {
      websocketService.on('notification', onNotification);
    }
    if (onTyping) {
      websocketService.on('typing', onTyping);
    }
    if (onReadReceipt) {
      websocketService.on('readReceipt', onReadReceipt);
    }
    if (onConnected) {
      websocketService.on('connected', onConnected);
    }
    if (onDisconnected) {
      websocketService.on('disconnected', onDisconnected);
    }
    if (onError) {
      websocketService.on('error', onError);
    }

    return () => {
      // Cleanup listeners
      if (onMessage) {
        websocketService.off('message', onMessage);
      }
      if (onJobUpdate) {
        websocketService.off('jobUpdate', onJobUpdate);
      }
      if (onBookingUpdate) {
        websocketService.off('bookingUpdate', onBookingUpdate);
      }
      if (onNotification) {
        websocketService.off('notification', onNotification);
      }
      if (onTyping) {
        websocketService.off('typing', onTyping);
      }
      if (onReadReceipt) {
        websocketService.off('readReceipt', onReadReceipt);
      }
      if (onConnected) {
        websocketService.off('connected', onConnected);
      }
      if (onDisconnected) {
        websocketService.off('disconnected', onDisconnected);
      }
      if (onError) {
        websocketService.off('error', onError);
      }
    };
  }, [
    onMessage,
    onJobUpdate,
    onBookingUpdate,
    onNotification,
    onTyping,
    onReadReceipt,
    onConnected,
    onDisconnected,
    onError,
  ]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, reconnect if needed
        if (user && token && !websocketService.isConnected()) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 1000);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [user, token, connect]);

  // Connect when user is authenticated
  useEffect(() => {
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect]);

  // WebSocket utility methods
  const sendMessage = useCallback(
    (receiverId: number, jobId: number, content: string, attachments: string[] = []) => {
      websocketService.sendMessage(receiverId, jobId, content, attachments);
    },
    []
  );

  const sendTypingIndicator = useCallback(
    (receiverId: number, jobId: number, isTyping: boolean) => {
      websocketService.sendTypingIndicator(receiverId, jobId, isTyping);
    },
    []
  );

  const sendReadReceipt = useCallback((messageId: number, senderId: number) => {
    websocketService.sendReadReceipt(messageId, senderId);
  }, []);

  const isConnected = useCallback(() => {
    return websocketService.isConnected();
  }, []);

  const getConnectionState = useCallback(() => {
    return websocketService.getConnectionState();
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    isConnected,
    getConnectionState,
  };
};

export default useWebSocket;