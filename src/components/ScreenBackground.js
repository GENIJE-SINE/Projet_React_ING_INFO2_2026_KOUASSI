// src/components/ScreenBackground.js
import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/theme';

// Fond d'écran avec dégradé et bulles décoratives (effet liquid)
const ScreenBackground = ({ children, edges = ['top'] }) => {
  return (
    <LinearGradient
      colors={[COLORS.backgroundGradientStart, '#F0F6FF', COLORS.backgroundGradientEnd]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradient}
    >
      {/* Bulles décoratives pour l'effet liquid glass */}
      <View style={[styles.bubble, styles.bubble1]} />
      <View style={[styles.bubble, styles.bubble2]} />
      <View style={[styles.bubble, styles.bubble3]} />

      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.25,
  },
  bubble1: {
    width: 280,
    height: 280,
    backgroundColor: '#93C5FD',
    top: -80,
    right: -80,
  },
  bubble2: {
    width: 200,
    height: 200,
    backgroundColor: '#BFDBFE',
    bottom: 100,
    left: -60,
  },
  bubble3: {
    width: 150,
    height: 150,
    backgroundColor: '#60A5FA',
    top: '45%',
    right: -40,
    opacity: 0.15,
  },
});

export default ScreenBackground;