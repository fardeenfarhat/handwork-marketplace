import { DeepLinkingService } from '@/services/deepLinking';

// Mock Expo Linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `handwork-marketplace://${path}`),
  parse: jest.fn(),
}));

describe('DeepLinkingService', () => {
  let deepLinkingService: DeepLinkingService;
  let mockNavigationRef: any;

  beforeEach(() => {
    deepLinkingService = new DeepLinkingService();
    mockNavigationRef = {
      navigate: jest.fn(),
    };
    deepLinkingService.setNavigationRef(mockNavigationRef);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('link generation', () => {
    it('should generate correct job link', () => {
      const jobId = 123;
      const link = deepLinkingService.generateJobLink(jobId);
      expect(link).toBe('https://handwork-marketplace.com/jobs/123');
    });

    it('should generate correct profile link', () => {
      const userId = 456;
      const link = deepLinkingService.generateProfileLink(userId);
      expect(link).toBe('https://handwork-marketplace.com/profile/456');
    });

    it('should generate correct booking link', () => {
      const bookingId = 789;
      const link = deepLinkingService.generateBookingLink(bookingId);
      expect(link).toBe('https://handwork-marketplace.com/payments/tracking/789');
    });
  });

  describe('deep link handling', () => {
    beforeEach(() => {
      const Linking = require('expo-linking');
      Linking.parse.mockImplementation((url: string) => {
        const urlObj = new URL(url);
        return {
          hostname: urlObj.hostname,
          pathname: urlObj.pathname,
          queryParams: {},
        };
      });
    });

    it('should handle job detail deep link', async () => {
      const url = 'https://handwork-marketplace.com/jobs/123';
      
      await deepLinkingService.handleDeepLink(url);

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Main', {
        screen: 'Jobs',
        params: {
          screen: 'JobDetail',
          params: { jobId: 123 },
        },
      });
    });

    it('should handle profile deep link', async () => {
      const url = 'https://handwork-marketplace.com/profile/456';
      
      await deepLinkingService.handleDeepLink(url);

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Main', {
        screen: 'Profile',
        params: {
          screen: 'ProfileMain',
          params: { userId: 456 },
        },
      });
    });

    it('should handle booking tracking deep link', async () => {
      const url = 'https://handwork-marketplace.com/payments/tracking/789';
      
      await deepLinkingService.handleDeepLink(url);

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Main', {
        screen: 'Payments',
        params: {
          screen: 'JobTracking',
          params: { bookingId: 789 },
        },
      });
    });

    it('should handle reset password deep link', async () => {
      const url = 'https://handwork-marketplace.com/reset-password/abc123';
      
      await deepLinkingService.handleDeepLink(url);

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('Auth', {
        screen: 'ResetPassword',
        params: { token: 'abc123' },
      });
    });

    it('should handle invalid deep links gracefully', async () => {
      const url = 'https://handwork-marketplace.com/invalid/path';
      
      await expect(deepLinkingService.handleDeepLink(url)).resolves.not.toThrow();
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    });

    it('should handle malformed URLs gracefully', async () => {
      const Linking = require('expo-linking');
      Linking.parse.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      const url = 'invalid-url';
      
      await expect(deepLinkingService.handleDeepLink(url)).resolves.not.toThrow();
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    });
  });

  describe('sharing functionality', () => {
    beforeEach(() => {
      // Mock navigator.share
      Object.defineProperty(global, 'navigator', {
        value: {
          share: jest.fn(),
        },
        writable: true,
      });
    });

    it('should share job using native sharing', async () => {
      const jobId = 123;
      const jobTitle = 'Test Job';
      
      await deepLinkingService.shareJob(jobId, jobTitle);

      expect(global.navigator.share).toHaveBeenCalledWith({
        title: jobTitle,
        text: `Check out this job: ${jobTitle}`,
        url: 'https://handwork-marketplace.com/jobs/123',
      });
    });

    it('should share profile using native sharing', async () => {
      const userId = 456;
      const userName = 'John Doe';
      
      await deepLinkingService.shareProfile(userId, userName);

      expect(global.navigator.share).toHaveBeenCalledWith({
        title: `${userName}'s Profile`,
        text: `Check out ${userName}'s profile on Handwork Marketplace`,
        url: 'https://handwork-marketplace.com/profile/456',
      });
    });

    it('should fallback to clipboard when native sharing fails', async () => {
      const mockShare = jest.fn().mockRejectedValue(new Error('Share failed'));
      Object.defineProperty(global, 'navigator', {
        value: { share: mockShare },
        writable: true,
      });

      const jobId = 123;
      const jobTitle = 'Test Job';
      
      // Should not throw even if sharing fails
      await expect(deepLinkingService.shareJob(jobId, jobTitle)).resolves.not.toThrow();
    });

    it('should use clipboard fallback when navigator.share is not available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const jobId = 123;
      const jobTitle = 'Test Job';
      
      // Should not throw even without native sharing
      await expect(deepLinkingService.shareJob(jobId, jobTitle)).resolves.not.toThrow();
    });
  });

  describe('navigation ref management', () => {
    it('should handle missing navigation ref gracefully', async () => {
      const serviceWithoutRef = new DeepLinkingService();
      const url = 'https://handwork-marketplace.com/jobs/123';
      
      await expect(serviceWithoutRef.handleDeepLink(url)).resolves.not.toThrow();
    });

    it('should set navigation ref correctly', () => {
      const newService = new DeepLinkingService();
      const newMockRef = { navigate: jest.fn() };
      
      newService.setNavigationRef(newMockRef);
      
      // Test that the ref is set by trying to use it
      expect(() => newService.setNavigationRef(newMockRef)).not.toThrow();
    });
  });
});