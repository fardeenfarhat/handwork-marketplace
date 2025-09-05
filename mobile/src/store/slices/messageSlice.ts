import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Message } from '@/types';
import apiService from '@/services/api';

interface ConversationInfo {
  jobId: number;
  jobTitle: string;
  otherUserId: number;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
}

interface TypingStatus {
  [jobId: string]: {
    [userId: string]: boolean;
  };
}

interface MessageState {
  conversations: { [key: string]: Message[] };
  conversationsList: ConversationInfo[];
  typingStatus: TypingStatus;
  isLoading: boolean;
  error: string | null;
  searchResults: Message[];
  isSearching: boolean;
}

const initialState: MessageState = {
  conversations: {},
  conversationsList: [],
  typingStatus: {},
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
};

// Async thunks
export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async () => {
    const response = await apiService.getConversations();
    return response;
  }
);

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (jobId: number) => {
    const response = await apiService.getMessages(jobId);
    return { jobId: jobId.toString(), messages: response };
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: {
    receiverId: number;
    jobId: number;
    content: string;
    attachments?: string[];
  }) => {
    const response = await apiService.sendMessage(messageData);
    return { jobId: messageData.jobId.toString(), message: response };
  }
);

export const searchMessages = createAsyncThunk(
  'messages/searchMessages',
  async ({ query, jobId }: { query: string; jobId?: number }) => {
    const response = await apiService.searchMessages(query, jobId);
    return response;
  }
);

const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setMessages: (state, action: PayloadAction<{ jobId: string; messages: Message[] }>) => {
      state.conversations[action.payload.jobId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{ jobId: string; message: Message }>) => {
      const { jobId, message } = action.payload;
      if (!state.conversations[jobId]) {
        state.conversations[jobId] = [];
      }
      
      // Check if message already exists (to prevent duplicates)
      const existingMessage = state.conversations[jobId].find(msg => msg.id === message.id);
      if (!existingMessage) {
        state.conversations[jobId].push(message);
        
        // Update conversation info
        const conversationIndex = state.conversationsList.findIndex(conv => conv.jobId.toString() === jobId);
        if (conversationIndex >= 0) {
          state.conversationsList[conversationIndex].lastMessage = message;
          if (message.senderId !== message.receiverId) { // Not own message
            state.conversationsList[conversationIndex].unreadCount += 1;
          }
        }
      }
    },
    markAsRead: (state, action: PayloadAction<{ jobId: string; messageId: number }>) => {
      const { jobId, messageId } = action.payload;
      const conversation = state.conversations[jobId];
      if (conversation) {
        const message = conversation.find(msg => msg.id === messageId);
        if (message) {
          message.isRead = true;
        }
      }
    },
    markConversationAsRead: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      const conversation = state.conversations[jobId];
      if (conversation) {
        conversation.forEach(message => {
          message.isRead = true;
        });
      }
      
      // Update conversation info
      const conversationIndex = state.conversationsList.findIndex(conv => conv.jobId.toString() === jobId);
      if (conversationIndex >= 0) {
        state.conversationsList[conversationIndex].unreadCount = 0;
      }
    },
    setTypingStatus: (state, action: PayloadAction<{ jobId: string; userId: string; isTyping: boolean }>) => {
      const { jobId, userId, isTyping } = action.payload;
      if (!state.typingStatus[jobId]) {
        state.typingStatus[jobId] = {};
      }
      state.typingStatus[jobId][userId] = isTyping;
    },
    setUserOnlineStatus: (state, action: PayloadAction<{ userId: number; isOnline: boolean }>) => {
      const { userId, isOnline } = action.payload;
      state.conversationsList.forEach(conversation => {
        if (conversation.otherUserId === userId) {
          conversation.isOnline = isOnline;
        }
      });
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.isSearching = false;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversationsList = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch conversations';
      })
      
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations[action.payload.jobId] = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { jobId, message } = action.payload;
        if (!state.conversations[jobId]) {
          state.conversations[jobId] = [];
        }
        
        // Replace temporary message or add new one
        const tempMessageIndex = state.conversations[jobId].findIndex(
          msg => msg.id === message.id || (msg.content === message.content && msg.senderId === message.senderId)
        );
        
        if (tempMessageIndex >= 0) {
          state.conversations[jobId][tempMessageIndex] = message;
        } else {
          state.conversations[jobId].push(message);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to send message';
      })
      
      // Search messages
      .addCase(searchMessages.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchMessages.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.error.message || 'Failed to search messages';
      });
  },
});

export const {
  setLoading,
  setMessages,
  addMessage,
  markAsRead,
  markConversationAsRead,
  setTypingStatus,
  setUserOnlineStatus,
  clearSearchResults,
  setError,
} = messageSlice.actions;

export default messageSlice.reducer;