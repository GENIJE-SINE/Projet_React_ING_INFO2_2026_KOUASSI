// src/screens/HomeScreen.js
// Tableau de bord principal - adapté selon le rôle
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { supabase } from '../database/database';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

const HomeScreen = ({ navigation }) => {
  const { user, logout, isAdmin, isEnseignant, isEtudiant } = useAuth();
  const { isOnline, lastSync, syncData, isSyncing } = useNetwork();
  const [stats, setStats] = useState({ etudiants: 0, matieres: 0, notes: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { chargerStats(); }, []);

  const chargerStats = async () => {
  try {
    if (isAdmin() || isEnseignant()) {
      const [resE, resM, resN] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'etudiant'),
        supabase.from('matieres').select('*', { count: 'exact', head: true }),
        supabase.from('notes').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        etudiants: resE.count ?? 0,
        matieres:  resM.count ?? 0,
        notes:     resN.count ?? 0,
      });
    }
  } catch (err) { console.error(err); }
  setRefreshing(false);
};

  const onRefresh = async () => {
    setRefreshing(true);
    await syncData();
    chargerStats();
  };

  const roleLabel = () => {
    if (isAdmin()) {
      const labels = { directeur: 'Directeur', sous_directeur: 'Sous-Directeur', inspecteur: 'Inspecteur' };
      return labels[user.admin_role] || 'Administration';
    }
    if (isEnseignant()) return 'Enseignant';
    return 'Étudiant';
  };

  const roleColor = () => {
    if (isAdmin()) return ['#7C3AED', '#5B21B6'];
    if (isEnseignant()) return ['#059669', '#047857'];
    return ['#2563EB', '#1D4ED8'];
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {/* En-tête profil */}
        <GlassCard style={styles.profileCard} noPadding>
          <LinearGradient
            colors={roleColor()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradient}
          >
            {/* Décoration */}
            <View style={styles.profileBubble1} />
            <View style={styles.profileBubble2} />

            <View style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel()}</Text>
                </View>
                <Text style={styles.profileName}>{user?.prenom} {user?.nom}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                {isEtudiant() && user?.matricule && (
                  <Text style={styles.profileMatricule}>{user.matricule}</Text>
                )}
              </View>
            </View>

            {/* Indicateur réseau */}
            <View style={styles.networkIndicator}>
              <View style={[styles.networkDot, { backgroundColor: isOnline ? '#4ADE80' : '#FCA5A5' }]} />
              <Text style={styles.networkText}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
          </LinearGradient>
        </GlassCard>

        {/* Statistiques (admin/enseignant) */}
        {(isAdmin() || isEnseignant()) && (
          <View style={styles.statsRow}>
            <StatCard icon="people" label="Étudiants" value={stats.etudiants} color="#2563EB" />
            <StatCard icon="book" label="Matières" value={stats.matieres} color="#059669" />
            <StatCard icon="checkmark-circle" label="Notes" value={stats.notes} color="#7C3AED" />
          </View>
        )}

        {/* Menu principal */}
        <Text style={styles.sectionTitle}>Menu Principal</Text>

        <View style={styles.menuGrid}>
          {/* Toujours visible */}
          <MenuCard
            icon="grid"
            title="Matrice de classe"
            subtitle="Résultats de toute la classe"
            color="#2563EB"
            onPress={() => navigation.navigate('Matrice')}
          />

          {/* Bulletin */}
          <MenuCard
            icon="document-text"
            title="Mon Bulletin"
            subtitle={isEtudiant() ? "Vos résultats personnels" : "Bulletins étudiants"}
            color="#059669"
            onPress={() => navigation.navigate('Bulletin', { etudiantId: isEtudiant() ? user.id : undefined })}
          />

          {/* Saisie des notes (enseignants + admin) */}
          {(isAdmin() || isEnseignant()) && (
            <MenuCard
              icon="create"
              title="Saisie des Notes"
              subtitle="Entrer et modifier les notes"
              color="#D97706"
              onPress={() => navigation.navigate('Notes')}
            />
          )}

          {/* Gestion (admin seulement) */}
          {isAdmin() && (
            <MenuCard
              icon="settings"
              title="Administration"
              subtitle="Gestion des utilisateurs et classes"
              color="#7C3AED"
              onPress={() => navigation.navigate('Admin')}
            />
          )}

          {/* Rattrapages (étudiant) */}
          {isEtudiant() && (
            <MenuCard
              icon="warning"
              title="Mes Rattrapages"
              subtitle="Dates et matières à repasser"
              color="#DC2626"
              onPress={() => navigation.navigate('Bulletin', { etudiantId: user.id, tab: 'rattrapages' })}
            />
          )}
        </View>

        {/* Bouton sync */}
        <TouchableOpacity
          style={styles.syncButton}
          onPress={onRefresh}
          disabled={isSyncing || !isOnline}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSyncing ? "sync" : "cloud-upload-outline"}
            size={16}
            color={isOnline ? COLORS.accent : COLORS.textTertiary}
          />
          <Text style={[styles.syncText, !isOnline && { color: COLORS.textTertiary }]}>
            {isSyncing ? 'Synchronisation...' : lastSync ? `Sync: ${lastSync.toLocaleTimeString()}` : 'Synchroniser'}
          </Text>
        </TouchableOpacity>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBackground>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <GlassCard style={styles.statCard} variant="sm">
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </GlassCard>
);

const MenuCard = ({ icon, title, subtitle, color, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.menuCardWrapper}>
    <GlassCard style={styles.menuCard} noPadding>
      <View style={[styles.menuIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.menuCardContent}>
        <Text style={styles.menuCardTitle}>{title}</Text>
        <Text style={styles.menuCardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} style={styles.menuChevron} />
    </GlassCard>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.md },

  // Profil
  profileCard: { marginTop: SPACING.md, marginBottom: SPACING.md },
  profileGradient: { borderRadius: 20, padding: SPACING.md, overflow: 'hidden' },
  profileBubble1: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)', top: -50, right: -30 },
  profileBubble2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -20, left: 40 },
  profileContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  profileInfo: { flex: 1 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
  roleBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  profileName: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  profileMatricule: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  networkIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: SPACING.md },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { ...TYPOGRAPHY.caption, textAlign: 'center' },

  // Menu
  sectionTitle: { ...TYPOGRAPHY.label, marginBottom: SPACING.sm },
  menuGrid: { gap: SPACING.sm, marginBottom: SPACING.md },
  menuCardWrapper: {},
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
  menuIconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  menuCardContent: { flex: 1 },
  menuCardTitle: { ...TYPOGRAPHY.h4 },
  menuCardSubtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },
  menuChevron: { marginLeft: 4 },

  // Sync & logout
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: SPACING.sm, backgroundColor: COLORS.accentLight, borderRadius: RADIUS.lg },
  syncText: { ...TYPOGRAPHY.captionBold, color: COLORS.accent },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: COLORS.dangerBg, marginBottom: SPACING.sm },
  logoutText: { ...TYPOGRAPHY.bodyBold, color: COLORS.danger },
});

export default HomeScreen;