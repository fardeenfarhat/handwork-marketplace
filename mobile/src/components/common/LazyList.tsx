/**
 * Lazy loading list component with virtualization
 */
import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, View, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { throttle } from '../../utils/performance';

interface LazyListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onLoadMore?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  refreshing?: boolean;
  hasMore?: boolean;
  loadingThreshold?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement;
}

export function LazyList<T>({
  data,
  renderItem,
  keyExtractor,
  onLoadMore,
  onRefresh,
  loading = false,
  refreshing = false,
  hasMore = true,
  loadingThreshold = 0.7,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 10,
  removeClippedSubviews = true,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
}: LazyListProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Throttled load more function to prevent multiple calls
  const throttledLoadMore = useMemo(
    () => throttle(async () => {
      if (!onLoadMore || isLoadingMore || !hasMore) return;
      
      setIsLoadingMore(true);
      try {
        await onLoadMore();
      } catch (error) {
        console.error('Error loading more items:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }, 1000),
    [onLoadMore, isLoadingMore, hasMore]
  );

  const handleEndReached = useCallback(() => {
    throttledLoadMore();
  }, [throttledLoadMore]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error refreshing:', error);
      }
    }
  }, [onRefresh]);

  const renderFooter = useCallback(() => {
    if (ListFooterComponent) {
      return typeof ListFooterComponent === 'function' ? 
        <ListFooterComponent /> : ListFooterComponent;
    }

    if (isLoadingMore && hasMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      );
    }

    return null;
  }, [ListFooterComponent, isLoadingMore, hasMore]);

  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return renderItem({ item, index });
    },
    [renderItem]
  );

  const getItemLayout = useCallback(
    (data: T[] | null | undefined, index: number) => {
      // This is a basic implementation - you might want to customize this
      // based on your actual item heights for better performance
      const ITEM_HEIGHT = 100; // Estimate your item height
      return {
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      };
    },
    []
  );

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={loadingThreshold}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      getItemLayout={getItemLayout}
      // Performance optimizations
      disableVirtualization={false}
      legacyImplementation={false}
      updateCellsBatchingPeriod={50}
      // Prevent unnecessary re-renders
      extraData={data.length}
    />
  );
}

const styles = StyleSheet.create({
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});