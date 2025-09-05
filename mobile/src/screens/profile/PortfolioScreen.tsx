import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { PortfolioManager } from '@/components/profile';
import apiService from '@/services/api';

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
      // In a real app, this would fetch the portfolio images from the API
      // For now, we'll use mock data
      setImages([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load portfolio');
    }
  };

  const handleSavePortfolio = async (portfolioImages: PortfolioImage[]) => {
    try {
      setIsLoading(true);
      
      // In a real app, this would upload images to the API
      // const formData = new FormData();
      // portfolioImages.forEach((image, index) => {
      //   formData.append(`image_${index}`, {
      //     uri: image.uri,
      //     type: 'image/jpeg',
      //     name: image.name,
      //   } as any);
      // });
      // await apiService.updatePortfolio(formData);
      
      // For now, we'll just simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Success', 'Portfolio updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update portfolio');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PortfolioManager
        images={images}
        onImagesChange={setImages}
        onSave={handleSavePortfolio}
        isLoading={isLoading}
        maxImages={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});