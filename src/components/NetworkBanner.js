// src/components/NetworkBanner.js
// Bannière d'état de connexion réseau
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../styles/theme';

const NetworkBanner = () => {
  const { isOnline, isSyncing, syncData } = useNetwork();

  // On affiche la bannière uniquement si hors ligne
  if (isOnline && !isSyncing) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.bannerSyncing : styles.bannerOffline]}>
      <Ionicons
        name={isOnline ? 'sync' : 'cloud-offline-outline'}
        size={14}
        color={isOnline ? COLORS.accent : COLORS.warning}
      />
      <Text style={[styles.bannerText, { color: isOnline ? COLORS.accent : COLORS.warning }]}>
        {isSyncing
          ? 'Synchronisation en cours...'
          : 'Mode hors ligne — modifications enregistrées localement'}
      </Text>
      {isOnline && !isSyncing && (
        <TouchableOpacity onPress={syncData}>
          <Text style={styles.syncLink}>Sync</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  bannerOffline: {
    backgroundColor: COLORS.warningBg,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  bannerSyncing: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accentGlow,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  syncLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
});

export default NetworkBanner;