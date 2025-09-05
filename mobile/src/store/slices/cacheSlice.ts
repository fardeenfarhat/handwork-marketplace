import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Job, User, Message, Booking, Review } from '@/types';

interface CacheState {
  jobs: {
    data: Job[];
    lastUpdated: string | null;
    isStale: boolean;
  };
  users: {
    data: Record<number, User>;
    lastUpdated: string | null;
  };
  messages: {
    data: Record<number, Message[]>; // keyed by jobId
    lastUpdated: string | null;
  };
  bookings: {
    data: Booking[];
    lastUpdated: string | null;
    isStale: boolean;
  };
  reviews: {
    data: Record<number, Review[]>; // keyed by userId
    lastUpdated: string | null;
  };
  pendingSync: {
    jobs: Job[];
    messages: Message[];
    reviews: Review[];
    bookings: Booking[];
  };
  lastSyncAttempt: string | null;
  syncInProgress: boolean;
}

const initialState: CacheState = {
  jobs: {
    data: [],
    lastUpdated: null,
    isStale: false,
  },
  users: {
    data: {},
    lastUpdated: null,
  },
  messages: {
    data: {},
    lastUpdated: null,
  },
  bookings: {
    data: [],
    lastUpdated: null,
    isStale: false,
  },
  reviews: {
    data: {},
    lastUpdated: null,
  },
  pendingSync: {
    jobs: [],
    messages: [],
    reviews: [],
    bookings: [],
  },
  lastSyncAttempt: null,
  syncInProgress: false,
};

const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    // Jobs cache
    setJobsCache: (state, action: PayloadAction<Job[]>) => {
      state.jobs.data = action.payload;
      state.jobs.lastUpdated = new Date().toISOString();
      state.jobs.isStale = false;
    },
    markJobsCacheStale: (state) => {
      state.jobs.isStale = true;
    },
    addJobToCache: (state, action: PayloadAction<Job>) => {
      const existingIndex = state.jobs.data.findIndex(job => job.id === action.payload.id);
      if (existingIndex >= 0) {
        state.jobs.data[existingIndex] = action.payload;
      } else {
        state.jobs.data.push(action.payload);
      }
    },
    removeJobFromCache: (state, action: PayloadAction<number>) => {
      state.jobs.data = state.jobs.data.filter(job => job.id !== action.payload);
    },

    // Users cache
    setUsersCache: (state, action: PayloadAction<User[]>) => {
      const usersMap: Record<number, User> = {};
      action.payload.forEach(user => {
        usersMap[user.id] = user;
      });
      state.users.data = { ...state.users.data, ...usersMap };
      state.users.lastUpdated = new Date().toISOString();
    },
    addUserToCache: (state, action: PayloadAction<User>) => {
      state.users.data[action.payload.id] = action.payload;
    },

    // Messages cache
    setMessagesCache: (state, action: PayloadAction<{ jobId: number; messages: Message[] }>) => {
      state.messages.data[action.payload.jobId] = action.payload.messages;
      state.messages.lastUpdated = new Date().toISOString();
    },
    addMessageToCache: (state, action: PayloadAction<Message>) => {
      const jobId = action.payload.jobId;
      if (!state.messages.data[jobId]) {
        state.messages.data[jobId] = [];
      }
      state.messages.data[jobId].push(action.payload);
    },

    // Bookings cache
    setBookingsCache: (state, action: PayloadAction<Booking[]>) => {
      state.bookings.data = action.payload;
      state.bookings.lastUpdated = new Date().toISOString();
      state.bookings.isStale = false;
    },
    markBookingsCacheStale: (state) => {
      state.bookings.isStale = true;
    },
    addBookingToCache: (state, action: PayloadAction<Booking>) => {
      const existingIndex = state.bookings.data.findIndex(booking => booking.id === action.payload.id);
      if (existingIndex >= 0) {
        state.bookings.data[existingIndex] = action.payload;
      } else {
        state.bookings.data.push(action.payload);
      }
    },

    // Reviews cache
    setReviewsCache: (state, action: PayloadAction<{ userId: number; reviews: Review[] }>) => {
      state.reviews.data[action.payload.userId] = action.payload.reviews;
      state.reviews.lastUpdated = new Date().toISOString();
    },
    addReviewToCache: (state, action: PayloadAction<{ userId: number; review: Review }>) => {
      const userId = action.payload.userId;
      if (!state.reviews.data[userId]) {
        state.reviews.data[userId] = [];
      }
      state.reviews.data[userId].push(action.payload.review);
    },

    // Pending sync operations
    addToPendingSync: (state, action: PayloadAction<{ type: keyof CacheState['pendingSync']; data: any }>) => {
      const { type, data } = action.payload;
      state.pendingSync[type].push(data);
    },
    removePendingSync: (state, action: PayloadAction<{ type: keyof CacheState['pendingSync']; id: number }>) => {
      const { type, id } = action.payload;
      state.pendingSync[type] = state.pendingSync[type].filter((item: any) => item.id !== id);
    },
    clearPendingSync: (state, action: PayloadAction<keyof CacheState['pendingSync']>) => {
      state.pendingSync[action.payload] = [];
    },

    // Sync status
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
      if (action.payload) {
        state.lastSyncAttempt = new Date().toISOString();
      }
    },

    // Clear all cache
    clearCache: (state) => {
      return initialState;
    },
  },
});

export const {
  setJobsCache,
  markJobsCacheStale,
  addJobToCache,
  removeJobFromCache,
  setUsersCache,
  addUserToCache,
  setMessagesCache,
  addMessageToCache,
  setBookingsCache,
  markBookingsCacheStale,
  addBookingToCache,
  setReviewsCache,
  addReviewToCache,
  addToPendingSync,
  removePendingSync,
  clearPendingSync,
  setSyncInProgress,
  clearCache,
} = cacheSlice.actions;

export default cacheSlice.reducer;