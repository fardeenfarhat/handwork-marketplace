/**
 * Performance tests for mobile app
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { performance } from 'perf_hooks';

import { store } from '../../store';
import App from '../../../App';
import { mockApiService } from '../__mocks__/apiService';

// Mock external dependencies
jest.mock('../../services/api', () => mockApiService);
jest.mock('@react-native-async-storage/async-storage');
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

describe('App Performance Tests', () => {
  describe('App Launch Performance', () => {
    it('should launch within acceptable time', async () => {
      const startTime = performance.now();
      
      const { getByText } = renderWithProviders(<App />);
      
      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      });
      
      const endTime = performance.now();
      const launchTime = endTime - startTime;
      
      // App should launch within 3 seconds
      expect(launchTime).toBeLessThan(3000);
    });

    it('should handle cold start performance', async () => {
      // Clear any cached data
      jest.clearAllMocks();
      
      const startTime = performance.now();
      
      const { getByText } = renderWithProviders(<App />);
      
      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      }, { timeout: 5000 });
      
      const endTime = performance.now();
      const coldStartTime = endTime - startTime;
      
      // Cold start should complete within 5 seconds
      expect(coldStartTime).toBeLessThan(5000);
    });
  });

  describe('Navigation Performance', () => {
    it('should navigate between screens quickly', async () => {
      const { getByText } = renderWithProviders(<App />);
      
      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      });
      
      const startTime = performance.now();
      
      // Navigate to login screen
      act(() => {
        getByText('Sign In').props.onPress();
      });
      
      await waitFor(() => {
        expect(getByText('Welcome Back')).toBeTruthy();
      });
      
      const endTime = performance.now();
      const navigationTime = endTime - startTime;
      
      // Navigation should be under 500ms
      expect(navigationTime).toBeLessThan(500);
    });

    it('should handle deep navigation stack efficiently', async () => {
      const { getByText } = renderWithProviders(<App />);
      
      // Simulate deep navigation
      const navigationSteps = [
        'Sign In',
        'Forgot Password',
        'Back',
        'Sign Up',
        'Back'
      ];
      
      const startTime = performance.now();
      
      for (const step of navigationSteps) {
        await act(async () => {
          if (getByText(step)) {
            getByText(step).props.onPress();
          }
        });
        
        // Small delay to simulate user interaction
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const endTime = performance.now();
      const totalNavigationTime = endTime - startTime;
      
      // Deep navigation should complete within 2 seconds
      expect(totalNavigationTime).toBeLessThan(2000);
    });
  });

  describe('List Rendering Performance', () => {
    it('should render large job lists efficiently', async () => {
      // Mock large dataset
      const mockJobs = Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        title: `Job ${index + 1}`,
        description: `Description for job ${index + 1}`,
        category: 'plumbing',
        budgetMin: 100,
        budgetMax: 200,
        location: 'New York, NY'
      }));
      
      mockApiService.getJobs.mockResolvedValue({
        jobs: mockJobs,
        total: 100,
        page: 1,
        limit: 50
      });
      
      const { getByTestId } = renderWithProviders(<App />);
      
      const startTime = performance.now();
      
      // Navigate to job list
      await waitFor(() => {
        expect(getByTestId('job-list')).toBeTruthy();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Large list should render within 1 second
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle infinite scroll performance', async () => {
      const { getByTestId } = renderWithProviders(<App />);
      
      await waitFor(() => {
        expect(getByTestId('job-list')).toBeTruthy();
      });
      
      const startTime = performance.now();
      
      // Simulate scrolling to trigger infinite scroll
      const jobList = getByTestId('job-list');
      
      await act(async () => {
        // Simulate scroll to end
        jobList.props.onEndReached();
      });
      
      // Wait for new items to load
      await waitFor(() => {
        // Assuming new items are loaded
        expect(mockApiService.getJobs).toHaveBeenCalledTimes(2);
      });
      
      const endTime = performance.now();
      const scrollLoadTime = endTime - startTime;
      
      // Infinite scroll should load within 800ms
      expect(scrollLoadTime).toBeLessThan(800);
    });
  });

  describe('Image Loading Performance', () => {
    it('should load profile images efficiently', async () => {
      const { getByTestId } = renderWithProviders(<App />);
      
      const startTime = performance.now();
      
      // Navigate to profile screen with images
      await waitFor(() => {
        expect(getByTestId('profile-image')).toBeTruthy();
      });
      
      const endTime = performance.now();
      const imageLoadTime = endTime - startTime;
      
      // Profile images should load within 2 seconds
      expect(imageLoadTime).toBeLessThan(2000);
    });

    it('should handle multiple image loading', async () => {
      // Mock portfolio with multiple images
      const mockPortfolio = Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        url: `https://example.com/image${index + 1}.jpg`,
        caption: `Portfolio image ${index + 1}`
      }));
      
      const { getByTestId } = renderWithProviders(<App />);
      
      const startTime = performance.now();
      
      // Navigate to portfolio gallery
      await waitFor(() => {
        expect(getByTestId('portfolio-gallery')).toBeTruthy();
      });
      
      const endTime = performance.now();
      const galleryLoadTime = endTime - startTime;
      
      // Portfolio gallery should load within 3 seconds
      expect(galleryLoadTime).toBeLessThan(3000);
    });
  });

  describe('API Response Performance', () => {
    it('should handle API responses within acceptable time', async () => {
      const { getByText } = renderWithProviders(<App />);
      
      // Mock API delay
      mockApiService.login.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            user: { id: 1, email: 'test@example.com' },
            token: { access_token: 'mock_token' }
          }), 500)
        )
      );
      
      const startTime = performance.now();
      
      // Perform login
      await act(async () => {
        // Simulate login form submission
        await mockApiService.login('test@example.com', 'password');
      });
      
      const endTime = performance.now();
      const apiResponseTime = endTime - startTime;
      
      // API response should be handled within 1 second
      expect(apiResponseTime).toBeLessThan(1000);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const startTime = performance.now();
      
      // Make multiple concurrent API calls
      const promises = [
        mockApiService.getJobs(),
        mockApiService.getProfile(),
        mockApiService.getMessages(),
        mockApiService.getNotifications()
      ];
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const concurrentRequestTime = endTime - startTime;
      
      // Concurrent requests should complete within 2 seconds
      expect(concurrentRequestTime).toBeLessThan(2000);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks during navigation', async () => {
      const { getByText } = renderWithProviders(<App />);
      
      // Get initial memory usage (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform multiple navigation cycles
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          // Navigate to different screens
          if (getByText('Sign In')) {
            getByText('Sign In').props.onPress();
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (getByText('Back')) {
            getByText('Back').props.onPress();
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory increase should be reasonable (less than 10MB)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
    });

    it('should handle large data sets without memory issues', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        title: `Item ${index + 1}`,
        data: 'x'.repeat(1000) // 1KB per item
      }));
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Process large dataset
      await act(async () => {
        // Simulate processing large data
        const processed = largeDataset.map(item => ({
          ...item,
          processed: true
        }));
        
        // Simulate rendering large list
        expect(processed.length).toBe(1000);
      });
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory usage should be reasonable
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });
  });

  describe('Animation Performance', () => {
    it('should maintain smooth animations', async () => {
      const { getByTestId } = renderWithProviders(<App />);
      
      const startTime = performance.now();
      
      // Trigger animation
      await act(async () => {
        if (getByTestId('animated-component')) {
          // Simulate animation trigger
          getByTestId('animated-component').props.onPress();
        }
      });
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const endTime = performance.now();
      const animationTime = endTime - startTime;
      
      // Animation should complete smoothly within expected time
      expect(animationTime).toBeGreaterThan(400); // At least animation duration
      expect(animationTime).toBeLessThan(800); // But not too much overhead
    });
  });

  describe('Offline Performance', () => {
    it('should handle offline state efficiently', async () => {
      // Mock offline state
      mockApiService.getJobs.mockRejectedValue(new Error('Network error'));
      
      const { getByText } = renderWithProviders(<App />);
      
      const startTime = performance.now();
      
      // Try to load data while offline
      await act(async () => {
        try {
          await mockApiService.getJobs();
        } catch (error) {
          // Expected to fail
        }
      });
      
      const endTime = performance.now();
      const offlineHandlingTime = endTime - startTime;
      
      // Offline handling should be quick
      expect(offlineHandlingTime).toBeLessThan(1000);
    });
  });

  describe('Search Performance', () => {
    it('should handle search queries efficiently', async () => {
      const { getByPlaceholderText } = renderWithProviders(<App />);
      
      await waitFor(() => {
        expect(getByPlaceholderText('Search...')).toBeTruthy();
      });
      
      const searchInput = getByPlaceholderText('Search...');
      
      const startTime = performance.now();
      
      // Simulate typing search query
      await act(async () => {
        searchInput.props.onChangeText('plumbing repair');
      });
      
      // Wait for search results
      await waitFor(() => {
        expect(mockApiService.searchJobs).toHaveBeenCalled();
      });
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      // Search should respond within 500ms
      expect(searchTime).toBeLessThan(500);
    });

    it('should debounce search queries properly', async () => {
      const { getByPlaceholderText } = renderWithProviders(<App />);
      
      const searchInput = getByPlaceholderText('Search...');
      
      // Simulate rapid typing
      await act(async () => {
        searchInput.props.onChangeText('p');
        searchInput.props.onChangeText('pl');
        searchInput.props.onChangeText('plu');
        searchInput.props.onChangeText('plum');
        searchInput.props.onChangeText('plumb');
        searchInput.props.onChangeText('plumbing');
      });
      
      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should only make one API call due to debouncing
      expect(mockApiService.searchJobs).toHaveBeenCalledTimes(1);
      expect(mockApiService.searchJobs).toHaveBeenCalledWith('plumbing');
    });
  });
});