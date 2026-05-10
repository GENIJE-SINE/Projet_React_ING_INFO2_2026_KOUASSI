// src/screens/MatriceScreen.js
// Matrice des résultats de toute la classe (vue tableau)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getModules, getMatieresByModule, getNotesByEtudiant,
  getEtudiantsByClasse, getClasses
} from '../database/database';
import { construireResultats, getCouleurMatiere, getCouleurModule, COULEURS } from '../utils/gradesCalculator';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

const MatriceScreen = ({ navigation, route }) => {
  const { user, isAdmin, isEnseignant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [selectedSemestre, setSelectedSemestre] = useState(1);
  const [modules, setModules] = useState([]);
  const [matieresByModule, setMatieresByModule] = useState({});
  const [etudiants, setEtudiants] = useState([]);
  const [resultatsMap, setResultatsMap] = useState({});
  const insets = useSafeAreaInsets();

  // L'étudiant ne peut voir que sa classe
  const classeFixed = !isAdmin() && !isEnseignant();

  const chargerClasses = useCallback(async () => {
    const cls = await getClasses(); // On récupère la liste
    setClasses(cls);

    if (cls.length > 0) {
        // STRATÉGIE DE SÉLECTION :
        // 1. On cherche d'abord la classe qui correspond à l'ID de l'étudiant
        const classeDeLetudiant = cls.find(c => c.id === user.classe_id);
        
        // 2. Si on la trouve, on la sélectionne. Sinon (ex: Admin), on prend la première
        setSelectedClasse(classeDeLetudiant || cls[0]);
    }
}, [user.classe_id]); // On surveille l'ID de classe de l'utilisateur


// Supprimer chargerClasses ET le useEffect défectueux
// Remplacer par ceci :

useEffect(() => {
  const loadInitialData = async () => {
    const allClasses = await getClasses();
    setClasses(allClasses);
    if (allClasses.length > 0) {
      // Pour un étudiant : sélectionner SA classe
      // Pour un admin/enseignant : sélectionner la première
      const classeDeLetudiant = allClasses.find(c => c.id === user.classe_id);
      setSelectedClasse(classeDeLetudiant || allClasses[0]);
    }
  };
  loadInitialData();
}, [user.classe_id]); // ← surveiller l'ID de classe

  const chargerMatrice = useCallback(async () => {
    if (!selectedClasse) return;
    setLoading(true);
    try {
      const mods = await getModules(selectedClasse.id, selectedSemestre);
      setModules(mods);

      const matMap = {};
      for (const mod of mods) {
        matMap[mod.id] = await getMatieresByModule(mod.id);
      }
      setMatieresByModule(matMap);

      const etuds = await getEtudiantsByClasse(selectedClasse.id);
      setEtudiants(etuds);

      const resMap = {};
      for (const etud of etuds) {
        const notesS1 = await getNotesByEtudiant(etud.id, 1);
        const notesS2 = await getNotesByEtudiant(etud.id, 2);
        resMap[etud.id] = construireResultats(mods, matMap, notesS1, notesS2);
      }
      setResultatsMap(resMap);
    } catch (err) {
      console.error('Erreur chargement matrice:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClasse, selectedSemestre]);

  useEffect(() => { chargerMatrice(); }, [chargerMatrice]);

  const onRefresh = () => { setRefreshing(true); chargerMatrice(); };

  // Obtenir toutes les matières dans l'ordre des modules
  const allMatieres = modules.flatMap(mod => (matieresByModule[mod.id] || []).map(m => ({ ...m, module: mod })));

  // Calculer la moyenne pondérée d'un étudiant pour un module donné
  const getMoyenneModule = (etudiantId, moduleId) => {
    const res = resultatsMap[etudiantId];
    if (!res) return null;
    const modRes = res.modules.find(m => m.id === moduleId);
    return modRes?.moyenneModule ?? null;
  };

  // Couleur de la moyenne du module selon validation
  const getCouleurMoyenneModule = (etudiantId, moduleId) => {
    const res = resultatsMap[etudiantId];
    if (!res) return null;
    const modRes = res.modules.find(m => m.id === moduleId);
    if (!modRes) return null;
    const couleur = getCouleurModule ? getCouleurModule(modRes, res) : null;
    return couleur ? COULEURS[couleur] : null;
  };

  const goToBulletin = (etudiantId) => {
    // Un étudiant ne peut voir que son propre bulletin
    if (!isAdmin() && !isEnseignant() && etudiantId !== user.id) return;
    navigation.navigate('Bulletin', { etudiantId });
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Chargement de la matrice...</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={[styles.container, {paddingTop: insets.top > 0 ? insets.top : 20}]}>
        {/* Sélecteur de classe (admin/enseignant uniquement) */}
        {(isAdmin() || isEnseignant()) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.classePicker}
            contentContainerStyle={styles.classePickerContent}
          >
            {classes.map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={[
                  styles.classeChip, 
                  selectedClasse?.id === item.id && styles.classeChipActive
                ]}
                onPress={() => setSelectedClasse(item)}
              >
                <Text style={styles.classeChipText}>{item.nom} - {item.filiere_nom}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Sélecteur de semestre */}
        <View style={styles.semestrePicker}>
          {[1, 2].map(sem => (
            <TouchableOpacity
              key={sem}
              style={[styles.semestreBtn, selectedSemestre === sem && styles.semestreBtnActive]}
              onPress={() => setSelectedSemestre(sem)}
            >
              <Text style={[styles.semestreBtnText, selectedSemestre === sem && styles.semestreBtnTextActive]}>
                Semestre {sem}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Titre */}
        <View style={styles.matrixTitle}>
          <Ionicons name="grid" size={18} color={COLORS.accent} />
          <Text style={styles.matrixTitleText}>
            {selectedClasse?.nom} — S{selectedSemestre} ({etudiants.length} étudiants)
          </Text>
        </View>

        {/* Matrice scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.matrixScrollH}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        >
          <View>
            {/* En-tête modules */}
            <View style={styles.headerRow}>
              <View style={styles.nameCell}>
                <Text style={styles.headerCellText}>Étudiant</Text>
              </View>
              {modules.map(mod => {
                const mats = matieresByModule[mod.id] || [];
                // +MOY_MODULE_W pour la colonne moyenne du module
                return (
                  <View key={mod.id} style={[styles.moduleHeader, { width: CELL_W * mats.length + MOY_MODULE_W }]}>
                    <Text style={styles.moduleHeaderText} numberOfLines={1}>{mod.nom}</Text>
                    <Text style={styles.moduleCoeffText}>Coeff. {mats.reduce((s, m) => s + m.coefficient, 0)}</Text>
                  </View>
                );
              })}
              <View style={styles.moyCell}>
                <Text style={styles.headerCellText}>Moy. Gén.</Text>
              </View>
            </View>

            {/* En-tête matières */}
            <View style={styles.subHeaderRow}>
              <View style={styles.nameCell} />
              {modules.flatMap(mod => {
                const mats = matieresByModule[mod.id] || [];
                return [
                  // Colonnes matières
                  ...mats.map(mat => (
                    <View key={mat.id} style={styles.matiereHeaderCell}>
                      <Text style={styles.matiereHeaderNom} numberOfLines={2}>{mat.nom}</Text>
                      <Text style={styles.matiereHeaderCoeff}>×{mat.coefficient}</Text>
                    </View>
                  )),
                  // Colonne moyenne du module
                  <View key={`moy-mod-header-${mod.id}`} style={styles.moyModuleHeaderCell}>
                    <Text style={styles.moyModuleHeaderText}>Moy.</Text>
                    <Text style={styles.moyModuleHeaderText}>Module</Text>
                  </View>,
                ];
              })}
              <View style={styles.moyCell} />
            </View>

            {/* Lignes étudiants */}
            <ScrollView
              showsVerticalScrollIndicator
              style={styles.matrixScrollV}
            >
              {etudiants.map((etud, idx) => {
                const res = resultatsMap[etud.id];
                const isCurrentUser = etud.id === user.id;
                return (
                  <TouchableOpacity
                    key={etud.id}
                    style={[
                      styles.etudRow,
                      idx % 2 === 0 && styles.etudRowEven,
                      isCurrentUser && styles.etudRowCurrent,
                    ]}
                    onPress={() => goToBulletin(etud.id)}
                    activeOpacity={0.8}
                  >
                    {/* Nom étudiant */}
                    <View style={styles.nameCell}>
                      <Text style={styles.etudNom} numberOfLines={1}>
                        {etud.nom} {etud.prenom}
                      </Text>
                      {isCurrentUser && (
                        <View style={styles.meBadge}>
                          <Text style={styles.meBadgeText}>Moi</Text>
                        </View>
                      )}
                    </View>

                    {/* Notes par matière + moyenne module */}
                    {modules.flatMap(mod => {
                      const mats = matieresByModule[mod.id] || [];

                      // Cellules des matières
                      const matCells = mats.map(mat => {
                        if (!res) return (
                          <View key={mat.id} style={styles.noteCell}>
                            <Text style={styles.noteCellText}>—</Text>
                          </View>
                        );

                        let matiereRes = null;
                        let moduleRes = null;
                        res.modules.forEach(m => {
                          m.matieres.forEach(mr => {
                            if (mr.id === mat.id) {
                              matiereRes = mr;
                              moduleRes = m;
                            }
                          });
                        });

                        if (!matiereRes) return (
                          <View key={mat.id} style={styles.noteCell}>
                            <Text style={styles.noteCellText}>—</Text>
                          </View>
                        );

                        const couleur = getCouleurMatiere(matiereRes, moduleRes, res);
                        const couleurInfo = COULEURS[couleur];

                        return (
                          <View
                            key={mat.id}
                            style={[styles.noteCell, { backgroundColor: couleurInfo.bg }]}
                          >
                            <Text style={[styles.noteCellText, { color: couleurInfo.text, fontWeight: '700' }]}>
                              {matiereRes.noteFinale?.toFixed(1) ?? '—'}
                            </Text>
                          </View>
                        );
                      });

                      // Cellule moyenne du module
                      const moyModule = getMoyenneModule(etud.id, mod.id);
                      const couleurMod = getCouleurMoyenneModule(etud.id, mod.id);

                      const moyModuleCell = (
                        <View
                          key={`moy-mod-${mod.id}-${etud.id}`}
                          style={[
                            styles.moyModuleCell,
                            couleurMod
                              ? { backgroundColor: couleurMod.bg }
                              : { backgroundColor: 'rgba(200,210,230,0.3)' },
                          ]}
                        >
                          <Text style={[
                            styles.moyModuleCellText,
                            couleurMod ? { color: couleurMod.text } : { color: COLORS.textSecondary },
                          ]}>
                            {moyModule != null ? moyModule.toFixed(2) : '—'}
                          </Text>
                        </View>
                      );

                      return [...matCells, moyModuleCell];
                    })}

                    {/* Moyenne générale */}
                    <View style={[
                      styles.moyCell,
                      { backgroundColor: res?.semestreValide ? COLORS.successBg : COLORS.dangerBg }
                    ]}>
                      <Text style={[
                        styles.moyCellText,
                        { color: res?.semestreValide ? COLORS.success : COLORS.danger }
                      ]}>
                        {res?.moyenneSemestre?.toFixed(2) ?? '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Légende */}
        <View style={styles.legend}>
          {[
            { color: COLORS.noteRougeText, label: 'Non validé' },
            { color: COLORS.noteJauneText, label: 'Suggestion' },
            { color: COLORS.success, label: 'Validé' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
          <Text style={styles.legendHint}>Toucher une ligne → Bulletin</Text>
        </View>
      </View>
    </ScreenBackground>
  );
};

const CELL_W = 90;
const NAME_W = 130;
const MOY_W = 80;
const MOY_MODULE_W = 72; // largeur de la colonne "Moy. Module"

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },

  // Sélecteurs
  classePicker: { maxHeight: 50, marginBottom: 8, paddingLeft: SPACING.md },
  classePickerContent: { gap: 8, paddingRight: SPACING.md, alignItems: 'center' },
  classeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: COLORS.glassBorder },
  classeChipActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  classeChipText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
  classeChipTextActive: { color: COLORS.accent },

  semestrePicker: { flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: RADIUS.md, padding: 3 },
  semestreBtn: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.md - 2, alignItems: 'center' },
  semestreBtnActive: { backgroundColor: 'rgba(255,255,255,0.85)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  semestreBtnText: { ...TYPOGRAPHY.captionBold, color: COLORS.textTertiary },
  semestreBtnTextActive: { color: COLORS.accent },

  matrixTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.md, marginBottom: 8 },
  matrixTitleText: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },

  // Matrice
  matrixScrollH: { flex: 1, marginHorizontal: SPACING.md },
  matrixScrollV: { maxHeight: 400 },

  headerRow: { flexDirection: 'row', backgroundColor: COLORS.accent, borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md },
  nameCell: { width: NAME_W, padding: 8, justifyContent: 'center' },
  headerCellText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  moduleHeader: { backgroundColor: 'rgba(37, 99, 235, 0.85)', padding: 8, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  moduleHeaderText: { color: COLORS.white, fontWeight: '700', fontSize: 11, textAlign: 'center' },
  moduleCoeffText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'center' },
  moyCell: { width: MOY_W, padding: 8, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  moyCellText: { fontWeight: '800', fontSize: 13 },

  subHeaderRow: { flexDirection: 'row', backgroundColor: 'rgba(219, 234, 254, 0.8)', borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  matiereHeaderCell: { width: CELL_W, padding: 6, borderLeftWidth: 1, borderLeftColor: COLORS.divider, justifyContent: 'center', alignItems: 'center' },
  matiereHeaderNom: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  matiereHeaderCoeff: { fontSize: 10, color: COLORS.textTertiary, textAlign: 'center' },

  // En-tête colonne Moy. Module
  moyModuleHeaderCell: {
    width: MOY_MODULE_W,
    padding: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  moyModuleHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.accent, textAlign: 'center' },

  // Cellule Moy. Module dans les lignes étudiants
  moyModuleCell: {
    width: MOY_MODULE_W,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  moyModuleCellText: { fontWeight: '800', fontSize: 13 },

  etudRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: 'rgba(255,255,255,0.3)' },
  etudRowEven: { backgroundColor: 'rgba(248,250,255,0.5)' },
  etudRowCurrent: { backgroundColor: 'rgba(219,234,254,0.6)' },
  etudNom: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  meBadge: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginTop: 2 },
  meBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },

  noteCell: { width: CELL_W, padding: 8, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.divider },
  noteCellText: { fontSize: 13, color: COLORS.textPrimary },

  // Légende
  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 8, gap: 12, flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.4)', borderTopWidth: 1, borderTopColor: COLORS.divider },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  legendHint: { fontSize: 10, color: COLORS.textTertiary, fontStyle: 'italic' },
});

export default MatriceScreen;