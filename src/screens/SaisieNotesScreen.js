// src/screens/SaisieNotesScreen.js
// Saisie des notes - réservé aux enseignants et administrateurs
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getClasses, getModules, getMatieresByModule,
  getEtudiantsByClasse, getNotesByEtudiant, upsertNote,
  getMatieresByEnseignant
} from '../database/database';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

const SaisieNotesScreen = ({ navigation }) => {
  const { user, isAdmin, isEnseignant, peutModifierMatiere, peutToutModifier } = useAuth();
  const { isOnline } = useNetwork();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [selectedSemestre, setSelectedSemestre] = useState(1);
  const [selectedSession, setSelectedSession] = useState(1);
  const [selectedMatiere, setSelectedMatiere] = useState(null);
  const [matieres, setMatieres] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [notes, setNotes] = useState({}); // { etudiantId: noteString }
  const [modified, setModified] = useState({});

  useEffect(() => { chargerClasses(); }, []);

  const chargerClasses = async () => {
    try {
      if (isEnseignant() && !isAdmin()) {
        // L'enseignant ne voit que ses matières
        const matEns = await getMatieresByEnseignant(user.id);
        // On extrait les classes uniques
        const classesMap = {};
        matEns.forEach(m => { classesMap[m.classe_id] = { id: m.classe_id, nom: m.classe_nom }; });
        setClasses(Object.values(classesMap));
        if (Object.values(classesMap).length > 0) {
          setSelectedClasse(Object.values(classesMap)[0]);
        }
      } else {
        const cls = await getClasses();
        setClasses(cls);
        if (cls.length > 0) setSelectedClasse(cls[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chargerMatieres = useCallback(async () => {
    if (!selectedClasse) return;
    try {
      const mods = await getModules(selectedClasse.id, selectedSemestre);
      let allMatieres = [];
      for (const mod of mods) {
        const mats = await getMatieresByModule(mod.id);
        mats.forEach(m => allMatieres.push({ ...m, module_nom: mod.nom }));
      }
      // Filtrer pour l'enseignant
      if (isEnseignant() && !isAdmin()) {
        allMatieres = allMatieres.filter(m => m.enseignant_id === user.id);
      }
      setMatieres(allMatieres);
      if (allMatieres.length > 0) setSelectedMatiere(allMatieres[0]);
    } catch (err) {
      console.error(err);
    }
  }, [selectedClasse, selectedSemestre]);

  useEffect(() => { chargerMatieres(); }, [chargerMatieres]);

  const chargerNotes = useCallback(async () => {
    if (!selectedMatiere || !selectedClasse) return;
    const etds = await getEtudiantsByClasse(selectedClasse.id);
    setEtudiants(etds);

    const notesMap = {};
    for (const etud of etds) {
      const notesEtud = await getNotesByEtudiant(etud.id, selectedSession);
      const noteMatiere = notesEtud.find(n => n.matiere_id === selectedMatiere.id);
      notesMap[etud.id] = noteMatiere ? String(noteMatiere.note) : '';
    }
    setNotes(notesMap);
    setModified({});
  }, [selectedMatiere, selectedClasse, selectedSession]);

  useEffect(() => { chargerNotes(); }, [chargerNotes]);

  const handleNoteChange = (etudiantId, valeur) => {
    // Valider que c'est un nombre entre 0 et 20
    if (valeur !== '' && (isNaN(valeur) || parseFloat(valeur) < 0 || parseFloat(valeur) > 20)) return;
    setNotes(prev => ({ ...prev, [etudiantId]: valeur }));
    setModified(prev => ({ ...prev, [etudiantId]: true }));
  };

  const sauvegarderNotes = async () => {
    if (!isOnline) {
      Alert.alert(
        'Hors ligne',
        'Vous devez être connecté pour enregistrer les notes. Les modifications seront synchronisées dès la reconnexion.',
        [{ text: 'OK' }]
      );
    }

    const modifiedIds = Object.keys(modified).filter(id => modified[id]);
    if (modifiedIds.length === 0) {
      Alert.alert('Info', 'Aucune modification à enregistrer.');
      return;
    }

    setSaving(true);
    try {
      for (const etudId of modifiedIds) {
        const noteStr = notes[etudId];
        if (noteStr !== '') {
          await upsertNote(parseInt(etudId), selectedMatiere.id, selectedSession, parseFloat(noteStr));
        }
      }
      setModified({});
      Alert.alert('Succès', `${modifiedIds.length} note(s) enregistrée(s).`);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer les notes.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </ScreenBackground>
    );
  }

  const modifiedCount = Object.values(modified).filter(Boolean).length;

  return (
    <ScreenBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* Indicateur hors ligne */}
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={COLORS.warning} />
              <Text style={styles.offlineText}>Mode hors ligne — les modifications seront synchronisées à la reconnexion</Text>
            </View>
          )}

          {/* Sélection classe */}
          <GlassCard style={styles.selectorCard} variant="sm">
            <Text style={styles.selectorLabel}>Classe</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.chip, selectedClasse?.id === cls.id && styles.chipActive]}
                  onPress={() => setSelectedClasse(cls)}
                >
                  <Text style={[styles.chipText, selectedClasse?.id === cls.id && styles.chipTextActive]}>
                    {cls.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>

          {/* Sélection semestre + session */}
          <View style={styles.row}>
            <GlassCard style={[styles.selectorCard, styles.flex1]} variant="sm">
              <Text style={styles.selectorLabel}>Semestre</Text>
              <View style={styles.btnGroup}>
                {[1, 2].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.btnGroupItem, selectedSemestre === s && styles.btnGroupItemActive]}
                    onPress={() => setSelectedSemestre(s)}
                  >
                    <Text style={[styles.btnGroupText, selectedSemestre === s && styles.btnGroupTextActive]}>S{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>

            <GlassCard style={[styles.selectorCard, styles.flex1]} variant="sm">
              <Text style={styles.selectorLabel}>Session</Text>
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.btnGroupItem, selectedSession === 1 && styles.btnGroupItemActive]}
                  onPress={() => setSelectedSession(1)}
                >
                  <Text style={[styles.btnGroupText, selectedSession === 1 && styles.btnGroupTextActive]}>Normale</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnGroupItem, selectedSession === 2 && styles.btnGroupItemActive]}
                  onPress={() => setSelectedSession(2)}
                >
                  <Text style={[styles.btnGroupText, selectedSession === 2 && styles.btnGroupTextActive]}>Rattrapage</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>

          {/* Sélection matière */}
          <GlassCard style={styles.selectorCard} variant="sm">
            <Text style={styles.selectorLabel}>Matière</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {matieres.map(mat => (
                <TouchableOpacity
                  key={mat.id}
                  style={[styles.chip, selectedMatiere?.id === mat.id && styles.chipActive]}
                  onPress={() => setSelectedMatiere(mat)}
                >
                  <Text style={[styles.chipText, selectedMatiere?.id === mat.id && styles.chipTextActive]}>
                    {mat.nom}
                  </Text>
                  <Text style={styles.chipSub}>{mat.module_nom}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>

          {/* Info matière sélectionnée */}
          {selectedMatiere && (
            <GlassCard style={styles.matiereInfo} variant="sm">
              <View style={styles.matiereInfoRow}>
                <Ionicons name="book-outline" size={16} color={COLORS.accent} />
                <Text style={styles.matiereInfoText}>{selectedMatiere.nom}</Text>
                <Text style={styles.matiereInfoCoeff}>Coeff. {selectedMatiere.coefficient}</Text>
              </View>
              <Text style={styles.matiereInfoEns}>
                Enseignant : {selectedMatiere.enseignant_prenom} {selectedMatiere.enseignant_nom}
              </Text>
            </GlassCard>
          )}

          {/* Liste des étudiants + saisie notes */}
          <GlassCard style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesTitle}>Saisie des notes — /20</Text>
              {modifiedCount > 0 && (
                <View style={styles.modifiedBadge}>
                  <Text style={styles.modifiedBadgeText}>{modifiedCount} modif.</Text>
                </View>
              )}
            </View>

            {etudiants.length === 0 ? (
              <Text style={styles.emptyText}>Aucun étudiant dans cette classe.</Text>
            ) : (
              etudiants.map((etud, idx) => (
                <View
                  key={etud.id}
                  style={[styles.etudRow, idx % 2 === 0 && styles.etudRowEven]}
                >
                  <View style={styles.etudInfo}>
                    <Text style={styles.etudNom}>{etud.nom} {etud.prenom}</Text>
                    <Text style={styles.etudMatricule}>{etud.matricule}</Text>
                  </View>
                  <View style={styles.noteInputContainer}>
                    {modified[etud.id] && <View style={styles.modifiedDot} />}
                    <TextInput
                      style={[styles.noteInput, modified[etud.id] && styles.noteInputModified]}
                      value={notes[etud.id] || ''}
                      onChangeText={v => handleNoteChange(etud.id, v)}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={COLORS.textTertiary}
                      maxLength={5}
                    />
                  </View>
                </View>
              ))
            )}
          </GlassCard>

          {/* Bouton sauvegarder */}
          {modifiedCount > 0 && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={sauvegarderNotes}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>
                    Enregistrer {modifiedCount} note{modifiedCount > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  row: { flexDirection: 'row', gap: SPACING.sm },
  flex1: { flex: 1 },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.warningBg, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  offlineText: { flex: 1, fontSize: 12, color: COLORS.warning, fontWeight: '500' },

  selectorCard: { marginBottom: SPACING.sm },
  selectorLabel: { ...TYPOGRAPHY.label, marginBottom: 8 },
  chipScroll: { maxHeight: 60 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: COLORS.glassBorder, marginRight: 8, justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.accent },
  chipSub: { fontSize: 10, color: COLORS.textTertiary, marginTop: 1 },

  btnGroup: { flexDirection: 'row', gap: 6 },
  btnGroupItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: COLORS.glassBorder },
  btnGroupItemActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  btnGroupText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  btnGroupTextActive: { color: COLORS.accent },

  matiereInfo: { marginBottom: SPACING.sm },
  matiereInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  matiereInfoText: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  matiereInfoCoeff: { ...TYPOGRAPHY.caption, color: COLORS.accent, fontWeight: '700' },
  matiereInfoEns: { ...TYPOGRAPHY.caption },

  notesCard: { marginBottom: SPACING.md },
  notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  notesTitle: { ...TYPOGRAPHY.h4 },
  modifiedBadge: { backgroundColor: COLORS.accentLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  modifiedBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.accent },

  etudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.divider },
  etudRowEven: { backgroundColor: 'rgba(248,250,255,0.3)', marginHorizontal: -16, paddingHorizontal: 16 },
  etudInfo: { flex: 1 },
  etudNom: { ...TYPOGRAPHY.bodyBold },
  etudMatricule: { ...TYPOGRAPHY.caption },
  noteInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  noteInput: { ...GLASS.input, width: 70, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingVertical: 10, paddingHorizontal: 8 },
  noteInputModified: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },

  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', paddingVertical: SPACING.lg },

  saveButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginBottom: SPACING.md, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

export default SaisieNotesScreen;