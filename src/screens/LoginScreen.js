// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Modal
} from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';
import { changePassword } from '../database/database';

const LoginScreen = () => {
  const { login } = useAuth();

  // --- État connexion ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- État modal changement de mot de passe ---
  const [modalVisible, setModalVisible] = useState(false);
  const [cpEmail, setCpEmail] = useState('');
  const [cpOldPassword, setCpOldPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [showCpOld, setShowCpOld] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  const openPasswordModal = () => {
    setCpEmail('');
    setCpOldPassword('');
    setCpNewPassword('');
    setCpConfirmPassword('');
    setCpError('');
    setCpSuccess(false);
    setModalVisible(true);
  };

  const closePasswordModal = () => {
    setModalVisible(false);
  };

  const handleChangePassword = async () => {
    setCpError('');

    if (!cpEmail.trim() || !cpOldPassword.trim() || !cpNewPassword.trim() || !cpConfirmPassword.trim()) {
      setCpError('Veuillez remplir tous les champs');
      return;
    }
    if (cpNewPassword.length < 6) {
      setCpError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (cpOldPassword === cpNewPassword) {
      setCpError('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    setCpLoading(true);
    const result = await changePassword(cpEmail.trim(), cpOldPassword, cpNewPassword);
    setCpLoading(false);

    if (result.success) {
      setCpSuccess(true);
    } else {
      setCpError(result.error || 'Une erreur est survenue');
    }
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo et titre */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/INP_HB_logo.jpg')}
                style={styles.logoGradient}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.schoolName}>INPHB</Text>
            <Text style={styles.appName}>Gestion des Résultats</Text>
            <Text style={styles.subtitle}>Portail Académique</Text>
          </View>

          {/* Carte de connexion */}
          <GlassCard style={styles.loginCard}>
            <Text style={styles.loginTitle}>Connexion</Text>
            <Text style={styles.loginHint}>
              Utilisez votre adresse email académique
            </Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="prenom.nom@inphb.ci"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={COLORS.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Message d'erreur */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Bouton connexion */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Bouton modifier le mot de passe */}
            <TouchableOpacity
              style={styles.changePasswordBtn}
              onPress={openPasswordModal}
              activeOpacity={0.75}
            >
              <Ionicons name="key-outline" size={15} color={COLORS.accent} />
              <Text style={styles.changePasswordText}>Modifier mon mot de passe</Text>
            </TouchableOpacity>

            {/* Info comptes de test */}
            <View style={styles.testAccounts}>
              <Text style={styles.testTitle}>Comptes de test :</Text>
              <Text style={styles.testItem}>👨‍💼 Admin : admin@inphb.ci / admin123</Text>
              <Text style={styles.testItem}>👨‍🏫 Prof : jean.kouassi@inphb.ci / prof123</Text>
              <Text style={styles.testItem}>👨‍🎓 Étudiant : konan.adou@inphb.ci / etud123</Text>
            </View>
          </GlassCard>

          {/* Footer */}
          <Text style={styles.footer}>
            © 2025-2026 INPHB — Projet de React Native
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL CHANGEMENT DE MOT DE PASSE*/}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKAV}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                {/* En-tête modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.modalIconGradient}>
                      <Ionicons name="key" size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Modifier le mot de passe</Text>
                    <Text style={styles.modalSubtitle}>Saisissez vos informations ci-dessous</Text>
                  </View>
                  <TouchableOpacity onPress={closePasswordModal} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={22} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>

                {cpSuccess ? (
                  /* Écran de succès */
                  <View style={styles.successContainer}>
                    <View style={styles.successIconWrap}>
                      <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
                    </View>
                    <Text style={styles.successTitle}>Mot de passe modifié !</Text>
                    <Text style={styles.successText}>
                      Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                    </Text>
                    <TouchableOpacity style={styles.successBtn} onPress={closePasswordModal} activeOpacity={0.85}>
                      <LinearGradient
                        colors={['#2563EB', '#1D4ED8']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.loginButtonGradient}
                      >
                        <Text style={styles.loginButtonText}>Retour à la connexion</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Formulaire */
                  <>
                    {/* Email / Login */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Adresse Email (identifiant)</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="prenom.nom@inphb.ci"
                          placeholderTextColor={COLORS.textTertiary}
                          value={cpEmail}
                          onChangeText={setCpEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Mot de passe actuel */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mot de passe actuel</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.inputFlex]}
                          placeholder="••••••••"
                          placeholderTextColor={COLORS.textTertiary}
                          value={cpOldPassword}
                          onChangeText={setCpOldPassword}
                          secureTextEntry={!showCpOld}
                        />
                        <TouchableOpacity onPress={() => setShowCpOld(!showCpOld)} style={styles.eyeBtn}>
                          <Ionicons name={showCpOld ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Nouveau mot de passe */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="lock-open-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.inputFlex]}
                          placeholder="Minimum 6 caractères"
                          placeholderTextColor={COLORS.textTertiary}
                          value={cpNewPassword}
                          onChangeText={setCpNewPassword}
                          secureTextEntry={!showCpNew}
                        />
                        <TouchableOpacity onPress={() => setShowCpNew(!showCpNew)} style={styles.eyeBtn}>
                          <Ionicons name={showCpNew ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Confirmer le nouveau mot de passe */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
                      <View style={[
                        styles.inputContainer,
                        cpConfirmPassword.length > 0 && cpNewPassword !== cpConfirmPassword
                          ? styles.inputContainerError
                          : null
                      ]}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.inputFlex]}
                          placeholder="Répétez le nouveau mot de passe"
                          placeholderTextColor={COLORS.textTertiary}
                          value={cpConfirmPassword}
                          onChangeText={setCpConfirmPassword}
                          secureTextEntry={!showCpConfirm}
                        />
                        <TouchableOpacity onPress={() => setShowCpConfirm(!showCpConfirm)} style={styles.eyeBtn}>
                          <Ionicons name={showCpConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </View>
                      {/* Indicateur visuel de correspondance */}
                      {cpConfirmPassword.length > 0 && (
                        <View style={styles.matchIndicator}>
                          <Ionicons
                            name={cpNewPassword === cpConfirmPassword ? 'checkmark-circle' : 'close-circle'}
                            size={14}
                            color={cpNewPassword === cpConfirmPassword ? '#22c55e' : COLORS.danger}
                          />
                          <Text style={[
                            styles.matchText,
                            { color: cpNewPassword === cpConfirmPassword ? '#22c55e' : COLORS.danger }
                          ]}>
                            {cpNewPassword === cpConfirmPassword ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Message d'erreur */}
                    {cpError ? (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
                        <Text style={styles.errorText}>{cpError}</Text>
                      </View>
                    ) : null}

                    {/* Boutons */}
                    <TouchableOpacity
                      style={styles.loginButton}
                      onPress={handleChangePassword}
                      disabled={cpLoading}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#2563EB', '#1D4ED8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.loginButtonGradient}
                      >
                        {cpLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Text style={styles.loginButtonText}>Confirmer le changement</Text>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={closePasswordModal} activeOpacity={0.75}>
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.md,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  schoolName: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    marginBottom: 4,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loginCard: {
    marginBottom: SPACING.lg,
  },
  loginTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: 4,
  },
  loginHint: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GLASS.input,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  inputContainerError: {
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  matchText: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
  },
  loginButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: SPACING.lg,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  changePasswordText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  cancelBtnText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  testAccounts: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.accentGlow,
  },
  testTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.accent,
    marginBottom: 6,
  },
  testItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  footer: {
    textAlign: 'center',
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },

  // ---- Modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalKAV: {
    width: '100%',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface || '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },

  // Succès
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  successIconWrap: {
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  successBtn: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});

export default LoginScreen;