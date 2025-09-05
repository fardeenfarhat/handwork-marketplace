/**
 * Comprehensive End-to-End tests for critical user flows
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import store slices
import authSlice from '../../store/slices/authSlice';
import jobSlice from '../../store/slices/jobSlice';
import messageSlice from '../../store/slices/messageSlice';

// Import screens for E2E flows
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import JobsScreen from '../../screens/jobs/JobsScreen';
import JobDetailScreen from '../../screens/jobs/JobDetailScreen';
import JobApplicationScreen from '../../screens/jobs/JobApplicationScreen';
import ChatScreen from '../../screens/messages/ChatScreen';
import BookingConfirmationScreen from '../../screens/payments/BookingConfirmationScreen';
import JobTrackingScreen from '../../screens/payments/JobTrackingScreen';
import CompletionVerificationScreen from '../../screens/payments/CompletionVerificationScreen';
import ReviewSubmissionScreen from '../../screens/reviews/ReviewSubmissionScreen';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-location');
jest.mock('expo-notifications');
jest.mock('expo-camera');
jest.mock('expo-image-picker');
jest.mock('react-native-maps');

// Mock API service
const mockApiService = {
  login: jest.fn(),
  register: jest.fn(),
  getJobs: jest.fn(),
  getJobById: jest.fn(),
  applyToJob: jest.fn(),
  hireWorker: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  confirmBooking: jest.fn(),
  updateJobStatus: jest.fn(),
  uploadCompletionPhotos: jest.fn(),
  processPayment: jest.fn(),
  submitReview: jest.fn(),
  getProfile: jest.fn(),
};

jest.mock('../../services/api', () => mockApiService);

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      jobs: jobSlice,
      messages: messageSlice,
    },
    preloadedState: initialState,
  });
};

// Mock navigation
const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => () => {}),
});

describe('End-to-End User Flows', () => {
  let store: ReturnType<typeof createTestStore>;
  let mockNavigation: ReturnType<typeof createMockNavigation>;

  beforeEach(() => {
    store = createTestStore();
    mockNavigation = createMockNavigation();
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          {component}
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Complete Worker Job Application Flow', () => {
    it('should complete full worker registration to job application flow', async () => {
      // Step 1: Worker Registration
      mockApiService.register.mockResolvedValue({
        user: { id: 1, email: 'worker@example.com', role: 'worker' },
        token: { access_token: 'worker_token' }
      });

      const { getByPlaceholderText, getByText, getByTestId, rerender } = renderWithProviders(
        <RegisterScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      // Fill registration form
      fireEvent.changeText(getByPlaceholderText('Email'), 'worker@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('First Name'), 'John');
      fireEvent.changeText(getByPlaceholderText('Last Name'), 'Worker');
      fireEvent.changeText(getByPlaceholderText('Phone'), '+1234567890');
      fireEvent.press(getByTestId('role-worker'));
      fireEvent.press(getByText('Create Account'));

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalledWith({
          email: 'worker@example.com',
          password: 'password123',
          first_name: 'John',
          last_name: 'Worker',
          phone: '+1234567890',
          role: 'worker'
        });
      });

      // Step 2: Browse Jobs
      const mockJobs = [
        {
          id: 1,
          title: 'Fix Kitchen Sink',
          description: 'Kitchen sink is leaking',
          category: 'plumbing',
          budget_min: 100,
          budget_max: 200,
          location: 'New York, NY',
          client: { id: 2, first_name: 'Jane', last_name: 'Client' }
        }
      ];

      mockApiService.getJobs.mockResolvedValue(mockJobs);

      // Update store to simulate successful login
      store = createTestStore({
        auth: {
          user: { id: 1, email: 'worker@example.com', role: 'worker' },
          token: 'worker_token',
          isAuthenticated: true
        }
      });

      rerender(
        <Provider store={store}>
          <NavigationContainer>
            <JobsScreen navigation={mockNavigation} route={{ params: {} }} />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Fix Kitchen Sink')).toBeTruthy();
      });

      // Step 3: View Job Details
      fireEvent.press(getByText('Fix Kitchen Sink'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('JobDetail', { jobId: 1 });

      // Step 4: Apply to Job
      mockApiService.getJobById.mockResolvedValue(mockJobs[0]);
      mockApiService.applyToJob.mockResolvedValue({ success: true });

      rerender(
        <Provider store={store}>
          <NavigationContainer>
            <JobDetailScreen 
              navigation={mockNavigation} 
              route={{ params: { jobId: 1 } }} 
            />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Apply for Job')).toBeTruthy();
      });

      fireEvent.press(getByText('Apply for Job'));

      // Fill application form
      await waitFor(() => {
        expect(getByPlaceholderText('Why are you the right fit?')).toBeTruthy();
      });

      fireEvent.changeText(
        getByPlaceholderText('Why are you the right fit?'),
        'I have 5 years of plumbing experience'
      );
      fireEvent.changeText(getByPlaceholderText('Proposed Rate'), '150');
      fireEvent.press(getByText('Submit Application'));

      await waitFor(() => {
        expect(mockApiService.applyToJob).toHaveBeenCalledWith(1, {
          message: 'I have 5 years of plumbing experience',
          proposed_rate: 150
        });
      });
    });
  });

  describe('Complete Client Job Posting to Completion Flow', () => {
    it('should complete full client job posting to payment flow', async () => {
      // Step 1: Client Login
      mockApiService.login.mockResolvedValue({
        user: { id: 2, email: 'client@example.com', role: 'client' },
        token: { access_token: 'client_token' }
      });

      const { getByPlaceholderText, getByText, rerender } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'client@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(mockApiService.login).toHaveBeenCalled();
      });

      // Update store to simulate successful login
      store = createTestStore({
        auth: {
          user: { id: 2, email: 'client@example.com', role: 'client' },
          token: 'client_token',
          isAuthenticated: true
        }
      });

      // Step 2: Hire Worker (simulate worker was selected)
      mockApiService.hireWorker.mockResolvedValue({
        booking: {
          id: 1,
          job_id: 1,
          worker_id: 1,
          client_id: 2,
          agreed_rate: 150,
          status: 'confirmed'
        }
      });

      // Step 3: Confirm Booking
      rerender(
        <Provider store={store}>
          <NavigationContainer>
            <BookingConfirmationScreen 
              navigation={mockNavigation} 
              route={{ params: { jobId: 1, workerId: 1, agreedRate: 150 } }} 
            />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Confirm Booking')).toBeTruthy();
      });

      fireEvent.press(getByText('Confirm Booking'));

      await waitFor(() => {
        expect(mockApiService.confirmBooking).toHaveBeenCalled();
      });

      // Step 4: Track Job Progress
      mockApiService.updateJobStatus.mockResolvedValue({ success: true });

      rerender(
        <Provider store={store}>
          <NavigationContainer>
            <JobTrackingScreen 
              navigation={mockNavigation} 
              route={{ params: { bookingId: 1 } }} 
            />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Job Status: In Progress')).toBeTruthy();
      });

      // Step 5: Complete Job (simulate worker completion)
      mockApiService.uploadCompletionPhotos.mockResolvedValue({ success: true });

      rerender(
        <Provider store={store}>
          <NavigationContainer>
            <CompletionVerificationScreen 
              navigation={mockNavigation} 
              route={{ params: { bookingId: 1 } }} 
            />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Approve Completion')).toBeTruthy();
      });

      fireEvent.press(getByText('Approve Completion'));

      // Step 6: Process Payment
      mockApiService.processPayment.mockResolvedValue({
        success: true,
        payment_id: 'pi_test123'
      });

      await waitFor(() => {
        expect(mockApiService.processPayment).toHaveBeenCalled();
      });

      // Step 7: Submit Review
      mockApiService.submitReview.mockResolvedValue({ success: true });

      rerender(
        <Provider store={store}>
          <NavigationContainer>
            <ReviewSubmissionScreen 
              navigation={mockNavigation} 
              route={{ params: { bookingId: 1, revieweeId: 1 } }} 
            />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Submit Review')).toBeTruthy();
      });

      // Rate and review
      fireEvent.press(getByText('★★★★★')); // 5 stars
      fireEvent.changeText(
        getByPlaceholderText('Write your review...'),
        'Excellent work! Very professional and completed on time.'
      );
      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(mockApiService.submitReview).toHaveBeenCalledWith({
          booking_id: 1,
          reviewee_id: 1,
          rating: 5,
          comment: 'Excellent work! Very professional and completed on time.'
        });
      });
    });
  });

  describe('Real-time Messaging Flow', () => {
    it('should handle complete messaging flow between client and worker', async () => {
      // Setup authenticated client
      store = createTestStore({
        auth: {
          user: { id: 2, email: 'client@example.com', role: 'client' },
          token: 'client_token',
          isAuthenticated: true
        }
      });

      const mockMessages = [
        {
          id: 1,
          sender_id: 2,
          receiver_id: 1,
          content: 'Hi, are you available for the plumbing job?',
          created_at: '2024-01-01T10:00:00Z',
          is_read: true
        },
        {
          id: 2,
          sender_id: 1,
          receiver_id: 2,
          content: 'Yes, I can help with that!',
          created_at: '2024-01-01T10:05:00Z',
          is_read: false
        }
      ];

      mockApiService.getMessages.mockResolvedValue(mockMessages);
      mockApiService.sendMessage.mockResolvedValue({ success: true });

      const { getByPlaceholderText, getByTestId, findByText } = renderWithProviders(
        <ChatScreen 
          navigation={mockNavigation} 
          route={{ 
            params: { 
              conversationId: 1, 
              recipientId: 1,
              recipientName: 'John Worker',
              jobId: 1
            } 
          }} 
        />
      );

      // Verify messages are displayed
      await waitFor(() => {
        expect(findByText('Hi, are you available for the plumbing job?')).toBeTruthy();
        expect(findByText('Yes, I can help with that!')).toBeTruthy();
      });

      // Send new message
      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, 'When can you start?');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockApiService.sendMessage).toHaveBeenCalledWith({
          receiver_id: 1,
          content: 'When can you start?',
          job_id: 1
        });
      });

      // Verify message appears in chat
      await waitFor(() => {
        expect(findByText('When can you start?')).toBeTruthy();
      });
    });
  });

  describe('Error Recovery Flows', () => {
    it('should handle network errors gracefully throughout the flow', async () => {
      // Test network error during login
      mockApiService.login.mockRejectedValue(new Error('Network Error'));

      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(findByText('Network error. Please check your connection.')).toBeTruthy();
      });

      // Test retry functionality
      mockApiService.login.mockResolvedValue({
        user: { id: 1, email: 'test@example.com', role: 'client' },
        token: { access_token: 'test_token' }
      });

      fireEvent.press(getByText('Retry'));

      await waitFor(() => {
        expect(mockApiService.login).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle payment failures and retry', async () => {
      store = createTestStore({
        auth: {
          user: { id: 2, email: 'client@example.com', role: 'client' },
          token: 'client_token',
          isAuthenticated: true
        }
      });

      // First payment attempt fails
      mockApiService.processPayment.mockRejectedValueOnce({
        response: { data: { detail: 'Your card was declined' } }
      });

      // Second attempt succeeds
      mockApiService.processPayment.mockResolvedValue({
        success: true,
        payment_id: 'pi_test123'
      });

      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <BookingConfirmationScreen 
          navigation={mockNavigation} 
          route={{ params: { jobId: 1, workerId: 1, agreedRate: 150 } }} 
        />
      );

      // Fill payment form
      fireEvent.changeText(getByPlaceholderText('Card Number'), '4000000000000002'); // Declined card
      fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
      fireEvent.changeText(getByPlaceholderText('CVC'), '123');

      fireEvent.press(getByText('Confirm & Pay'));

      // Should show error
      await waitFor(() => {
        expect(findByText('Your card was declined')).toBeTruthy();
      });

      // Update card number and retry
      fireEvent.changeText(getByPlaceholderText('Card Number'), '4242424242424242'); // Valid card
      fireEvent.press(getByText('Retry Payment'));

      await waitFor(() => {
        expect(mockApiService.processPayment).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline scenarios and sync when back online', async () => {
      store = createTestStore({
        auth: {
          user: { id: 1, email: 'worker@example.com', role: 'worker' },
          token: 'worker_token',
          isAuthenticated: true
        }
      });

      // Simulate offline state
      mockApiService.getJobs.mockRejectedValue(new Error('Network request failed'));

      const { getByText, findByText } = renderWithProviders(
        <JobsScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      await waitFor(() => {
        expect(findByText('You are offline')).toBeTruthy();
        expect(findByText('Showing cached jobs')).toBeTruthy();
      });

      // Simulate coming back online
      mockApiService.getJobs.mockResolvedValue([
        {
          id: 1,
          title: 'New Job Available',
          description: 'Fresh job posting',
          category: 'plumbing',
          budget_min: 100,
          budget_max: 200,
          location: 'New York, NY'
        }
      ]);

      fireEvent.press(getByText('Retry'));

      await waitFor(() => {
        expect(findByText('New Job Available')).toBeTruthy();
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large datasets efficiently', async () => {
      store = createTestStore({
        auth: {
          user: { id: 1, email: 'worker@example.com', role: 'worker' },
          token: 'worker_token',
          isAuthenticated: true
        }
      });

      // Generate large dataset
      const largeJobList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Job ${i + 1}`,
        description: `Description for job ${i + 1}`,
        category: i % 2 === 0 ? 'plumbing' : 'electrical',
        budget_min: 100 + (i * 10),
        budget_max: 200 + (i * 10),
        location: 'New York, NY'
      }));

      mockApiService.getJobs.mockResolvedValue(largeJobList);

      const startTime = Date.now();

      const { findByText } = renderWithProviders(
        <JobsScreen navigation={mockNavigation} route={{ params: {} }} />
      );

      await waitFor(() => {
        expect(findByText('Job 1')).toBeTruthy();
      });

      const renderTime = Date.now() - startTime;

      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });
  });
});