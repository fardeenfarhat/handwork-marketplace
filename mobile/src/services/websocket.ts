import { Message } from '@/types';

interface WebSocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'user_status';
  data: any;
}

interface TypingData {
  userId: number;
  jobId: number;
  isTyping: boolean;
}

interface ReadReceiptData {
  messageId: number;
  userId: number;
}

interface UserStatusData {
  userId: number;
  isOnline: boolean;
  lastSeen?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private token: string | null = null;
  private listeners: { [key: string]: Function[] } = {};

  setToken(token: string | null) {
    this.token = token;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = __DEV__ 
      ? 'ws://192.168.18.19:8000/ws' 
      : 'wss://your-production-api.com/ws';

    try {
      this.ws = new WebSocket(`${wsUrl}?token=${this.token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'message':
        this.emit('message', message.data as Message);
        break;
      case 'typing':
        this.emit('typing', message.data as TypingData);
        break;
      case 'read_receipt':
        this.emit('read_receipt', message.data as ReadReceiptData);
        break;
      case 'user_status':
        this.emit('user_status', message.data as UserStatusData);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Send a message
  sendMessage(message: Omit<Message, 'id' | 'createdAt' | 'isRead'>) {
    this.send({
      type: 'message',
      data: message,
    });
  }

  // Send typing indicator
  sendTyping(jobId: number, isTyping: boolean) {
    this.send({
      type: 'typing',
      data: { jobId, isTyping },
    });
  }

  // Send read receipt
  sendReadReceipt(messageId: number) {
    this.send({
      type: 'read_receipt',
      data: { messageId },
    });
  }

  private send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;