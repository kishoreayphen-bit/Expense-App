import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * AppLogo renders a compact brand mark.
 * TODO: When you add a tightly-cropped PNG at mobile/assets/logo.png,
 *       you can switch this component to use <Image> instead of the vector fallback.
 */
type Crop = { top?: number; right?: number; bottom?: number; left?: number }; // fractions 0..1 relative to intrinsic size

export default function AppLogo({ size = 40 }: { size?: number; crop?: Crop }) {
  // Simple brand mark using shapes (no external assets)
  const w = size * 1.8;
  const h = size * 0.9;
  const dot = Math.max(6, Math.round(size * 0.28));
  const barH = Math.max(8, Math.round(size * 0.22));
  return (
    <View style={[styles.row, { width: w, height: h }]}> 
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: dot, height: dot, borderRadius: dot/2, backgroundColor: '#4CAF50' }} />
        <View style={{ flex: 1, height: barH, backgroundColor: '#7C3AED', borderRadius: barH/2, marginLeft: dot * 0.5 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
});
