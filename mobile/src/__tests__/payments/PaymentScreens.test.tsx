import React from 'react';
import { render } from '@testing-library/react-native';
import { PaymentMethodsScreen, PaymentHistoryScreen } from '@/screens/payments';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(() => 'test-id'),
  getParent: jest.fn(),
  getState: jest.fn(),
};

// Mock API service
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    getPaymentMethods: jest.fn(() => Promise.resolve([])),
    getPaymentHistory: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

describe('Payment Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PaymentMethodsScreen', () => {
    it('renders correctly', async () => {
      const { findByText } = render(<PaymentMethodsScreen />);
      const title = await findByText('Payment Methods');
      expect(title).toBeTruthy();
    });

    it('shows empty state when no payment methods', async () => {
      const { findByText } = render(<PaymentMethodsScreen />);
      const emptyText = await findByText('No payment methods added yet');
      expect(emptyText).toBeTruthy();
    });
  });

  describe('PaymentHistoryScreen', () => {
    it('renders correctly', async () => {
      const { findByText } = render(<PaymentHistoryScreen />);
      const title = await findByText('Payment History');
      expect(title).toBeTruthy();
    });

    it('shows filter buttons', async () => {
      const { findByText } = render(<PaymentHistoryScreen />);
      const allButton = await findByText('All');
      expect(allButton).toBeTruthy();
      
      const { getByText } = render(<PaymentHistoryScreen />);
      // Wait a bit for the component to fully render
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(getByText('Payments')).toBeTruthy();
      expect(getByText('Payouts')).toBeTruthy();
      expect(getByText('Refunds')).toBeTruthy();
    });
  });
});