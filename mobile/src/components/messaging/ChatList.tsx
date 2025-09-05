import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConversationItem } from '@/components/messaging';
import { useMessaging } from '@/hooks/useMessaging';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/utils/constants';
import { LoadingSpinner } from '@/components/common';

interface ChatListProps {
  onConversationPress: (jobId: number) => void;
  onRefresh?: () => void;
}

export default function ChatList({ onConversationPress, onRefresh }: ChatListProps) {
  const {
    conversationsList,
    isLoading,
    loadConversations,
    isUserOnline,
  } = useMessaging();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Filter conversations based on search query
  const filteredConversations = conversationsList.filter(conversation =>
    conversation.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conversation.lastMessage?.content && 
     conversation.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadConversations();
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const renderConversationItem = ({ item }: { item: any }) => (
    <ConversationItem
      jobId={item.jobId}
      jobTitle={item.jobTitle}
      otherUserName={item.otherUserName}
      otherUserAvatar={item.otherUserAvatar}
      lastMessage={item.lastMessage?.content}
      lastMessageTime={item.lastMessage?.createdAt}
      unreadCount={item.unreadCount}
      isOnline={isUserOnline(item.otherUserId)}
      onPress={onConversationPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start messaging when you apply for jobs or hire workers
      </Text>
    </View>
  );

  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Ionicons
            name="close"
            size={20}
            color={COLORS.textTertiary}
            style={styles.clearIcon}
            onPress={() => setSearchQuery('')}
          />
        )}
      </View>
    </View>
  );

  if (isLoading && filteredConversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchHeader()}
      
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.jobId.toString()}
        renderItem={renderConversationItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredConversations.length === 0 ? styles.emptyListContainer : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  clearIcon: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
  },
});