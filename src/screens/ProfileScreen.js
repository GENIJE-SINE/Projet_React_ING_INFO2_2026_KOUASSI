// src/screens/ProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { isOnline, lastSync, syncData, isSyncing } = useNetwork();
  const [notifEnabled, setNotifEnabled] = useState(true);

  const roleLabel = () => {
    if (user?.role === 'admin') {
      const m = { directeur: 'Directeur', sous_directeur: 'Sous-Directeur', inspecteur: 'Inspecteur' };
      return m[user.admin_role] || 'Administration';
    }
    return user?.role === 'enseignant' ? 'Enseignant' : 'Étudiant';
  };

  const avatarColors = () => {
    if (user?.role === 'admin') return ['#7C3AED', '#5B21B6'];
    if (user?.role === 'enseignant') return ['#059669', '#047857'];
    return ['#2563EB', '#1D4ED8'];
  };

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Avatar + Nom */}
        <GlassCard style={styles.profileCard} noPadding>
          <LinearGradient colors={avatarColors()} style={styles.profileBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.prenom?.[0]}{user?.nom?.[0]}</Text>
            </View>
            <Text style={styles.profileName}>{user?.nom} {user?.prenom}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel()}</Text>
            </View>
          </LinearGradient>

          <View style={styles.profileDetails}>
            <DetailRow icon="mail-outline" label="Email" value={user?.email} />
            {user?.matricule && <DetailRow icon="card-outline" label="Matricule" value={user?.matricule} />}
            {user?.classe_nom && <DetailRow icon="school-outline" label="Classe" value={user?.classe_nom} />}
            {user?.filiere_nom && <DetailRow icon="layers-outline" label="Filière" value={user?.filiere_nom} />}
          </View>
        </GlassCard>

        {/* Section synchronisation */}
        <GlassCard style={styles.section} variant="sm">
          <Text style={styles.sectionTitle}>Synchronisation</Text>

          <View style={styles.syncStatus}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#4ADE80' : '#FCA5A5' }]} />
            <Text style={styles.syncStatusText}>
              {isOnline ? 'Connecté à internet' : 'Mode hors ligne'}
            </Text>
          </View>

          {lastSync && (
            <Text style={styles.lastSyncText}>
              Dernière sync : {lastSync.toLocaleDateString('fr-FR')} à {lastSync.toLocaleTimeString('fr-FR')}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.syncBtn, (!isOnline || isSyncing) && styles.syncBtnDisabled]}
            onPress={syncData}
            disabled={!isOnline || isSyncing}
            activeOpacity={0.8}
          >
            <Ionicons name={isSyncing ? 'sync' : 'cloud-upload-outline'} size={16} color={isOnline ? COLORS.accent : COLORS.textTertiary} />
            <Text style={[styles.syncBtnText, !isOnline && { color: COLORS.textTertiary }]}>
              {isSyncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
            </Text>
          </TouchableOpacity>

          <View style={styles.offlineInfo}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.offlineInfoText}>
              L'application fonctionne hors ligne. Les modifications sont enregistrées localement et synchronisées automatiquement à la reconnexion.
            </Text>
          </View>
        </GlassCard>

        {/* Paramètres */}
        <GlassCard style={styles.section} variant="sm">
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.accent} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: COLORS.divider, true: COLORS.accentLight }}
              thumbColor={notifEnabled ? COLORS.accent : COLORS.textTertiary}
            />
          </View>
        </GlassCard>

        {/* À propos */}
        <GlassCard style={styles.section} variant="sm">
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.aboutText}>INPHB — Système de Gestion des Résultats</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutText}>Institut National Polytechnique Houphouët-Boigny</Text>
          <Text style={styles.aboutText}>Yamoussoukro, Côte d'Ivoire</Text>
        </GlassCard>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => {
          Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnecter', style: 'destructive', onPress: logout },
          ]);
        }} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBackground>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color={COLORS.textTertiary} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  profileCard: { marginBottom: SPACING.md, overflow: 'hidden' },
  profileBanner: { alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.md, gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  avatarText: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  profileName: { fontSize: 22, fontWeight: '800', color: COLORS.white, textAlign: 'center' },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 4 },
  rolePillText: { color: COLORS.white, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  profileDetails: { padding: SPACING.md, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.textTertiary, width: 70 },
  detailValue: { ...TYPOGRAPHY.bodyBold, flex: 1, textAlign: 'right' },

  section: { marginBottom: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },

  syncStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  syncStatusText: { ...TYPOGRAPHY.bodyBold },
  lastSyncText: { ...TYPOGRAPHY.caption, marginBottom: SPACING.md },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { ...TYPOGRAPHY.bodyBold, color: COLORS.accent },
  offlineInfo: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: RADIUS.sm, padding: SPACING.sm },
  offlineInfoText: { ...TYPOGRAPHY.caption, flex: 1, lineHeight: 18 },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { ...TYPOGRAPHY.bodyBold },

  aboutText: { ...TYPOGRAPHY.body, marginBottom: 4 },
  aboutVersion: { ...TYPOGRAPHY.caption, color: COLORS.accent, fontWeight: '700', marginBottom: 4 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: RADIUS.lg, backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' },
  logoutText: { ...TYPOGRAPHY.bodyBold, color: COLORS.danger },
});

export default ProfileScreen;