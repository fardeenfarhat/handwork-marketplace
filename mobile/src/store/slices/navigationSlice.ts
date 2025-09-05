import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  tabBadges: {
    messages: number;
    notifications: number;
  };
  deepLinkPending: string | null;
  isOnline: boolean;
}

const initialState: NavigationState = {
  currentRoute: 'Dashboard',
  previousRoute: null,
  tabBadges: {
    messages: 0,
    notifications: 0,
  },
  deepLinkPending: null,
  isOnline: true,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentRoute: (state, action: PayloadAction<string>) => {
      state.previousRoute = state.currentRoute;
      state.currentRoute = action.payload;
    },
    setTabBadge: (state, action: PayloadAction<{ tab: keyof NavigationState['tabBadges']; count: number }>) => {
      state.tabBadges[action.payload.tab] = action.payload.count;
    },
    clearTabBadge: (state, action: PayloadAction<keyof NavigationState['tabBadges']>) => {
      state.tabBadges[action.payload] = 0;
    },
    setPendingDeepLink: (state, action: PayloadAction<string | null>) => {
      state.deepLinkPending = action.payload;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
  },
});

export const {
  setCurrentRoute,
  setTabBadge,
  clearTabBadge,
  setPendingDeepLink,
  setOnlineStatus,
} = navigationSlice.actions;

export default navigationSlice.reducer;