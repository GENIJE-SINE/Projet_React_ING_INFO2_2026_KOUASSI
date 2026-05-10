// src/screens/RattrapageAdminScreen.js
// Gestion des dates de rattrapage par l'administration
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getClasses, getModules, getMatieresByModule,
  getEtudiantsByClasse, getNotesByEtudiant,
  construireResultats, getMatiereRattrapage,
  getRattrapagesByEtudiant, upsertRattrapage
} from '../database/database';
import {
  construireResultats as buildResultats,
  getMatiereRattrapage as getRattrapageInfo
} from '../utils/gradesCalculator';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

const RattrapageAdminScreen = ({ route, navigation }) => {
  const etudiantId = route?.params?.etudiantId;
  const [loading, setLoading] = useState(true);
  const [etudiant, setEtudiant] = useState(null);
  const [infoRattrapage, setInfoRattrapage] = useState({ obligatoires: [], suggestions: [] });
  const [dates, setDates] = useState({}); // { matiereId: dateString }
  const [saving, setSaving] = useState(false);

  useEffect(() => { charger(); }, [etudiantId]);

  const charger = async () => {
  if (!etudiantId) return;
  setLoading(true);
  try {
    const etud = await getEtudiantById(etudiantId);
    setEtudiant(etud);

    if (!etud?.classe_id) return;

    const semestre = etud.semestre || 1;
    const modules = await getModules(etud.classe_id, semestre);
    const matieresByModule = {};
    for (const mod of modules) {
      matieresByModule[mod.id] = await getMatieresByModule(mod.id);
    }

    const notesS1 = await getNotesByEtudiant(etudiantId, 1);
    const notesS2 = await getNotesByEtudiant(etudiantId, 2);
    const resultats = buildResultats(modules, matieresByModule, notesS1, notesS2);
    const info = getRattrapageInfo(resultats);
    setInfoRattrapage(info);

    const rats = await getRattrapagesByEtudiant(etudiantId);
    const datesMap = {};
    rats.forEach(r => { datesMap[r.matiere_id] = r.date_rattrapage || ''; });
    setDates(datesMap);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const handleDateChange = (matiereId, val) => {
    setDates(prev => ({ ...prev, [matiereId]: val }));
  };

  const sauvegarder = async () => {
    setSaving(true);
    try {
      const toutesLesMatières = [...infoRattrapage.obligatoires, ...infoRattrapage.suggestions];
      for (const mat of toutesLesMatières) {
        const date = dates[mat.id] || null;
        await upsertRattrapage(etudiantId, mat.id, date, 'planifie', mat.obligatoire ? 1 : 0);
      }
      Alert.alert('Succès', 'Dates de rattrapage enregistrées.');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </ScreenBackground>
    );
  }

  const total = infoRattrapage.obligatoires.length + infoRattrapage.suggestions.length;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Info étudiant */}
        <GlassCard style={styles.etudCard} variant="sm">
          <Text style={styles.etudNom}>{etudiant?.nom} {etudiant?.prenom}</Text>
          <Text style={styles.etudSub}>{etudiant?.matricule} — {etudiant?.classe_nom}</Text>
        </GlassCard>

        {total === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.emptyTitle}>Aucun rattrapage</Text>
            <Text style={styles.emptyText}>Cet étudiant n'a pas de rattrapage à planifier.</Text>
          </GlassCard>
        ) : (
          <>
            {/* Obligatoires */}
            {infoRattrapage.obligatoires.length > 0 && (
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: COLORS.danger }]} />
                  <Text style={styles.sectionTitle}>Rattrapages Obligatoires</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{infoRattrapage.obligatoires.length}</Text>
                  </View>
                </View>
                {infoRattrapage.obligatoires.map(mat => (
                  <RattrapageRow
                    key={mat.id}
                    matiere={mat}
                    couleur="rouge"
                    date={dates[mat.id] || ''}
                    onDateChange={v => handleDateChange(mat.id, v)}
                  />
                ))}
              </GlassCard>
            )}

            {/* Suggestions */}
            {infoRattrapage.suggestions.length > 0 && (
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: COLORS.warning }]} />
                  <Text style={styles.sectionTitle}>Suggestions de Rattrapage</Text>
                  <View style={[styles.countBadge, { backgroundColor: COLORS.warningBg }]}>
                    <Text style={[styles.countBadgeText, { color: COLORS.warning }]}>{infoRattrapage.suggestions.length}</Text>
                  </View>
                </View>
                {infoRattrapage.suggestions.map(mat => (
                  <RattrapageRow
                    key={mat.id}
                    matiere={mat}
                    couleur="jaune"
                    date={dates[mat.id] || ''}
                    onDateChange={v => handleDateChange(mat.id, v)}
                  />
                ))}
              </GlassCard>
            )}

            {/* Bouton sauvegarder */}
            <TouchableOpacity style={styles.saveBtn} onPress={sauvegarder} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <>
                  <Ionicons name="save-outline" size={18} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>Enregistrer les dates</Text>
                </>
              }
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBackground>
  );
};

const RattrapageRow = ({ matiere, couleur, date, onDateChange }) => {
  const borderColor = couleur === 'rouge' ? COLORS.danger : COLORS.warning;
  const bgColor = couleur === 'rouge' ? COLORS.dangerBg : COLORS.warningBg;

  return (
    <View style={[styles.rattrapRow, { borderLeftColor: borderColor, backgroundColor: bgColor }]}>
      <View style={styles.rattrapInfo}>
        <Text style={styles.rattrapNom}>{matiere.nom}</Text>
        <Text style={styles.rattrapMod}>{matiere.module_nom}</Text>
        <Text style={styles.rattrapNote}>Note actuelle : {matiere.noteFinale?.toFixed(2) ?? '—'}/20</Text>
      </View>
      <View style={styles.rattrapDateContainer}>
        <Text style={styles.rattrapDateLabel}>Date</Text>
        <TextInput
          style={styles.rattrapDateInput}
          value={date}
          onChangeText={onDateChange}
          placeholder="JJ/MM/AAAA"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  etudCard: { marginBottom: SPACING.sm },
  etudNom: { ...TYPOGRAPHY.h3 },
  etudSub: { ...TYPOGRAPHY.caption },
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: SPACING.xl },
  emptyTitle: { ...TYPOGRAPHY.h3 },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center' },
  section: { marginBottom: SPACING.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionDot: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { ...TYPOGRAPHY.h4, flex: 1 },
  countBadge: { backgroundColor: COLORS.dangerBg, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 2 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  rattrapRow: { borderLeftWidth: 3, borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rattrapInfo: { flex: 1 },
  rattrapNom: { ...TYPOGRAPHY.bodyBold },
  rattrapMod: { ...TYPOGRAPHY.caption },
  rattrapNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rattrapDateContainer: { alignItems: 'flex-end' },
  rattrapDateLabel: { ...TYPOGRAPHY.label, marginBottom: 4 },
  rattrapDateInput: { ...GLASS.input, width: 110, textAlign: 'center', fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, paddingVertical: 8, paddingHorizontal: 8 },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});

export default RattrapageAdminScreen;