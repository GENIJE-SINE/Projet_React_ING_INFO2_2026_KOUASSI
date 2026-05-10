// src/screens/BulletinScreen.js
// Bulletin de notes d'un étudiant
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getModules, getMatieresByModule,
  getNotesByEtudiant, getEcoleConfig, getEtudiantById,
  getRattrapagesByEtudiant
} from '../database/database';
import {
  construireResultats, getCouleurMatiere, getCouleurModule,
  getMatiereRattrapage, COULEURS
} from '../utils/gradesCalculator';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

const BulletinScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  // L'étudiantId peut venir de la navigation (admin) ou de l'utilisateur connecté
  const etudiantId = route?.params?.etudiantId || user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('resultats'); // 'resultats' | 'rattrapages'
  const [etudiant, setEtudiant] = useState(null);
  const [config, setConfig] = useState(null);
  const [resultats, setResultats] = useState(null);
  const [infoRattrapage, setInfoRattrapage] = useState({ obligatoires: [], suggestions: [] });
  const [rattrapageDates, setRattrapageDates] = useState({});

  const chargerDonnees = useCallback(async () => {
    try {
      const [etudiantData, configData] = await Promise.all([
        getEtudiantById(etudiantId),
        getEcoleConfig(),
      ]);
      setEtudiant(etudiantData);
      setConfig(configData);

      if (!etudiantData?.classe_id) return;

      // Récupérer les modules du semestre 1 (on prend le semestre de la classe)
      const semestre = etudiantData.semestre || 1;
      const modules = await getModules(etudiantData.classe_id, semestre);

      // Récupérer les matières par module
      const matieresByModule = {};
      for (const mod of modules) {
        matieresByModule[mod.id] = await getMatieresByModule(mod.id);
      }

      // Récupérer les notes
      const notesS1 = await getNotesByEtudiant(etudiantId, 1);
      const notesS2 = await getNotesByEtudiant(etudiantId, 2);

      // Construire les résultats
      const res = construireResultats(modules, matieresByModule, notesS1, notesS2);
      setResultats(res);

      // Calculer les rattrapages
      const ratInfo = getMatiereRattrapage(res);
      setInfoRattrapage(ratInfo);

      // Dates de rattrapage existantes
      const rats = await getRattrapagesByEtudiant(etudiantId);
      const datesMap = {};
      rats.forEach(r => { datesMap[r.matiere_id] = r; });
      setRattrapageDates(datesMap);

    } catch (err) {
      console.error('Erreur chargement bulletin:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [etudiantId]);

  useEffect(() => { chargerDonnees(); }, [chargerDonnees]);

  const onRefresh = () => {
    setRefreshing(true);
    chargerDonnees();
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Chargement du bulletin...</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {/* En-tête du bulletin */}
        <GlassCard style={styles.headerCard}>
          <View style={styles.schoolHeader}>
            <Text style={styles.schoolInstitut}>{config?.nom_institut || 'INPHB'}</Text>
            <Text style={styles.schoolName}>{config?.nom_ecole || 'École'}</Text>
            <View style={styles.divider} />
            <Text style={styles.bulletinTitle}>BULLETIN DE NOTES</Text>
            <Text style={styles.annee}>Année Scolaire : {config?.annee_scolaire || '2024-2025'}</Text>
          </View>

          {/* Informations étudiant */}
          <View style={styles.studentInfo}>
            <InfoRow label="Nom & Prénoms" value={`${etudiant?.nom} ${etudiant?.prenom}`} />
            <InfoRow label="Matricule" value={etudiant?.matricule || '—'} />
            <InfoRow label="Filière" value={etudiant?.filiere_nom || '—'} />
            <InfoRow label="Classe" value={etudiant?.classe_nom || '—'} />
            <InfoRow label="Semestre" value={`Semestre ${etudiant?.semestre || 1}`} />
          </View>
        </GlassCard>

        {/* Onglets */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'resultats' && styles.tabActive]}
            onPress={() => setActiveTab('resultats')}
          >
            <Ionicons name="list" size={16} color={activeTab === 'resultats' ? COLORS.accent : COLORS.textTertiary} />
            <Text style={[styles.tabText, activeTab === 'resultats' && styles.tabTextActive]}>Résultats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rattrapages' && styles.tabActive]}
            onPress={() => setActiveTab('rattrapages')}
          >
            <Ionicons name="warning" size={16} color={activeTab === 'rattrapages' ? COLORS.accent : COLORS.textTertiary} />
            <Text style={[styles.tabText, activeTab === 'rattrapages' && styles.tabTextActive]}>
              Rattrapages {(infoRattrapage.obligatoires.length + infoRattrapage.suggestions.length) > 0
                ? `(${infoRattrapage.obligatoires.length + infoRattrapage.suggestions.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu des onglets */}
        {activeTab === 'resultats' && resultats && (
          <ResultatsTab resultats={resultats} />
        )}

        {activeTab === 'rattrapages' && (
          <RattrapagesTab
            obligatoires={infoRattrapage.obligatoires}
            suggestions={infoRattrapage.suggestions}
            rattrapageDates={rattrapageDates}
          />
        )}

        {/* Pied de page */}
        {activeTab === 'resultats' && resultats && (
          <GlassCard style={styles.footerCard}>
            {/* Moyenne générale */}
            <View style={styles.moyenneRow}>
              <Text style={styles.moyenneLabel}>Moyenne Générale du Semestre</Text>
              <View style={[
                styles.moyenneBadge,
                { backgroundColor: resultats.semestreValide ? COLORS.successBg : COLORS.dangerBg }
              ]}>
                <Text style={[
                  styles.moyenneValue,
                  { color: resultats.semestreValide ? COLORS.success : COLORS.danger }
                ]}>
                  {resultats.moyenneSemestre?.toFixed(2) || '—'}/20
                </Text>
              </View>
            </View>

            {/* Décision */}
            <View style={[
              styles.decisionContainer,
              { backgroundColor: resultats.semestreValide ? COLORS.successBg : COLORS.dangerBg }
            ]}>
              <Ionicons
                name={resultats.semestreValide ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={resultats.semestreValide ? COLORS.success : COLORS.danger}
              />
              <Text style={[
                styles.decisionText,
                { color: resultats.semestreValide ? COLORS.success : COLORS.danger }
              ]}>
                {resultats.semestreValide ? 'SEMESTRE VALIDÉ' : 'SEMESTRE NON VALIDÉ'}
              </Text>
            </View>

            {/* Directeur */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Directeur de l'École</Text>
                <Text style={styles.directorName}>{config?.nom_directeur}</Text>
                <View style={styles.signatureBox}>
                  <Text style={styles.signatureHint}>Signature et Cachet</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBackground>
  );
};

// Sous-composants

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label} :</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const ResultatsTab = ({ resultats }) => (
  <View>
    {resultats.modules.map(module => {
      const couleurMod = getCouleurModule(module, resultats);
      const couleurInfo = COULEURS[couleurMod];

      return (
        <GlassCard key={module.id} style={styles.moduleCard} noPadding>
          {/* En-tête module */}
          <View style={[styles.moduleHeader, { backgroundColor: couleurInfo.bg }]}>
            <View style={styles.moduleHeaderLeft}>
              <View style={[styles.moduleIndicator, { backgroundColor: couleurInfo.text }]} />
              <Text style={styles.moduleNom}>{module.nom}</Text>
            </View>
            <View style={styles.moduleHeaderRight}>
              <Text style={styles.moduleCoeff}>Coeff. {module.coeffModule}</Text>
              <View style={[styles.noteBadge, { backgroundColor: couleurInfo.bg, borderColor: couleurInfo.border }]}>
                <Text style={[styles.noteText, { color: couleurInfo.text }]}>
                  {module.moyenneModule?.toFixed(2) || '—'}/20
                </Text>
              </View>
            </View>
          </View>

          {/* Matières */}
          {module.matieres.map((matiere, idx) => {
            const couleurMat = getCouleurMatiere(matiere, module, resultats);
            const matCouleur = COULEURS[couleurMat];

            return (
              <View
                key={matiere.id}
                style={[
                  styles.matiereRow,
                  { backgroundColor: matCouleur.bg },
                  idx < module.matieres.length - 1 && styles.matiereRowBorder,
                ]}
              >
                <View style={styles.matiereLeft}>
                  <View style={[styles.matiereDot, { backgroundColor: matCouleur.text }]} />
                  <View>
                    <Text style={styles.matiereNom}>{matiere.nom}</Text>
                    <Text style={styles.matiereEnseignant}>
                      {matiere.enseignant_prenom} {matiere.enseignant_nom}
                    </Text>
                  </View>
                </View>
                <View style={styles.matiereRight}>
                  <Text style={styles.matiereCoeff}>×{matiere.coefficient}</Text>
                  {matiere.noteS2 !== null && (
                    <Text style={styles.noteS2}>R: {matiere.noteS2?.toFixed(1)}</Text>
                  )}
                  <View style={[styles.noteBadgeSm, { backgroundColor: matCouleur.bg, borderColor: matCouleur.border }]}>
                    <Text style={[styles.noteTextSm, { color: matCouleur.text }]}>
                      {matiere.noteFinale?.toFixed(2) ?? '—'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </GlassCard>
      );
    })}

    {/* Légende */}
    <GlassCard style={styles.legendCard} variant="sm">
      <Text style={styles.legendTitle}>Légende</Text>
      <View style={styles.legendRow}>
        <LegendItem color={COLORS.noteRougeText} label="Non validé (obligatoire)" />
        <LegendItem color={COLORS.noteJauneText} label="Suggestion rattrapage" />
        <LegendItem color={COLORS.success} label="Validé" />
      </View>
    </GlassCard>
  </View>
);

const LegendItem = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const RattrapagesTab = ({ obligatoires, suggestions, rattrapageDates }) => (
  <View>
    {obligatoires.length === 0 && suggestions.length === 0 ? (
      <GlassCard style={styles.emptyCard}>
        <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
        <Text style={styles.emptyTitle}>Aucun rattrapage nécessaire</Text>
        <Text style={styles.emptyText}>Tous vos modules sont validés.</Text>
      </GlassCard>
    ) : null}

    {obligatoires.length > 0 && (
      <GlassCard style={styles.rattrapageSection}>
        <View style={styles.rattrapageSectionHeader}>
          <View style={[styles.rattrapageIndicator, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.rattrapageSectionTitle}>Rattrapages Obligatoires</Text>
        </View>
        <Text style={styles.rattrapageSectionDesc}>
          Vous devez obligatoirement passer ces rattrapages.
        </Text>
        {obligatoires.map(mat => (
          <RattrapageItem
            key={mat.id}
            matiere={mat}
            couleur="rouge"
            dateInfo={rattrapageDates[mat.id]}
          />
        ))}
      </GlassCard>
    )}

    {suggestions.length > 0 && (
      <GlassCard style={styles.rattrapageSection}>
        <View style={styles.rattrapageSectionHeader}>
          <View style={[styles.rattrapageIndicator, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.rattrapageSectionTitle}>Suggestions de Rattrapage</Text>
        </View>
        <Text style={styles.rattrapageSectionDesc}>
          Ces rattrapages sont optionnels mais recommandés.
        </Text>
        {suggestions.map(mat => (
          <RattrapageItem
            key={mat.id}
            matiere={mat}
            couleur="jaune"
            dateInfo={rattrapageDates[mat.id]}
          />
        ))}
      </GlassCard>
    )}
  </View>
);

const RattrapageItem = ({ matiere, couleur, dateInfo }) => {
  const couleurInfo = COULEURS[couleur];
  return (
    <View style={[styles.rattrapageItem, { backgroundColor: couleurInfo.bg, borderColor: couleurInfo.border }]}>
      <View style={styles.rattrapageItemHeader}>
        <Text style={[styles.rattrapageMatNom, { color: couleurInfo.text }]}>{matiere.nom}</Text>
        <Text style={styles.rattrapageModNom}>{matiere.module_nom}</Text>
      </View>
      <View style={styles.rattrapageDetails}>
        <View style={styles.rattrapageDetail}>
          <Ionicons name="stats-chart" size={14} color={COLORS.textTertiary} />
          <Text style={styles.rattrapageDetailText}>
            Note actuelle : {matiere.noteFinale?.toFixed(2) ?? '—'}/20
          </Text>
        </View>
        {dateInfo?.date_rattrapage ? (
          <View style={styles.rattrapageDetail}>
            <Ionicons name="calendar" size={14} color={COLORS.accent} />
            <Text style={[styles.rattrapageDetailText, { color: COLORS.accent }]}>
              Date : {dateInfo.date_rattrapage}
            </Text>
          </View>
        ) : (
          <View style={styles.rattrapageDetail}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.rattrapageDetailText}>Date : à déterminer</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },

  // En-tête
  headerCard: { marginTop: SPACING.md, marginBottom: SPACING.sm },
  schoolHeader: { alignItems: 'center', marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  schoolInstitut: { fontSize: 11, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  schoolName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginVertical: 4 },
  divider: { width: 40, height: 2, backgroundColor: COLORS.accent, borderRadius: 2, marginVertical: 8 },
  bulletinTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 2, textTransform: 'uppercase' },
  annee: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  // Infos étudiant
  studentInfo: { gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.textTertiary },
  infoValue: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary, textAlign: 'right', flex: 1, paddingLeft: 8 },

  // Onglets
  tabs: { flexDirection: 'row', marginBottom: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: RADIUS.lg, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  tabText: { ...TYPOGRAPHY.captionBold, color: COLORS.textTertiary },
  tabTextActive: { color: COLORS.accent },

  // Modules
  moduleCard: { marginBottom: SPACING.sm },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg },
  moduleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  moduleIndicator: { width: 4, height: 20, borderRadius: 2 },
  moduleNom: { ...TYPOGRAPHY.h4, flex: 1 },
  moduleHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleCoeff: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  noteBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  noteText: { fontSize: 13, fontWeight: '700' },

  // Matières
  matiereRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  matiereRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(200,220,245,0.3)' },
  matiereLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  matiereDot: { width: 8, height: 8, borderRadius: 4 },
  matiereNom: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary },
  matiereEnseignant: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  matiereRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matiereCoeff: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  noteS2: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  noteBadgeSm: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  noteTextSm: { fontSize: 12, fontWeight: '700' },

  // Légende
  legendCard: { marginBottom: SPACING.sm },
  legendTitle: { ...TYPOGRAPHY.captionBold, marginBottom: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...TYPOGRAPHY.caption },

  // Pied de page
  footerCard: { marginBottom: SPACING.sm },
  moyenneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  moyenneLabel: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  moyenneBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  moyenneValue: { fontSize: 16, fontWeight: '800' },
  decisionContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.lg },
  decisionText: { fontSize: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  signatureSection: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: SPACING.md },
  signatureLine: { alignItems: 'center', gap: 6 },
  signatureLabel: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
  directorName: { ...TYPOGRAPHY.bodyBold },
  signatureBox: { width: '60%', height: 60, borderWidth: 1, borderColor: COLORS.divider, borderRadius: RADIUS.sm, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  signatureHint: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary, fontStyle: 'italic' },

  // Rattrapages
  rattrapageSection: { marginBottom: SPACING.sm },
  rattrapageSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rattrapageIndicator: { width: 4, height: 16, borderRadius: 2 },
  rattrapageSectionTitle: { ...TYPOGRAPHY.h4 },
  rattrapageSectionDesc: { ...TYPOGRAPHY.caption, marginBottom: SPACING.md },
  rattrapageItem: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: 8 },
  rattrapageItemHeader: { marginBottom: 8 },
  rattrapageMatNom: { fontSize: 15, fontWeight: '700' },
  rattrapageModNom: { ...TYPOGRAPHY.caption, color: COLORS.textTertiary },
  rattrapageDetails: { gap: 4 },
  rattrapageDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rattrapageDetailText: { ...TYPOGRAPHY.caption },

  // Vide
  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: SPACING.xl },
  emptyTitle: { ...TYPOGRAPHY.h3 },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center' },
});

export default BulletinScreen;