/**
 * End-to-end tests for critical user flows
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store } from '../../store';
import App from '../../../App';
import { mockApiService } from '../__mocks__/apiService';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/api', () => mockApiService);
jest.mock('expo-location');
jest.mock('expo-notifications');

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        {component}
      </NavigationContainer>
    </Provider>
  );
};

describe('End-to-End User Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('User Registration and Onboarding Flow', () => {
    it('should complete full registration flow for client', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to registration
      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Sign Up'));

      // Step 2: Fill registration form
      await waitFor(() => {
        expect(getByPlaceholderText('Email')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Email'), 'client@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('First Name'), 'John');
      fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
      fireEvent.changeText(getByPlaceholderText('Phone'), '+1234567890');

      // Step 3: Select client role
      fireEvent.press(getByTestId('role-client'));

      // Step 4: Submit registration
      fireEvent.press(getByText('Create Account'));

      // Step 5: Verify navigation to email verification
      await waitFor(() => {
        expect(getByText('Verify Your Email')).toBeTruthy();
      });

      // Step 6: Complete email verification
      fireEvent.press(getByText('I\'ve verified my email'));

      // Step 7: Complete profile setup
      await waitFor(() => {
        expect(getByText('Complete Your Profile')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Company Name'), 'Test Company');
      fireEvent.changeText(getByPlaceholderText('Location'), 'New York, NY');
      fireEvent.press(getByText('Complete Profile'));

      // Step 8: Verify navigation to main app
      await waitFor(() => {
        expect(getByText('Find Workers')).toBeTruthy();
      });
    });

    it('should complete full registration flow for worker', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Navigate to registration
      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(getByPlaceholderText('Email')).toBeTruthy();
      });

      // Fill registration form
      fireEvent.changeText(getByPlaceholderText('Email'), 'worker@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('First Name'), 'Jane');
      fireEvent.changeText(getByPlaceholderText('Last Name'), 'Smith');
      fireEvent.changeText(getByPlaceholderText('Phone'), '+1234567891');

      // Select worker role
      fireEvent.press(getByTestId('role-worker'));
      fireEvent.press(getByText('Create Account'));

      // Complete email verification
      await waitFor(() => {
        expect(getByText('Verify Your Email')).toBeTruthy();
      });
      fireEvent.press(getByText('I\'ve verified my email'));

      // Complete worker profile
      await waitFor(() => {
        expect(getByText('Complete Your Profile')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Bio'), 'Experienced plumber');
      fireEvent.changeText(getByPlaceholderText('Hourly Rate'), '50');
      fireEvent.press(getByTestId('skill-plumbing'));
      fireEvent.press(getByText('Complete Profile'));

      // Verify KYC prompt
      await waitFor(() => {
        expect(getByText('Identity Verification Required')).toBeTruthy();
      });
    });
  });

  describe('Job Posting and Application Flow', () => {
    it('should complete full job posting and application flow', async () => {
      // Mock authenticated client user
      AsyncStorage.setItem('userToken', 'mock_client_token');
      AsyncStorage.setItem('userRole', 'client');

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to job posting
      await waitFor(() => {
        expect(getByText('Post a Job')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Post a Job'));

      // Step 2: Fill job details
      await waitFor(() => {
        expect(getByPlaceholderText('Job Title')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Job Title'), 'Fix Kitchen Sink');
      fireEvent.changeText(getByPlaceholderText('Description'), 'Kitchen sink is leaking');
      fireEvent.press(getByTestId('category-plumbing'));
      fireEvent.changeText(getByPlaceholderText('Budget Min'), '100');
      fireEvent.changeText(getByPlaceholderText('Budget Max'), '200');
      fireEvent.changeText(getByPlaceholderText('Location'), 'New York, NY');

      // Step 3: Post job
      fireEvent.press(getByText('Post Job'));

      // Step 4: Verify job posted successfully
      await waitFor(() => {
        expect(getByText('Job Posted Successfully')).toBeTruthy();
      });

      // Step 5: View job applications (simulate worker applying)
      fireEvent.press(getByText('View Applications'));

      await waitFor(() => {
        expect(getByText('Job Applications')).toBeTruthy();
      });

      // Step 6: Review and hire worker
      if (getByText('Jane Smith')) {
        fireEvent.press(getByText('View Profile'));
        
        await waitFor(() => {
          expect(getByText('Hire Worker')).toBeTruthy();
        });
        
        fireEvent.press(getByText('Hire Worker'));

        // Step 7: Confirm hiring
        await waitFor(() => {
          expect(getByText('Confirm Hiring')).toBeTruthy();
        });
        
        fireEvent.press(getByText('Confirm'));

        // Step 8: Verify booking created
        await waitFor(() => {
          expect(getByText('Worker Hired Successfully')).toBeTruthy();
        });
      }
    });
  });

  describe('Messaging Flow', () => {
    it('should complete messaging flow between client and worker', async () => {
      AsyncStorage.setItem('userToken', 'mock_client_token');
      AsyncStorage.setItem('userRole', 'client');

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to messages
      await waitFor(() => {
        expect(getByText('Messages')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Messages'));

      // Step 2: Start new conversation
      await waitFor(() => {
        expect(getByText('Start New Chat')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Start New Chat'));

      // Step 3: Select worker to message
      await waitFor(() => {
        expect(getByText('Select Worker')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Jane Smith'));

      // Step 4: Send message
      await waitFor(() => {
        expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      });
      
      fireEvent.changeText(getByPlaceholderText('Type a message...'), 'Hello, are you available for the plumbing job?');
      fireEvent.press(getByTestId('send-button'));

      // Step 5: Verify message sent
      await waitFor(() => {
        expect(getByText('Hello, are you available for the plumbing job?')).toBeTruthy();
      });

      // Step 6: Simulate receiving reply
      await act(async () => {
        // Mock WebSocket message
        const mockMessage = {
          id: 2,
          senderId: 2,
          content: 'Yes, I can help with that!',
          timestamp: new Date().toISOString()
        };
        
        // This would normally come through WebSocket
        // For testing, we can dispatch a Redux action
      });
    });
  });

  describe('Payment Flow', () => {
    it('should complete payment flow for completed job', async () => {
      AsyncStorage.setItem('userToken', 'mock_client_token');
      AsyncStorage.setItem('userRole', 'client');

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to active bookings
      await waitFor(() => {
        expect(getByText('My Bookings')).toBeTruthy();
      });
      
      fireEvent.press(getByText('My Bookings'));

      // Step 2: Select completed job
      await waitFor(() => {
        expect(getByText('Fix Kitchen Sink')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Fix Kitchen Sink'));

      // Step 3: Approve completion and proceed to payment
      await waitFor(() => {
        expect(getByText('Mark as Complete')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Mark as Complete'));

      // Step 4: Confirm completion
      await waitFor(() => {
        expect(getByText('Confirm Completion')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Confirm'));

      // Step 5: Process payment
      await waitFor(() => {
        expect(getByText('Process Payment')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Process Payment'));

      // Step 6: Select payment method
      await waitFor(() => {
        expect(getByText('Select Payment Method')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('payment-method-card'));

      // Step 7: Enter payment details
      fireEvent.changeText(getByPlaceholderText('Card Number'), '4242424242424242');
      fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
      fireEvent.changeText(getByPlaceholderText('CVC'), '123');

      // Step 8: Submit payment
      fireEvent.press(getByText('Pay $150.00'));

      // Step 9: Verify payment success
      await waitFor(() => {
        expect(getByText('Payment Successful')).toBeTruthy();
      });
    });
  });

  describe('Review and Rating Flow', () => {
    it('should complete review submission flow', async () => {
      AsyncStorage.setItem('userToken', 'mock_client_token');
      AsyncStorage.setItem('userRole', 'client');

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to completed jobs
      await waitFor(() => {
        expect(getByText('Completed Jobs')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Completed Jobs'));

      // Step 2: Select job to review
      await waitFor(() => {
        expect(getByText('Fix Kitchen Sink')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Fix Kitchen Sink'));

      // Step 3: Leave review
      await waitFor(() => {
        expect(getByText('Leave Review')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Leave Review'));

      // Step 4: Rate worker
      await waitFor(() => {
        expect(getByTestId('star-rating')).toBeTruthy();
      });
      
      // Rate 5 stars
      fireEvent.press(getByTestId('star-5'));

      // Step 5: Write review
      fireEvent.changeText(
        getByPlaceholderText('Write your review...'), 
        'Excellent work! Very professional and completed the job quickly.'
      );

      // Step 6: Submit review
      fireEvent.press(getByText('Submit Review'));

      // Step 7: Verify review submitted
      await waitFor(() => {
        expect(getByText('Review Submitted')).toBeTruthy();
      });
    });
  });

  describe('Profile Management Flow', () => {
    it('should complete profile update flow', async () => {
      AsyncStorage.setItem('userToken', 'mock_worker_token');
      AsyncStorage.setItem('userRole', 'worker');

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to profile
      await waitFor(() => {
        expect(getByText('Profile')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Profile'));

      // Step 2: Edit profile
      await waitFor(() => {
        expect(getByText('Edit Profile')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Edit Profile'));

      // Step 3: Update profile information
      await waitFor(() => {
        expect(getByPlaceholderText('Bio')).toBeTruthy();
      });
      
      fireEvent.changeText(
        getByPlaceholderText('Bio'), 
        'Updated bio: 10+ years of plumbing experience'
      );
      fireEvent.changeText(getByPlaceholderText('Hourly Rate'), '60');

      // Step 4: Add new skill
      fireEvent.press(getByText('Add Skill'));
      fireEvent.press(getByTestId('skill-electrical'));

      // Step 5: Upload portfolio image
      fireEvent.press(getByText('Add Portfolio Image'));
      
      // Mock image picker response
      await act(async () => {
        // Simulate image selection
      });

      // Step 6: Save changes
      fireEvent.press(getByText('Save Changes'));

      // Step 7: Verify profile updated
      await waitFor(() => {
        expect(getByText('Profile Updated')).toBeTruthy();
      });
    });
  });

  describe('Search and Filter Flow', () => {
    it('should complete job search and filter flow', async () => {
      AsyncStorage.setItem('userToken', 'mock_worker_token');
      AsyncStorage.setItem('userRole', 'worker');

      const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(<App />);

      // Step 1: Navigate to job search
      await waitFor(() => {
        expect(getByText('Find Jobs')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Find Jobs'));

      // Step 2: Search for jobs
      await waitFor(() => {
        expect(getByPlaceholderText('Search jobs...')).toBeTruthy();
      });
      
      fireEvent.changeText(getByPlaceholderText('Search jobs...'), 'plumbing');

      // Step 3: Apply filters
      fireEvent.press(getByText('Filters'));
      
      await waitFor(() => {
        expect(getByText('Apply Filters')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('category-plumbing'));
      fireEvent.changeText(getByPlaceholderText('Min Budget'), '100');
      fireEvent.changeText(getByPlaceholderText('Max Budget'), '300');
      fireEvent.press(getByText('Apply Filters'));

      // Step 4: View search results
      await waitFor(() => {
        expect(getByText('Search Results')).toBeTruthy();
      });

      // Step 5: Apply to job
      if (getByText('Fix Kitchen Sink')) {
        fireEvent.press(getByText('Fix Kitchen Sink'));
        
        await waitFor(() => {
          expect(getByText('Apply for Job')).toBeTruthy();
        });
        
        fireEvent.press(getByText('Apply for Job'));

        // Step 6: Submit application
        await waitFor(() => {
          expect(getByPlaceholderText('Why are you the right fit?')).toBeTruthy();
        });
        
        fireEvent.changeText(
          getByPlaceholderText('Why are you the right fit?'), 
          'I have 5 years of plumbing experience and can complete this job quickly.'
        );
        fireEvent.changeText(getByPlaceholderText('Proposed Rate'), '150');
        
        fireEvent.press(getByText('Submit Application'));

        // Step 7: Verify application submitted
        await waitFor(() => {
          expect(getByText('Application Submitted')).toBeTruthy();
        });
      }
    });
  });
});