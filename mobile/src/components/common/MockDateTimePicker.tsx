import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MockDateTimePickerProps {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  minimumDate?: Date;
  onChange: (event: any, selectedDate?: Date) => void;
}

// Mock DateTimePicker component for development
export const MockDateTimePicker: React.FC<MockDateTimePickerProps> = ({
  value,
  mode,
  onChange,
}) => {
  const handleDateChange = () => {
    // Simulate date selection - just return the current date
    const event = { type: 'set' };
    onChange(event, new Date());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Date Picker (Mock)</Text>
      <Text style={styles.currentDate}>
        Current: {value.toLocaleDateString()}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleDateChange}>
        <Text style={styles.buttonText}>Select Date</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  currentDate: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MockDateTimePicker;