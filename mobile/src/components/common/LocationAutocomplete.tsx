import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ViewStyle,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

interface LocationSuggestion {
  description: string;
  place_id?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectLocation?: (location: LocationSuggestion) => void;
  placeholder?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

// Mock location database - includes major cities worldwide
const MOCK_LOCATIONS: LocationSuggestion[] = [
  // USA
  { description: 'New York, NY, USA', city: 'New York', state: 'NY', country: 'USA', postalCode: '10001' },
  { description: 'Los Angeles, CA, USA', city: 'Los Angeles', state: 'CA', country: 'USA', postalCode: '90001' },
  { description: 'Chicago, IL, USA', city: 'Chicago', state: 'IL', country: 'USA', postalCode: '60601' },
  { description: 'Houston, TX, USA', city: 'Houston', state: 'TX', country: 'USA', postalCode: '77001' },
  { description: 'Phoenix, AZ, USA', city: 'Phoenix', state: 'AZ', country: 'USA', postalCode: '85001' },
  { description: 'Philadelphia, PA, USA', city: 'Philadelphia', state: 'PA', country: 'USA', postalCode: '19019' },
  { description: 'San Antonio, TX, USA', city: 'San Antonio', state: 'TX', country: 'USA', postalCode: '78201' },
  { description: 'San Diego, CA, USA', city: 'San Diego', state: 'CA', country: 'USA', postalCode: '92101' },
  { description: 'Dallas, TX, USA', city: 'Dallas', state: 'TX', country: 'USA', postalCode: '75201' },
  { description: 'San Jose, CA, USA', city: 'San Jose', state: 'CA', country: 'USA', postalCode: '95101' },
  { description: 'Austin, TX, USA', city: 'Austin', state: 'TX', country: 'USA', postalCode: '78701' },
  { description: 'San Francisco, CA, USA', city: 'San Francisco', state: 'CA', country: 'USA', postalCode: '94102' },
  { description: 'Seattle, WA, USA', city: 'Seattle', state: 'WA', country: 'USA', postalCode: '98101' },
  { description: 'Denver, CO, USA', city: 'Denver', state: 'CO', country: 'USA', postalCode: '80201' },
  { description: 'Washington, DC, USA', city: 'Washington', state: 'DC', country: 'USA', postalCode: '20001' },
  { description: 'Boston, MA, USA', city: 'Boston', state: 'MA', country: 'USA', postalCode: '02101' },
  { description: 'Miami, FL, USA', city: 'Miami', state: 'FL', country: 'USA', postalCode: '33101' },
  { description: 'Atlanta, GA, USA', city: 'Atlanta', state: 'GA', country: 'USA', postalCode: '30301' },
  
  // Canada
  { description: 'Toronto, ON, Canada', city: 'Toronto', state: 'ON', country: 'Canada', postalCode: 'M5H' },
  { description: 'Montreal, QC, Canada', city: 'Montreal', state: 'QC', country: 'Canada', postalCode: 'H2Y' },
  { description: 'Vancouver, BC, Canada', city: 'Vancouver', state: 'BC', country: 'Canada', postalCode: 'V6B' },
  { description: 'Calgary, AB, Canada', city: 'Calgary', state: 'AB', country: 'Canada', postalCode: 'T2P' },
  { description: 'Ottawa, ON, Canada', city: 'Ottawa', state: 'ON', country: 'Canada', postalCode: 'K1A' },
  
  // UK
  { description: 'London, England, UK', city: 'London', state: 'England', country: 'UK', postalCode: 'SW1A' },
  { description: 'Manchester, England, UK', city: 'Manchester', state: 'England', country: 'UK', postalCode: 'M1' },
  { description: 'Birmingham, England, UK', city: 'Birmingham', state: 'England', country: 'UK', postalCode: 'B1' },
  { description: 'Edinburgh, Scotland, UK', city: 'Edinburgh', state: 'Scotland', country: 'UK', postalCode: 'EH1' },
  { description: 'Glasgow, Scotland, UK', city: 'Glasgow', state: 'Scotland', country: 'UK', postalCode: 'G1' },
  
  // Australia
  { description: 'Sydney, NSW, Australia', city: 'Sydney', state: 'NSW', country: 'Australia', postalCode: '2000' },
  { description: 'Melbourne, VIC, Australia', city: 'Melbourne', state: 'VIC', country: 'Australia', postalCode: '3000' },
  { description: 'Brisbane, QLD, Australia', city: 'Brisbane', state: 'QLD', country: 'Australia', postalCode: '4000' },
  { description: 'Perth, WA, Australia', city: 'Perth', state: 'WA', country: 'Australia', postalCode: '6000' },
  { description: 'Adelaide, SA, Australia', city: 'Adelaide', state: 'SA', country: 'Australia', postalCode: '5000' },
  
  // Europe
  { description: 'Paris, France', city: 'Paris', state: '', country: 'France', postalCode: '75001' },
  { description: 'Marseille, France', city: 'Marseille', state: '', country: 'France', postalCode: '13001' },
  { description: 'Lyon, France', city: 'Lyon', state: '', country: 'France', postalCode: '69001' },
  { description: 'Toulouse, France', city: 'Toulouse', state: '', country: 'France', postalCode: '31000' },
  { description: 'Nice, France', city: 'Nice', state: '', country: 'France', postalCode: '06000' },
  { description: 'Berlin, Germany', city: 'Berlin', state: '', country: 'Germany', postalCode: '10115' },
  { description: 'Madrid, Spain', city: 'Madrid', state: '', country: 'Spain', postalCode: '28001' },
  { description: 'Rome, Italy', city: 'Rome', state: '', country: 'Italy', postalCode: '00100' },
  { description: 'Amsterdam, Netherlands', city: 'Amsterdam', state: '', country: 'Netherlands', postalCode: '1012' },
  { description: 'Brussels, Belgium', city: 'Brussels', state: '', country: 'Belgium', postalCode: '1000' },
  { description: 'Vienna, Austria', city: 'Vienna', state: '', country: 'Austria', postalCode: '1010' },
  { description: 'Dublin, Ireland', city: 'Dublin', state: '', country: 'Ireland', postalCode: 'D01' },
  
  // Asia - Pakistan
  { description: 'Karachi, Pakistan', city: 'Karachi', state: 'Sindh', country: 'Pakistan', postalCode: '75500' },
  { description: 'Lahore, Pakistan', city: 'Lahore', state: 'Punjab', country: 'Pakistan', postalCode: '54000' },
  { description: 'Islamabad, Pakistan', city: 'Islamabad', state: '', country: 'Pakistan', postalCode: '44000' },
  { description: 'Rawalpindi, Pakistan', city: 'Rawalpindi', state: 'Punjab', country: 'Pakistan', postalCode: '46000' },
  { description: 'Faisalabad, Pakistan', city: 'Faisalabad', state: 'Punjab', country: 'Pakistan', postalCode: '38000' },
  { description: 'Multan, Pakistan', city: 'Multan', state: 'Punjab', country: 'Pakistan', postalCode: '60000' },
  { description: 'Peshawar, Pakistan', city: 'Peshawar', state: 'KPK', country: 'Pakistan', postalCode: '25000' },
  { description: 'Quetta, Pakistan', city: 'Quetta', state: 'Balochistan', country: 'Pakistan', postalCode: '87300' },
  
  // Asia - Other
  { description: 'Tokyo, Japan', city: 'Tokyo', state: '', country: 'Japan', postalCode: '100-0001' },
  { description: 'Singapore, Singapore', city: 'Singapore', state: '', country: 'Singapore', postalCode: '018956' },
  { description: 'Seoul, South Korea', city: 'Seoul', state: '', country: 'South Korea', postalCode: '04524' },
  { description: 'Hong Kong, Hong Kong', city: 'Hong Kong', state: '', country: 'Hong Kong', postalCode: '' },
  { description: 'Dubai, UAE', city: 'Dubai', state: '', country: 'UAE', postalCode: '' },
  { description: 'Mumbai, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400001' },
  { description: 'Delhi, India', city: 'Delhi', state: '', country: 'India', postalCode: '110001' },
  { description: 'Bangkok, Thailand', city: 'Bangkok', state: '', country: 'Thailand', postalCode: '10200' },
  
  // Middle East
  { description: 'Tel Aviv, Israel', city: 'Tel Aviv', state: '', country: 'Israel', postalCode: '61000' },
  { description: 'Abu Dhabi, UAE', city: 'Abu Dhabi', state: '', country: 'UAE', postalCode: '' },
  
  // South America
  { description: 'São Paulo, Brazil', city: 'São Paulo', state: 'SP', country: 'Brazil', postalCode: '01000' },
  { description: 'Buenos Aires, Argentina', city: 'Buenos Aires', state: '', country: 'Argentina', postalCode: 'C1000' },
  { description: 'Mexico City, Mexico', city: 'Mexico City', state: '', country: 'Mexico', postalCode: '01000' },
  { description: 'Bogotá, Colombia', city: 'Bogotá', state: '', country: 'Colombia', postalCode: '110111' },
];

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChangeText,
  onSelectLocation,
  placeholder = 'Enter city, state or postal code',
  style,
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value.length > 0) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const fetchSuggestions = useCallback(async (searchText: string) => {
    if (searchText.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Filter mock locations based on search text
    const filtered = MOCK_LOCATIONS.filter(location => 
      location.description.toLowerCase().includes(searchText.toLowerCase()) ||
      (location.postalCode && location.postalCode.startsWith(searchText)) ||
      (location.state && location.state.toLowerCase().startsWith(searchText.toLowerCase())) ||
      (location.city && location.city.toLowerCase().includes(searchText.toLowerCase()))
    ).slice(0, 5); // Limit to 5 suggestions

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setLoading(false);
  }, []);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    console.log('Location selected:', suggestion.description);
    // Dismiss keyboard first
    Keyboard.dismiss();
    // Update the input value first
    onChangeText(suggestion.description);
    // Call the callback
    if (onSelectLocation) {
      onSelectLocation(suggestion);
    }
    // Clear and hide suggestions
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (value.length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow tap to register
    setTimeout(() => {
      setShowSuggestions(false);
    }, 300);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <Ionicons name="location-outline" size={20} color={Colors.neutral[500]} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[400]}
          editable={!disabled}
        />
        {loading && (
          <ActivityIndicator size="small" color={Colors.primary[500]} style={styles.loader} />
        )}
        {value.length > 0 && !loading && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.description}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="location" size={18} color={Colors.primary[500]} />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionText}>{item.description}</Text>
                  {item.postalCode && (
                    <Text style={styles.suggestionSubtext}>Postal Code: {item.postalCode}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 9999,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: Spacing[3],
  },
  icon: {
    marginRight: Spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
  },
  loader: {
    marginLeft: Spacing[2],
  },
  clearButton: {
    padding: Spacing[1],
    marginLeft: Spacing[1],
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing[1],
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
    maxHeight: 250,
    zIndex: 9999,
    elevation: 10,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: Spacing[3],
  },
  suggestionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[900],
    fontWeight: '500',
  },
  suggestionSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
});
