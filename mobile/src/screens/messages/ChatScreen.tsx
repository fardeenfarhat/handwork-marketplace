import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ChatScreen as ChatComponent } from '@/components/messaging';
import { COLORS, TYPOGRAPHY, SPACING } from '@/utils/constants';

type ChatScreenRouteProp = RouteProp<{
  Chat: {
    jobId: number;
    jobTitle?: string;
    otherUserName?: string;
    otherUserId?: number;
  };
}, 'Chat'>;

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<ChatScreenRouteProp>();
  const { jobId, jobTitle, otherUserName, otherUserId } = route.params;
  
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text style={styles.headerUserName} numberOfLines={1}>
            {otherUserName || 'User'}
          </Text>
          <Text style={styles.headerJobTitle} numberOfLines={1}>
            {jobTitle || `Job #${jobId}`}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCallPress}
          >
            <Ionicons name="call" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleInfoPress}
          >
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, otherUserName, jobTitle, jobId]);

  const handleCallPress = () => {
    // Handle call functionality
    console.log('Call user:', otherUserId);
  };

  const handleInfoPress = () => {
    // Navigate to job details or user profile
    console.log('Show info for job:', jobId);
  };

  const handleSendMessage = (message: any) => {
    // Handle message sent callback
    console.log('Message sent:', message);
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please log in to view messages</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ChatComponent
        jobId={jobId}
        currentUserId={currentUser.id}
        otherUserName={otherUserName}
        otherUserId={otherUserId}
        onSendMessage={handleSendMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerUserName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  headerJobTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});