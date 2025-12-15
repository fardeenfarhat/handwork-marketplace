import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: Date;
  isRead: boolean;
  attachments?: MessageAttachment[];
  jobId?: string;
  moderationFlags?: string[];
  isModerated?: boolean;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    timestamp: Date;
    type: string;
  };
  updatedAt: Date;
  unreadCount: { [userId: string]: number };
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastActive: Date;
}

class FirebaseMessagingService {
  private currentUserId: string | null = null;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeAuth();
    this.setupFCM();
  }

  private initializeAuth() {
    auth().onAuthStateChanged((user) => {
      this.currentUserId = user?.uid || null;
      if (user) {
        this.updatePresence(true);
      }
    });
  }

  private async setupFCM() {
    // Request permission for notifications
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Get FCM token and save to user document
      const token = await messaging().getToken();
      if (this.currentUserId && token) {
        await this.saveFCMToken(token);
      }

      // Listen for token refresh
      messaging().onTokenRefresh(async (token) => {
        if (this.currentUserId) {
          await this.saveFCMToken(token);
        }
      });
    }
  }

  private async saveFCMToken(token: string) {
    if (!this.currentUserId) return;

    try {
      await firestore()
        .collection('users')
        .doc(this.currentUserId)
        .update({
          fcmToken: token,
          platform: Platform.OS,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  /**
   * Send a new message
   */
  async sendMessage(
    receiverId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    attachments?: MessageAttachment[],
    jobId?: string
  ): Promise<string> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const conversationId = this.generateConversationId(this.currentUserId, receiverId);
    
    const messageData: Omit<Message, 'id'> = {
      senderId: this.currentUserId,
      receiverId,
      conversationId,
      content,
      type,
      timestamp: new Date(),
      isRead: false,
      attachments: attachments || [],
      jobId,
    };

    const docRef = await firestore()
      .collection('messages')
      .add({
        ...messageData,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

    return docRef.id;
  }

  /**
   * Get messages for a conversation
   */
  getMessages(
    otherUserId: string,
    limit: number = 50,
    lastMessage?: Message
  ) {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const conversationId = this.generateConversationId(this.currentUserId, otherUserId);
    
    let query = firestore()
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (lastMessage) {
      query = query.startAfter(lastMessage.timestamp);
    }

    return query.onSnapshot((snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Message);
      });
      return messages.reverse(); // Show oldest first
    });
  }

  /**
   * Get user's conversations
   */
  getConversations() {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    return firestore()
      .collection('conversations')
      .where('participants', 'array-contains', this.currentUserId)
      .orderBy('updatedAt', 'desc')
      .onSnapshot((snapshot) => {
        const conversations: Conversation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          conversations.push({
            id: doc.id,
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastMessage: data.lastMessage ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
            } : undefined,
          } as Conversation);
        });
        return conversations;
      });
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    await firestore()
      .collection('messages')
      .doc(messageId)
      .update({
        isRead: true,
        readAt: firestore.FieldValue.serverTimestamp(),
      });
  }

  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(otherUserId: string): Promise<void> {
    if (!this.currentUserId) return;

    const conversationId = this.generateConversationId(this.currentUserId, otherUserId);
    
    const unreadMessages = await firestore()
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .where('receiverId', '==', this.currentUserId)
      .where('isRead', '==', false)
      .get();

    const batch = firestore().batch();
    unreadMessages.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(otherUserId: string, isTyping: boolean): Promise<void> {
    if (!this.currentUserId) return;

    const conversationId = this.generateConversationId(this.currentUserId, otherUserId);
    const typingId = `${conversationId}_${this.currentUserId}`;

    if (isTyping) {
      await firestore()
        .collection('typing')
        .doc(typingId)
        .set({
          userId: this.currentUserId,
          conversationId,
          isTyping: true,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      // Auto-clear typing indicator after 3 seconds
      const existingTimeout = this.typingTimeouts.get(typingId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        this.sendTypingIndicator(otherUserId, false);
      }, 3000);

      this.typingTimeouts.set(typingId, timeout);
    } else {
      await firestore()
        .collection('typing')
        .doc(typingId)
        .delete();

      const timeout = this.typingTimeouts.get(typingId);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(typingId);
      }
    }
  }

  /**
   * Listen to typing indicators for a conversation
   */
  listenToTypingIndicators(otherUserId: string, callback: (isTyping: boolean) => void) {
    if (!this.currentUserId) return () => {};

    const conversationId = this.generateConversationId(this.currentUserId, otherUserId);
    const typingId = `${conversationId}_${otherUserId}`;

    return firestore()
      .collection('typing')
      .doc(typingId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          callback(data?.isTyping || false);
        } else {
          callback(false);
        }
      });
  }

  /**
   * Upload file attachment
   */
  async uploadAttachment(
    uri: string,
    fileName: string,
    mimeType: string
  ): Promise<MessageAttachment> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    const fileExtension = fileName.split('.').pop() || '';
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `message-attachments/${this.currentUserId}/${uniqueFileName}`;

    // Upload file
    const reference = storage().ref(storagePath);
    await reference.putFile(uri);

    // Get download URL
    const downloadURL = await reference.getDownloadURL();

    // Get file metadata
    const metadata = await reference.getMetadata();

    return {
      id: uniqueFileName,
      type: mimeType.startsWith('image/') ? 'image' : 'file',
      url: downloadURL,
      fileName,
      fileSize: metadata.size || 0,
      mimeType,
    };
  }

  /**
   * Update user presence
   */
  async updatePresence(isOnline: boolean): Promise<void> {
    if (!this.currentUserId) return;

    await firestore()
      .collection('presence')
      .doc(this.currentUserId)
      .set({
        userId: this.currentUserId,
        isOnline,
        lastActive: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
  }

  /**
   * Listen to user presence
   */
  listenToPresence(userId: string, callback: (presence: UserPresence | null) => void) {
    return firestore()
      .collection('presence')
      .doc(userId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          callback({
            userId,
            isOnline: data?.isOnline || false,
            lastActive: data?.lastActive?.toDate() || new Date(),
          });
        } else {
          callback(null);
        }
      });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await firestore()
      .collection('messages')
      .doc(messageId)
      .delete();
  }

  /**
   * Generate conversation ID from two user IDs
   */
  private generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(): Promise<number> {
    if (!this.currentUserId) return 0;

    const conversations = await firestore()
      .collection('conversations')
      .where('participants', 'array-contains', this.currentUserId)
      .get();

    let totalUnread = 0;
    conversations.docs.forEach((doc) => {
      const data = doc.data();
      const unreadCount = data.unreadCount?.[this.currentUserId] || 0;
      totalUnread += unreadCount;
    });

    return totalUnread;
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, limit: number = 20): Promise<Message[]> {
    if (!this.currentUserId) return [];

    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation - consider using Algolia or similar for production
    const messages = await firestore()
      .collection('messages')
      .where('senderId', '==', this.currentUserId)
      .orderBy('timestamp', 'desc')
      .limit(limit * 2) // Get more to filter
      .get();

    const receivedMessages = await firestore()
      .collection('messages')
      .where('receiverId', '==', this.currentUserId)
      .orderBy('timestamp', 'desc')
      .limit(limit * 2)
      .get();

    const allMessages: Message[] = [];
    
    [...messages.docs, ...receivedMessages.docs].forEach((doc) => {
      const data = doc.data();
      if (data.content.toLowerCase().includes(query.toLowerCase())) {
        allMessages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Message);
      }
    });

    return allMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export default new FirebaseMessagingService();