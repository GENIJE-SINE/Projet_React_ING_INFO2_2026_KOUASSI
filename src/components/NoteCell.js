// src/components/NoteCell.js
// Cellule affichant une note colorée selon les règles de validation
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COULEURS } from '../utils/gradesCalculator';
import { TYPOGRAPHY } from '../styles/theme';

/**
 * Cellule de note pour la matrice ou le bulletin
 * @param {number|null} note - La note à afficher
 * @param {string} couleur - 'rouge' | 'jaune' | 'vert' | 'gris'
 * @param {number} width - Largeur de la cellule
 * @param {boolean} bold - Affichage en gras
 */
const NoteCell = ({ note, couleur = 'gris', width = 90, bold = false, decimales = 2 }) => {
  const couleurInfo = COULEURS[couleur] || COULEURS.gris;
  const affichage = note !== null && note !== undefined ? Number(note).toFixed(decimales) : '—';

  return (
    <View style={[styles.cell, { width, backgroundColor: couleurInfo.bg }]}>
      <Text style={[
        styles.noteText,
        { color: couleurInfo.text },
        bold && styles.bold,
      ]}>
        {affichage}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(200, 220, 245, 0.3)',
  },
  noteText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bold: {
    fontWeight: '800',
    fontSize: 14,
  },
});

export default NoteCell;