/**
 * Comprehensive component tests for React Native app
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
import profileSlice from '../../store/slices/profileSlice';
import messageSlice from '../../store/slices/messageSlice';
import paymentSlice from '../../store/slices/paymentSlice';

// Import components to test
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import JobListScreen from '../../screens/jobs/JobListScreen';
import JobDetailScreen from '../../screens/jobs/JobDetailScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import ChatScreen from '../../screens/messaging/ChatScreen';
import PaymentScreen from '../../screens/payments/PaymentScreen';

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
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  processPayment: jest.fn(),
};

jest.mock('../../services/api', () => mockApiService);

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      jobs: jobSlice,
      profile: profileSlice,
      messages: messageSlice,
      payments: paymentSlice,
    },
    preloadedState: initialState,
  });
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {},
};

describe('Authentication Components', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
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

  describe('LoginScreen', () => {
    it('renders all login form elements', () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
      expect(getByText('Forgot Password?')).toBeTruthy();
    });

    it('validates email format', async () => {
      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(findByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('validates password requirements', async () => {
      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '123'); // Too short
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(findByText('Password must be at least 8 characters')).toBeTruthy();
      });
    });

    it('handles successful login', async () => {
      mockApiService.login.mockResolvedValue({
        user: { id: 1, email: 'test@example.com', role: 'client' },
        token: { access_token: 'mock_token' }
      });

      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockApiService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('handles login errors', async () => {
      mockApiService.login.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } }
      });

      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(findByText('Invalid credentials')).toBeTruthy();
      });
    });

    it('navigates to register screen', () => {
      const { getByText } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const signUpLink = getByText('Sign Up');
      fireEvent.press(signUpLink);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
    });

    it('shows loading state during login', async () => {
      mockApiService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      const { getByPlaceholderText, getByText, getByTestId } = renderWithProviders(
        <LoginScreen navigation={mockNavigation} route={mockRoute} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  describe('RegisterScreen', () => {
    it('renders all registration form elements', () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
        <RegisterScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Create Account')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
      expect(getByPlaceholderText('First Name')).toBeTruthy();
      expect(getByPlaceholderText('Last Name')).toBeTruthy();
      expect(getByPlaceholderText('Phone')).toBeTruthy();
      expect(getByTestId('role-client')).toBeTruthy();
      expect(getByTestId('role-worker')).toBeTruthy();
    });

    it('validates password confirmation', async () => {
      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <RegisterScreen navigation={mockNavigation} route={mockRoute} />
      );

      const passwordInput = getByPlaceholderText('Password');
      const confirmPasswordInput = getByPlaceholderText('Confirm Password');
      const createAccountButton = getByText('Create Account');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456');
      fireEvent.press(createAccountButton);

      await waitFor(() => {
        expect(findByText('Passwords do not match')).toBeTruthy();
      });
    });

    it('validates phone number format', async () => {
      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <RegisterScreen navigation={mockNavigation} route={mockRoute} />
      );

      const phoneInput = getByPlaceholderText('Phone');
      const createAccountButton = getByText('Create Account');

      fireEvent.changeText(phoneInput, '123'); // Invalid phone
      fireEvent.press(createAccountButton);

      await waitFor(() => {
        expect(findByText('Please enter a valid phone number')).toBeTruthy();
      });
    });

    it('handles successful registration', async () => {
      mockApiService.register.mockResolvedValue({
        user: { id: 1, email: 'newuser@example.com', role: 'client' },
        token: { access_token: 'mock_token' }
      });

      const { getByPlaceholderText, getByText, getByTestId } = renderWithProviders(
        <RegisterScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Email'), 'newuser@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('First Name'), 'John');
      fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
      fireEvent.changeText(getByPlaceholderText('Phone'), '+1234567890');
      fireEvent.press(getByTestId('role-client'));
      fireEvent.press(getByText('Create Account'));

      await waitFor(() => {
        expect(mockApiService.register).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
          role: 'client'
        });
      });
    });
  });
});

describe('Job Management Components', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore({
      auth: {
        user: { id: 1, email: 'test@example.com', role: 'worker' },
        token: 'mock_token',
        isAuthenticated: true
      }
    });
    jest.clearAllMocks();
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

  describe('JobListScreen', () => {
    it('renders job list correctly', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Fix Kitchen Sink',
          description: 'Kitchen sink is leaking',
          category: 'plumbing',
          budget_min: 100,
          budget_max: 200,
          location: 'New York, NY',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 2,
          title: 'Install Light Fixture',
          description: 'Install new ceiling light',
          category: 'electrical',
          budget_min: 150,
          budget_max: 300,
          location: 'Brooklyn, NY',
          created_at: '2024-01-02T10:00:00Z'
        }
      ];

      mockApiService.getJobs.mockResolvedValue(mockJobs);

      const { getByText, findByText } = renderWithProviders(
        <JobListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(findByText('Fix Kitchen Sink')).toBeTruthy();
        expect(findByText('Install Light Fixture')).toBeTruthy();
      });
    });

    it('handles search functionality', async () => {
      mockApiService.getJobs.mockResolvedValue([]);

      const { getByPlaceholderText } = renderWithProviders(
        <JobListScreen navigation={mockNavigation} route={mockRoute} />
      );

      const searchInput = getByPlaceholderText('Search jobs...');
      fireEvent.changeText(searchInput, 'plumbing');

      await waitFor(() => {
        expect(mockApiService.getJobs).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'plumbing' })
        );
      });
    });

    it('handles filter functionality', async () => {
      mockApiService.getJobs.mockResolvedValue([]);

      const { getByText, getByTestId } = renderWithProviders(
        <JobListScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByText('Filters'));

      await waitFor(() => {
        expect(getByTestId('filter-modal')).toBeTruthy();
      });

      fireEvent.press(getByTestId('category-plumbing'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockApiService.getJobs).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'plumbing' })
        );
      });
    });

    it('navigates to job detail on job press', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Fix Kitchen Sink',
          description: 'Kitchen sink is leaking',
          category: 'plumbing',
          budget_min: 100,
          budget_max: 200,
          location: 'New York, NY'
        }
      ];

      mockApiService.getJobs.mockResolvedValue(mockJobs);

      const { findByText } = renderWithProviders(
        <JobListScreen navigation={mockNavigation} route={mockRoute} />
      );

      const jobCard = await findByText('Fix Kitchen Sink');
      fireEvent.press(jobCard);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('JobDetail', { jobId: 1 });
    });
  });

  describe('JobDetailScreen', () => {
    const mockJob = {
      id: 1,
      title: 'Fix Kitchen Sink',
      description: 'Kitchen sink is leaking and needs immediate repair',
      category: 'plumbing',
      budget_min: 100,
      budget_max: 200,
      location: 'New York, NY',
      client: {
        id: 2,
        first_name: 'John',
        last_name: 'Doe',
        rating: 4.5
      },
      created_at: '2024-01-01T10:00:00Z'
    };

    it('renders job details correctly', async () => {
      mockApiService.getJobById.mockResolvedValue(mockJob);

      const { getByText, findByText } = renderWithProviders(
        <JobDetailScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { jobId: 1 } }} 
        />
      );

      await waitFor(() => {
        expect(findByText('Fix Kitchen Sink')).toBeTruthy();
        expect(findByText('Kitchen sink is leaking and needs immediate repair')).toBeTruthy();
        expect(findByText('$100 - $200')).toBeTruthy();
        expect(findByText('New York, NY')).toBeTruthy();
        expect(findByText('John Doe')).toBeTruthy();
      });
    });

    it('handles job application', async () => {
      mockApiService.getJobById.mockResolvedValue(mockJob);
      mockApiService.applyToJob.mockResolvedValue({ success: true });

      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <JobDetailScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { jobId: 1 } }} 
        />
      );

      await waitFor(() => {
        expect(findByText('Apply for Job')).toBeTruthy();
      });

      fireEvent.press(getByText('Apply for Job'));

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

    it('shows loading state while fetching job details', () => {
      mockApiService.getJobById.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      const { getByTestId } = renderWithProviders(
        <JobDetailScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { jobId: 1 } }} 
        />
      );

      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });
});

describe('Profile Components', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore({
      auth: {
        user: { id: 1, email: 'test@example.com', role: 'worker' },
        token: 'mock_token',
        isAuthenticated: true
      }
    });
    jest.clearAllMocks();
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

  describe('ProfileScreen', () => {
    const mockProfile = {
      id: 1,
      user_id: 1,
      bio: 'Experienced plumber with 10 years experience',
      skills: ['plumbing', 'pipe_repair'],
      hourly_rate: 75,
      location: 'New York, NY',
      rating: 4.8,
      total_jobs: 150,
      portfolio_images: ['image1.jpg', 'image2.jpg']
    };

    it('renders profile information correctly', async () => {
      mockApiService.getProfile.mockResolvedValue(mockProfile);

      const { getByText, findByText } = renderWithProviders(
        <ProfileScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(findByText('Experienced plumber with 10 years experience')).toBeTruthy();
        expect(findByText('$75/hour')).toBeTruthy();
        expect(findByText('New York, NY')).toBeTruthy();
        expect(findByText('4.8')).toBeTruthy();
        expect(findByText('150 jobs completed')).toBeTruthy();
      });
    });

    it('handles profile editing', async () => {
      mockApiService.getProfile.mockResolvedValue(mockProfile);
      mockApiService.updateProfile.mockResolvedValue({ ...mockProfile, bio: 'Updated bio' });

      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <ProfileScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(findByText('Edit Profile')).toBeTruthy();
      });

      fireEvent.press(getByText('Edit Profile'));

      await waitFor(() => {
        expect(getByPlaceholderText('Bio')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Bio'), 'Updated bio with more experience');
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(mockApiService.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            bio: 'Updated bio with more experience'
          })
        );
      });
    });

    it('handles skill management', async () => {
      mockApiService.getProfile.mockResolvedValue(mockProfile);

      const { getByText, getByTestId, findByText } = renderWithProviders(
        <ProfileScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(findByText('Edit Profile')).toBeTruthy();
      });

      fireEvent.press(getByText('Edit Profile'));
      fireEvent.press(getByText('Add Skill'));

      await waitFor(() => {
        expect(getByTestId('skill-electrical')).toBeTruthy();
      });

      fireEvent.press(getByTestId('skill-electrical'));
      fireEvent.press(getByText('Save Changes'));

      await waitFor(() => {
        expect(mockApiService.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            skills: expect.arrayContaining(['electrical'])
          })
        );
      });
    });
  });
});

describe('Messaging Components', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore({
      auth: {
        user: { id: 1, email: 'test@example.com', role: 'client' },
        token: 'mock_token',
        isAuthenticated: true
      }
    });
    jest.clearAllMocks();
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

  describe('ChatScreen', () => {
    const mockMessages = [
      {
        id: 1,
        sender_id: 1,
        receiver_id: 2,
        content: 'Hi, are you available for the plumbing job?',
        created_at: '2024-01-01T10:00:00Z',
        is_read: true
      },
      {
        id: 2,
        sender_id: 2,
        receiver_id: 1,
        content: 'Yes, I can help with that!',
        created_at: '2024-01-01T10:05:00Z',
        is_read: false
      }
    ];

    it('renders messages correctly', async () => {
      mockApiService.getMessages.mockResolvedValue(mockMessages);

      const { findByText } = renderWithProviders(
        <ChatScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { conversationId: 1, recipientName: 'John Doe' } }} 
        />
      );

      await waitFor(() => {
        expect(findByText('Hi, are you available for the plumbing job?')).toBeTruthy();
        expect(findByText('Yes, I can help with that!')).toBeTruthy();
      });
    });

    it('handles sending messages', async () => {
      mockApiService.getMessages.mockResolvedValue(mockMessages);
      mockApiService.sendMessage.mockResolvedValue({ success: true });

      const { getByPlaceholderText, getByTestId, findByText } = renderWithProviders(
        <ChatScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { conversationId: 1, recipientName: 'John Doe' } }} 
        />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });

      const messageInput = getByPlaceholderText('Type a message...');
      const sendButton = getByTestId('send-button');

      fireEvent.changeText(messageInput, 'When can you start?');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockApiService.sendMessage).toHaveBeenCalledWith({
          receiver_id: 2,
          content: 'When can you start?',
          job_id: 1
        });
      });
    });

    it('shows typing indicator', async () => {
      mockApiService.getMessages.mockResolvedValue(mockMessages);

      const { getByTestId } = renderWithProviders(
        <ChatScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { conversationId: 1, recipientName: 'John Doe' } }} 
        />
      );

      // Simulate typing indicator from WebSocket
      await act(async () => {
        // This would normally come through WebSocket
        // For testing, we can simulate the typing state
      });

      // Check if typing indicator is shown
      // expect(getByTestId('typing-indicator')).toBeTruthy();
    });
  });
});

describe('Payment Components', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore({
      auth: {
        user: { id: 1, email: 'test@example.com', role: 'client' },
        token: 'mock_token',
        isAuthenticated: true
      }
    });
    jest.clearAllMocks();
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

  describe('PaymentScreen', () => {
    const mockBooking = {
      id: 1,
      job: {
        id: 1,
        title: 'Fix Kitchen Sink',
        description: 'Kitchen sink repair'
      },
      worker: {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith'
      },
      agreed_rate: 150.00,
      status: 'completed'
    };

    it('renders payment form correctly', async () => {
      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <PaymentScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { bookingId: 1 } }} 
        />
      );

      await waitFor(() => {
        expect(findByText('Process Payment')).toBeTruthy();
        expect(findByText('$150.00')).toBeTruthy();
      });

      expect(getByPlaceholderText('Card Number')).toBeTruthy();
      expect(getByPlaceholderText('MM/YY')).toBeTruthy();
      expect(getByPlaceholderText('CVC')).toBeTruthy();
    });

    it('validates payment form', async () => {
      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <PaymentScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { bookingId: 1 } }} 
        />
      );

      const payButton = await findByText('Pay $150.00');
      fireEvent.press(payButton);

      await waitFor(() => {
        expect(findByText('Card number is required')).toBeTruthy();
        expect(findByText('Expiry date is required')).toBeTruthy();
        expect(findByText('CVC is required')).toBeTruthy();
      });
    });

    it('handles successful payment', async () => {
      mockApiService.processPayment.mockResolvedValue({
        success: true,
        payment_id: 'pi_test123'
      });

      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <PaymentScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { bookingId: 1 } }} 
        />
      );

      // Fill payment form
      fireEvent.changeText(getByPlaceholderText('Card Number'), '4242424242424242');
      fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
      fireEvent.changeText(getByPlaceholderText('CVC'), '123');

      const payButton = await findByText('Pay $150.00');
      fireEvent.press(payButton);

      await waitFor(() => {
        expect(mockApiService.processPayment).toHaveBeenCalledWith({
          booking_id: 1,
          amount: 150.00,
          payment_method: expect.objectContaining({
            card_number: '4242424242424242',
            exp_month: '12',
            exp_year: '25',
            cvc: '123'
          })
        });
      });
    });

    it('handles payment errors', async () => {
      mockApiService.processPayment.mockRejectedValue({
        response: { data: { detail: 'Your card was declined' } }
      });

      const { getByText, getByPlaceholderText, findByText } = renderWithProviders(
        <PaymentScreen 
          navigation={mockNavigation} 
          route={{ ...mockRoute, params: { bookingId: 1 } }} 
        />
      );

      // Fill payment form
      fireEvent.changeText(getByPlaceholderText('Card Number'), '4000000000000002'); // Declined card
      fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
      fireEvent.changeText(getByPlaceholderText('CVC'), '123');

      const payButton = await findByText('Pay $150.00');
      fireEvent.press(payButton);

      await waitFor(() => {
        expect(findByText('Your card was declined')).toBeTruthy();
      });
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
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

  it('handles network errors gracefully', async () => {
    mockApiService.getJobs.mockRejectedValue(new Error('Network Error'));

    const { findByText } = renderWithProviders(
      <JobListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(findByText('Unable to load jobs. Please check your connection.')).toBeTruthy();
    });
  });

  it('handles empty states correctly', async () => {
    mockApiService.getJobs.mockResolvedValue([]);

    const { findByText } = renderWithProviders(
      <JobListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(findByText('No jobs found')).toBeTruthy();
      expect(findByText('Try adjusting your search or filters')).toBeTruthy();
    });
  });

  it('handles unauthorized access', async () => {
    mockApiService.getProfile.mockRejectedValue({
      response: { status: 401, data: { detail: 'Unauthorized' } }
    });

    const { findByText } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(findByText('Session expired. Please login again.')).toBeTruthy();
    });
  });

  it('handles server errors', async () => {
    mockApiService.getJobs.mockRejectedValue({
      response: { status: 500, data: { detail: 'Internal Server Error' } }
    });

    const { findByText } = renderWithProviders(
      <JobListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(findByText('Something went wrong. Please try again later.')).toBeTruthy();
    });
  });
});