import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import oauthService from '@/services/oauth';

interface SocialLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function SocialLogin({
  onSuccess,
  onError,
}: SocialLoginProps) {
  const { loginWithSocial, isLoading } = useAuth();
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    if (isLoading || socialLoading) return;

    // Validate OAuth configuration
    if (!oauthService.validateConfiguration()) {
      const message = 'Social login is not properly configured. Please contact support.';
      onError?.(message);
      Alert.alert('Configuration Error', message);
      return;
    }

    // Check platform compatibility for Apple Sign-In
    if (provider === 'apple' && Platform.OS !== 'ios') {
      const message = 'Apple Sign-In is only available on iOS devices.';
      onError?.(message);
      Alert.alert('Platform Error', message);
      return;
    }

    setSocialLoading(provider);

    try {
      const result = await loginWithSocial(provider);
      
      if (result.meta.requestStatus === 'fulfilled') {
        onSuccess?.();
      } else {
        const errorMessage = result.payload as string || `${provider} login failed`;
        onError?.(errorMessage);
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || `${provider} login failed`;
      onError?.(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setSocialLoading(null);
    }
  };

  const isProviderLoading = (provider: string) => 
    isLoading || socialLoading === provider;

  return (
    <View style={styles.container}>
      <Button
        title="Continue with Google"
        variant="social"
        onPress={() => handleSocialLogin('google')}
        disabled={isProviderLoading('google')}
        loading={socialLoading === 'google'}
        icon={<Ionicons name="logo-google" size={20} color="#DB4437" style={styles.icon} />}
        style={styles.socialButton}
      />
      
      <Button
        title="Continue with Facebook"
        variant="social"
        onPress={() => handleSocialLogin('facebook')}
        disabled={isProviderLoading('facebook')}
        loading={socialLoading === 'facebook'}
        icon={<Ionicons name="logo-facebook" size={20} color="#4267B2" style={styles.icon} />}
        style={styles.socialButton}
      />
      
      {Platform.OS === 'ios' && (
        <Button
          title="Continue with Apple"
          variant="social"
          onPress={() => handleSocialLogin('apple')}
          disabled={isProviderLoading('apple')}
          loading={socialLoading === 'apple'}
          icon={<Ionicons name="logo-apple" size={20} color="#000" style={styles.icon} />}
          style={styles.socialButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  socialButton: {
    justifyContent: 'flex-start',
    paddingLeft: 20,
  },
  icon: {
    marginRight: 12,
  },
});