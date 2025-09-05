/**
 * Lazy loading image component with optimization
 */
import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { ImageOptimizer, MemoryManager } from '../../utils/performance';

interface LazyImageProps {
  uri: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  maxWidth?: number;
  maxHeight?: number;
  enableCaching?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  uri,
  style,
  containerStyle,
  placeholder,
  onLoad,
  onError,
  resizeMode = 'cover',
  maxWidth,
  maxHeight,
  enableCaching = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUri, setImageUri] = useState<string>('');

  useEffect(() => {
    if (!uri) return;

    // Check cache first
    if (enableCaching) {
      const cached = MemoryManager.getCachedImage(uri);
      if (cached) {
        setImageUri(cached);
        setLoading(false);
        return;
      }
    }

    // Optimize image URI
    let optimizedUri = uri;
    if (maxWidth || maxHeight) {
      optimizedUri = ImageOptimizer.getImageUri(uri, maxWidth, maxHeight);
    }

    setImageUri(optimizedUri);
    
    // Cache the optimized URI
    if (enableCaching) {
      MemoryManager.cacheImage(uri, optimizedUri);
    }
  }, [uri, maxWidth, maxHeight, enableCaching]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoad?.();
  };

  const handleError = (err: any) => {
    setLoading(false);
    setError(true);
    onError?.(err);
  };

  if (error) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        <View style={styles.errorContainer}>
          {/* You could add an error icon here */}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {loading && (
        <View style={[styles.loadingContainer, style]}>
          {placeholder || <ActivityIndicator size="small" color="#666" />}
        </View>
      )}
      
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={[style, loading && styles.hidden]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  hidden: {
    opacity: 0,
  },
});