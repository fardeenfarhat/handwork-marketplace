import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChatList } from '@/components/messaging';
import { MessagesStackParamList } from '@/types';
import { COLORS, TYPOGRAPHY, SPACING } from '@/utils/constants';

type MessagesScreenNavigationProp = StackNavigationProp<MessagesStackParamList, 'MessagesList'>;

export default function MessagesScreen() {
  const navigation = useNavigation<MessagesScreenNavigationProp>();

  const handleConversationPress = (jobId: number) => {
    // Navigate to individual chat screen
    navigation.navigate('Chat', { 
      jobId,
      jobTitle: `Job #${jobId}`,
      otherUserName: 'User Name', // This should come from actual data
      otherUserId: 1, // This should come from actual data
    });
  };

  const handleRefresh = async () => {
    // Refresh conversations list
    console.log('Refreshing conversations...');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      
      <ChatList
        onConversationPress={handleConversationPress}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
});