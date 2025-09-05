import React from 'react';
import { Text, TextProps } from 'react-native';

interface MockIconProps extends TextProps {
  name: string;
  size?: number;
  color?: string;
}

// Simple mock component for vector icons during development
export const MockIcon: React.FC<MockIconProps> = ({ 
  name, 
  size = 24, 
  color = '#000', 
  style,
  ...props 
}) => {
  return (
    <Text 
      style={[
        { 
          fontSize: size, 
          color, 
          fontWeight: 'bold',
          textAlign: 'center',
          minWidth: size,
        }, 
        style
      ]}
      {...props}
    >
      {getIconSymbol(name)}
    </Text>
  );
};

// Simple mapping of common icon names to symbols
const getIconSymbol = (name: string): string => {
  const iconMap: Record<string, string> = {
    'search': '🔍',
    'filter-list': '⚙️',
    'clear': '✕',
    'add': '+',
    'edit': '✏️',
    'delete': '🗑️',
    'location-on': '📍',
    'location-searching': '🎯',
    'my-location': '📍',
    'attach-money': '$',
    'schedule': '⏰',
    'near-me': '📍',
    'star': '⭐',
    'message': '💬',
    'directions': '🧭',
    'event': '📅',
    'keyboard-arrow-down': '▼',
    'check-circle': '✅',
    'work-outline': '💼',
    'assignment': '📋',
    'close': '✕',
  };
  
  return iconMap[name] || '●';
};

export default MockIcon;