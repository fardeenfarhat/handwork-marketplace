import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { AddressSuggestion, GeocodeResult } from '@/services/location';
import { useLocation } from '@/hooks/useLocation';

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelect?: (address: GeocodeResult) => void;
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  disabled?: boolean;
  showCurrentLocationButton?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChangeText,
  onAddressSelect,
  placeholder = 'Enter address...',
  style,
  inputStyle,
  disabled = false,
  showCurrentLocationButton = true,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const inputRef = useRef<TextInput>(null);
  const { getAddressSuggestions, getCurrentLocation, reverseGeocode, currentLocation, geocodeAddress } = useLocation();

  useEffect(() => {
    if (value.length > 2) {
      // Debounce the API call
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(async () => {
        setLoading(true);
        try {
          const results = await getAddressSuggestions(value);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Error getting address suggestions:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);

      setDebounceTimer(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [value, getAddressSuggestions]);

  const handleSuggestionPress = async (suggestion: AddressSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    onChangeText(suggestion.description);
    Keyboard.dismiss();

    if (onAddressSelect) {
      try {
        // Get full address details using place ID
        const placeDetails = await getPlaceDetails(suggestion.placeId);
        if (placeDetails) {
          onAddressSelect(placeDetails);
        }
      } catch (error) {
        console.error('Error getting place details:', error);
      }
    }
  };

  const getPlaceDetails = async (placeId: string): Promise<GeocodeResult | null> => {
    // This would typically use the location service's getPlaceDetails method
    // For now, we'll geocode the address text
    try {
      const result = await geocodeAddress(value);
      return result;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  };

  const handleCurrentLocationPress = async () => {
    try {
      setLoading(true);
      await getCurrentLocation();
      
      if (currentLocation) {
        const address = await reverseGeocode(currentLocation);
        if (address) {
          onChangeText(address);
          
          if (onAddressSelect) {
            onAddressSelect({
              address,
              coordinates: currentLocation,
              formattedAddress: address,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for suggestion tap
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const renderSuggestion = ({ item }: { item: AddressSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionMainText}>{item.mainText}</Text>
        <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="words"
        />
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
          </View>
        )}
        
        {showCurrentLocationButton && !disabled && (
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleCurrentLocationPress}
            disabled={loading}
          >
            <Text style={styles.currentLocationButtonText}>📍</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.placeId}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    paddingHorizontal: 8,
  },
  currentLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  currentLocationButtonText: {
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default AddressAutocomplete;