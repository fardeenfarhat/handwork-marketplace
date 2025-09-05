import { ClipboardService } from '../../utils/clipboard';

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue('test string'),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('ClipboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard successfully', async () => {
      const testText = 'Test clipboard text';
      
      await expect(ClipboardService.copyToClipboard(testText, false)).resolves.not.toThrow();
    });
  });

  describe('copyJobLink', () => {
    it('should generate and copy job link', async () => {
      const jobId = 123;
      const jobTitle = 'Test Job';
      
      await expect(ClipboardService.copyJobLink(jobId, jobTitle)).resolves.not.toThrow();
    });
  });

  describe('copyProfileLink', () => {
    it('should generate and copy profile link', async () => {
      const userId = 456;
      const userName = 'Test User';
      
      await expect(ClipboardService.copyProfileLink(userId, userName)).resolves.not.toThrow();
    });
  });

  describe('copyBookingLink', () => {
    it('should generate and copy booking link', async () => {
      const bookingId = 789;
      
      await expect(ClipboardService.copyBookingLink(bookingId)).resolves.not.toThrow();
    });
  });
});