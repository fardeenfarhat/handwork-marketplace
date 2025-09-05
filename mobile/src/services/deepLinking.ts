import * as Linking from 'expo-linking';
import { NavigationContainerRef } from '@react-navigation/native';

export interface DeepLinkConfig {
  screens: {
    Auth: {
      screens: {
        Login: 'login';
        Register: 'register';
        ForgotPassword: 'forgot-password';
        ResetPassword: 'reset-password/:token';
      };
    };
    Main: {
      screens: {
        Jobs: {
          screens: {
            JobsList: 'jobs';
            JobDetail: 'jobs/:jobId';
            JobPost: 'jobs/post';
            JobApplication: 'jobs/:jobId/apply';
          };
        };
        Profile: {
          screens: {
            ProfileMain: 'profile/:userId?';
            WorkerProfileEdit: 'profile/worker/edit';
            ClientProfileEdit: 'profile/client/edit';
          };
        };
        Messages: {
          screens: {
            MessagesList: 'messages';
            Chat: 'messages/:jobId';
          };
        };
        Payments: {
          screens: {
            PaymentMethods: 'payments';
            BookingConfirmation: 'payments/booking/:jobId/:workerId';
            JobTracking: 'payments/tracking/:bookingId';
            PaymentHistory: 'payments/history';
          };
        };
      };
    };
  };
}

export const linkingConfig = {
  prefixes: [
    Linking.createURL('/'),
    'handwork-marketplace://',
    'https://handwork-marketplace.com',
    'https://www.handwork-marketplace.com',
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password/:token',
        },
      },
      Main: {
        screens: {
          Jobs: {
            screens: {
              JobsList: 'jobs',
              JobDetail: 'jobs/:jobId',
              JobPost: 'jobs/post',
              JobApplication: 'jobs/:jobId/apply',
            },
          },
          Profile: {
            screens: {
              ProfileMain: 'profile/:userId?',
              WorkerProfileEdit: 'profile/worker/edit',
              ClientProfileEdit: 'profile/client/edit',
            },
          },
          Messages: {
            screens: {
              MessagesList: 'messages',
              Chat: 'messages/:jobId',
            },
          },
          Payments: {
            screens: {
              PaymentMethods: 'payments',
              BookingConfirmation: 'payments/booking/:jobId/:workerId',
              JobTracking: 'payments/tracking/:bookingId',
              PaymentHistory: 'payments/history',
            },
          },
        },
      },
    },
  },
};

export class DeepLinkingService {
  private navigationRef: NavigationContainerRef<any> | null = null;

  setNavigationRef(ref: NavigationContainerRef<any>) {
    this.navigationRef = ref;
  }

  // Generate shareable links
  generateJobLink(jobId: number): string {
    return `https://handwork-marketplace.com/jobs/${jobId}`;
  }

  generateProfileLink(userId: number): string {
    return `https://handwork-marketplace.com/profile/${userId}`;
  }

  generateBookingLink(bookingId: number): string {
    return `https://handwork-marketplace.com/payments/tracking/${bookingId}`;
  }

  // Handle incoming deep links
  async handleDeepLink(url: string): Promise<void> {
    if (!this.navigationRef) {
      console.warn('Navigation ref not set for deep linking');
      return;
    }

    try {
      const { hostname, pathname, queryParams } = Linking.parse(url);
      
      // Handle different deep link patterns
      if (pathname?.startsWith('/jobs/')) {
        const jobId = pathname.split('/')[2];
        if (jobId && !isNaN(Number(jobId))) {
          this.navigationRef.navigate('Main', {
            screen: 'Jobs',
            params: {
              screen: 'JobDetail',
              params: { jobId: Number(jobId) },
            },
          });
        }
      } else if (pathname?.startsWith('/profile/')) {
        const userId = pathname.split('/')[2];
        if (userId && !isNaN(Number(userId))) {
          this.navigationRef.navigate('Main', {
            screen: 'Profile',
            params: {
              screen: 'ProfileMain',
              params: { userId: Number(userId) },
            },
          });
        }
      } else if (pathname?.startsWith('/payments/tracking/')) {
        const bookingId = pathname.split('/')[3];
        if (bookingId && !isNaN(Number(bookingId))) {
          this.navigationRef.navigate('Main', {
            screen: 'Payments',
            params: {
              screen: 'JobTracking',
              params: { bookingId: Number(bookingId) },
            },
          });
        }
      } else if (pathname?.startsWith('/reset-password/')) {
        const token = pathname.split('/')[2];
        if (token) {
          this.navigationRef.navigate('Auth', {
            screen: 'ResetPassword',
            params: { token },
          });
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  // Share functionality
  async shareJob(jobId: number, jobTitle: string): Promise<void> {
    const url = this.generateJobLink(jobId);
    const message = `Check out this job: ${jobTitle}\n${url}`;
    
    try {
      // Use native sharing if available
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: jobTitle,
          text: `Check out this job: ${jobTitle}`,
          url: url,
        });
      } else {
        // Fallback to copying to clipboard
        await this.copyToClipboard(message);
      }
    } catch (error) {
      console.error('Error sharing job:', error);
      // Fallback to copying to clipboard
      await this.copyToClipboard(message);
    }
  }

  async shareProfile(userId: number, userName: string): Promise<void> {
    const url = this.generateProfileLink(userId);
    const message = `Check out ${userName}'s profile on Handwork Marketplace\n${url}`;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `${userName}'s Profile`,
          text: `Check out ${userName}'s profile on Handwork Marketplace`,
          url: url,
        });
      } else {
        await this.copyToClipboard(message);
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      await this.copyToClipboard(message);
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      const { setStringAsync } = await import('expo-clipboard');
      await setStringAsync(text);
      
      // Show haptic feedback
      const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
      await impactAsync(ImpactFeedbackStyle.Light);
      
      console.log('Copied to clipboard:', text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw error;
    }
  }
}

export const deepLinkingService = new DeepLinkingService();