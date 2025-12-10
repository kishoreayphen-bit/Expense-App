import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeView';
import { radius, space } from '../theme/tokens';

interface ModeIndicatorProps {
  style?: any;
}

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({ style }) => {
  const { theme, isCompanyMode } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.chipBg, borderColor: theme.primary }, style]}>
      <View style={[styles.dot, { backgroundColor: theme.primary }]} />
      <Text style={[styles.text, { color: theme.chipText }]}>
        {isCompanyMode ? 'COMPANY' : 'PERSONAL'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
