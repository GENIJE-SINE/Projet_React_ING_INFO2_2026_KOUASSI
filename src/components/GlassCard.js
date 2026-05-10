// src/components/GlassCard.js
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, GLASS, SHADOWS } from '../styles/theme';


const GlassCard = ({ children, style, onPress, variant = 'default', noPadding = false }) => {
  const cardStyle = variant === 'sm' ? GLASS.cardSm : GLASS.card;

  return (
    <View style={[cardStyle, !noPadding && styles.padding, style]}>
      {/* Reflet en haut pour l'effet verre */}
      <View style={styles.topReflection} pointerEvents="none" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  padding: {
    padding: 16,
  },
  topReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
});

export default GlassCard;