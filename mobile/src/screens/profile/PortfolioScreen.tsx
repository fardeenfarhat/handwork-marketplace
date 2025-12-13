import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { PortfolioManager } from '@/components/profile';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { Colors, Gradients, Typography, Spacing, BorderRadius } from '@/styles/DesignSystem';

interface PortfolioImage {
  id: string;
  uri: string;
  name: string;
  description?: string;
}

export default function PortfolioScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    if (!user) return;

    try {
      const portfolioData = await apiService.getPortfolio();
      // Convert backend URLs to frontend format
      const portfolioImages = portfolioData.portfolioImages || [];
      const formattedImages = portfolioImages.map((url: string, index: number) => ({
        id: `portfolio_${index}`,
        uri: `${API_CONFIG.RAW_BASE}${url}`,
        name: `portfolio_${index}.jpg`,
        description: ''
      }));
      setImages(formattedImages);
    } catch (error) {
      Alert.alert('Error', 'Failed to load portfolio');
    }
  };

  const handleSavePortfolio = async (portfolioImages: PortfolioImage[]) => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      portfolioImages.forEach((image, index) => {
        formData.append(`image_${index}`, {
          uri: image.uri,
          type: 'image/jpeg',
          name: image.name,
        } as any);
      });
      
      await apiService.updatePortfolio(formData);
      
      Alert.alert('Success', 'Portfolio updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update portfolio');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={Gradients.orangeBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.iconContainer}>
                <Ionicons name="images-outline" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Work Gallery</Text>
                <Text style={styles.headerSubtitle}>
                  {images.length > 0 
                    ? `${images.length} ${images.length === 1 ? 'image' : 'images'} • ${10 - images.length} remaining`
                    : 'Showcase your best projects'}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <PortfolioManager
        images={images}
        onImagesChange={setImages}
        onSave={handleSavePortfolio}
        isLoading={isLoading}
        maxImages={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingBottom: Spacing[6],
  },
  headerContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: 'rgba(255, 255, 255, 0.95)',
  },
});