import { HapticService } from '../../utils/haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('impact feedback', () => {
    it('should provide light impact feedback', async () => {
      await expect(HapticService.light()).resolves.not.toThrow();
    });

    it('should provide medium impact feedback', async () => {
      await expect(HapticService.medium()).resolves.not.toThrow();
    });

    it('should provide heavy impact feedback', async () => {
      await expect(HapticService.heavy()).resolves.not.toThrow();
    });
  });

  describe('notification feedback', () => {
    it('should provide success notification feedback', async () => {
      await expect(HapticService.success()).resolves.not.toThrow();
    });

    it('should provide warning notification feedback', async () => {
      await expect(HapticService.warning()).resolves.not.toThrow();
    });

    it('should provide error notification feedback', async () => {
      await expect(HapticService.error()).resolves.not.toThrow();
    });
  });

  describe('selection feedback', () => {
    it('should provide selection feedback', async () => {
      await expect(HapticService.selection()).resolves.not.toThrow();
    });
  });
});