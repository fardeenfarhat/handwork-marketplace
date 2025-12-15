import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatList } from '@/components/messaging';
import { MessagesStackParamList } from '@/types';
import { COLORS, TYPOGRAPHY, SPACING } from '@/utils/constants';
import { Gradients, Colors, Spacing, BorderRadius, Typography } from '@/styles/DesignSystem';

type MessagesScreenNavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'MessagesList'>;

export default function MessagesScreen() {
  const navigation = useNavigation<MessagesScreenNavigationProp>();

  // UNDER CONSTRUCTION - Temporarily disabled
  const UNDER_CONSTRUCTION = true;

  const handleConversationPress = (conversation: any) => {
    // Navigate to individual chat screen
    navigation.navigate('Chat', { 
      jobId: conversation.jobId,
      jobTitle: conversation.jobTitle,
      otherUserName: conversation.otherUserName,
      otherUserId: conversation.otherUserId,
    });
  };

  const handleRefresh = async () => {
    // Refresh conversations list
    console.log('Refreshing conversations...');
  };

  if (UNDER_CONSTRUCTION) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <LinearGradient
          colors={Gradients.primaryBlue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View style={styles.iconContainer}>
                  <Ionicons name="chatbubbles-outline" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>Messages</Text>
                  <Text style={styles.headerSubtitle}>Connect with clients and workers</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.constructionContainer}>
          <View style={styles.constructionIcon}>
            <Ionicons name="construct-outline" size={64} color={Colors.primary[500]} />
          </View>
          <Text style={styles.constructionTitle}>Under Construction</Text>
          <Text style={styles.constructionText}>
            We're building something amazing!{'\n'}
            Messaging feature coming soon.
          </Text>
        </View>
      </View>
    );
  }

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
    backgroundColor: Colors.neutral[50],
  },
  header: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
  },
  headerGradient: {
    paddingBottom: Spacing[4],
  },
  headerContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: Spacing[1],
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  constructionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
  },
  constructionIcon: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[5],
  },
  constructionTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  constructionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
  },
});