// src/screens/AdminScreen.js
// Panneau d'administration — gestion complète
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getClasses, getFilieres, getEtudiantsByClasse,
  addUser, upsertRattrapage,
  getMatieresByModule, getModules,
  addFiliere, addMatiere, addModule, createClasse,
  getAllEnseignants, getAllMatieres, addEnseignantWithDetails
} from '../database/database';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, GLASS, RADIUS } from '../styles/theme';
import ScreenBackground from '../components/ScreenBackground';
import GlassCard from '../components/GlassCard';

// ─── Constante ───────────────────────────────────────────────
const ANNEE_COURANTE = '2024-2025';

// ─── Sous-composants utilitaires ────────────────────────────

const FormField = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textTertiary}
      keyboardType={keyboardType || 'default'}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize || 'words'}
    />
  </View>
);

const ChipSelector = ({ label, items, selected, onSelect, keyField = 'id', labelField = 'nom', nullable = false, nullLabel = 'Aucun' }) => (
  <View style={styles.fieldGroup}>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {nullable && (
        <TouchableOpacity
          style={[styles.roleBtn, !selected && styles.roleBtnActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.roleBtnText, !selected && styles.roleBtnTextActive]}>{nullLabel}</Text>
        </TouchableOpacity>
      )}
      {items.map(item => (
        <TouchableOpacity
          key={item[keyField]}
          style={[styles.roleBtn, selected === item[keyField] && styles.roleBtnActive]}
          onPress={() => onSelect(item[keyField])}
        >
          <Text style={[styles.roleBtnText, selected === item[keyField] && styles.roleBtnTextActive]}>
            {item[labelField]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// ─── Écran principal ─────────────────────────────────────────

const AdminScreen = ({ navigation }) => {
  const { user, isDirecteur, isSousDirecteur, isInspecteur } = useAuth();
  const [activeSection, setActiveSection] = useState('etudiants');

  // Données globales
  const [classes, setClasses] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);   // toutes les matières (liste admin)
  const [modules, setModules] = useState([]);      // modules pour la classe sélectionnée
  const [loading, setLoading] = useState(false);

  // Section étudiants
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [etudiants, setEtudiants] = useState([]);

  // ── Formulaire Ajouter Utilisateur ──
  const FORM_USER_INIT = {
    prenom: '', nom: '', email: '', password: '', matricule: '',
    role: 'etudiant', adminRole: '', classeId: null,
    // Champs spécifiques enseignant
    matiereId: null,
  };
  const [formUser, setFormUser] = useState(FORM_USER_INIT);

  // ── Formulaire Filière ──
  const [formFiliere, setFormFiliere] = useState({ nom: '', description: '' });

  // ── Formulaire Classe ──
  const [formClasse, setFormClasse] = useState({
    nom: '', filiereId: null, annee: ANNEE_COURANTE, semestre: 1
  });

  // ── Formulaire Matière ──
  const [formMatiere, setFormMatiere] = useState({
    nom: '', code: '', moduleId: null, coefficient: '1', enseignantId: null,
    // Pour filtrer les modules : on choisit d'abord une classe
    classeId: null,
  });
  const [modulesForMatiere, setModulesForMatiere] = useState([]);

  // ── Formulaire Module ──
  const [formModule, setFormModule] = useState({
    nom: '', classeId: null, semestre: 1
  });
  const [showAddModule, setShowAddModule] = useState(false);

  // ─── Chargement initial ──────────────────────────────────
  useEffect(() => { chargerDonnees(); }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    const [cls, fil, ens, mats] = await Promise.all([
      getClasses(), getFilieres(), getAllEnseignants(), getAllMatieres()
    ]);
    setClasses(cls);
    setFilieres(fil);
    setEnseignants(ens);
    setMatieres(mats);
    if (cls.length > 0) setSelectedClasse(cls[0]);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedClasse) chargerEtudiants();
  }, [selectedClasse]);

  const chargerEtudiants = async () => {
    const etds = await getEtudiantsByClasse(selectedClasse.id);
    setEtudiants(etds);
  };

  // Charger les modules quand la classe change dans le formulaire matière
  useEffect(() => {
    if (formMatiere.classeId) {
      getModules(formMatiere.classeId, 1).then(setModulesForMatiere);
    } else {
      setModulesForMatiere([]);
    }
    setFormMatiere(p => ({ ...p, moduleId: null }));
  }, [formMatiere.classeId]);

  // ─── Actions ─────────────────────────────────────────────

  const handleAddUser = async () => {
    const { prenom, nom, email, password, matricule, role, adminRole, classeId, matiereId } = formUser;
    if (!prenom || !nom || !email || !password) {
      Alert.alert('Champs manquants', 'Veuillez remplir les champs obligatoires (prénom, nom, email, mot de passe).');
      return;
    }
    try {
      if (role === 'enseignant') {
        // Utilise la fonction dédiée qui gère la matière + classe
        const res = await addEnseignantWithDetails(email, password, prenom, nom, matiereId, classeId);
        if (!res.success) throw new Error();
      } else {
        await addUser(
          matricule || null,
          email.toLowerCase(),
          password,
          prenom,
          nom,
          role,
          adminRole || null,
          classeId ? parseInt(classeId) : null
        );
      }
      Alert.alert('Succès', 'Utilisateur créé avec succès.');
      setFormUser(FORM_USER_INIT);
      chargerDonnees();
    } catch {
      Alert.alert('Erreur', "Impossible de créer l'utilisateur. Email ou matricule déjà utilisé.");
    }
  };

  const handleAddFiliere = async () => {
    if (!formFiliere.nom.trim()) {
      Alert.alert('Champ manquant', 'Le nom de la filière est obligatoire.');
      return;
    }
    const res = await addFiliere(formFiliere.nom, formFiliere.description);
    if (res.success) {
      Alert.alert('Succès', `Filière "${formFiliere.nom}" créée.`);
      setFormFiliere({ nom: '', description: '' });
      chargerDonnees();
    } else {
      Alert.alert('Erreur', 'Impossible de créer la filière.');
    }
  };

  const handleAddClasse = async () => {
    const { nom, filiereId, annee, semestre } = formClasse;
    if (!nom.trim() || !filiereId || !annee.trim()) {
      Alert.alert('Champs manquants', 'Nom, filière et année scolaire sont obligatoires.');
      return;
    }
    const res = await createClasse(nom, filiereId, annee, semestre);
    if (res.success) {
      Alert.alert('Succès', `Classe "${nom}" créée.`);
      setFormClasse({ nom: '', filiereId: null, annee: ANNEE_COURANTE, semestre: 1 });
      chargerDonnees();
    } else {
      Alert.alert('Erreur', 'Impossible de créer la classe. Elle existe peut-être déjà.');
    }
  };

  const handleAddModule = async () => {
    const { nom, classeId, semestre } = formModule;
    if (!nom.trim() || !classeId) {
      Alert.alert('Champs manquants', 'Nom et classe sont obligatoires.');
      return;
    }
    const res = await addModule(nom, classeId, semestre);
    if (res.success) {
      Alert.alert('Succès', `Module "${nom}" créé.`);
      setFormModule({ nom: '', classeId: null, semestre: 1 });
      setShowAddModule(false);
      // Rafraîchir les modules si la classe courante correspond
      if (formMatiere.classeId === classeId) {
        getModules(classeId, 1).then(setModulesForMatiere);
      }
    } else {
      Alert.alert('Erreur', 'Impossible de créer le module.');
    }
  };

  const handleAddMatiere = async () => {
    const { nom, code, moduleId, coefficient, enseignantId } = formMatiere;
    if (!nom.trim() || !moduleId) {
      Alert.alert('Champs manquants', 'Le nom de la matière et le module sont obligatoires.');
      return;
    }
    const coef = parseInt(coefficient) || 1;
    const res = await addMatiere(nom, code, moduleId, coef, enseignantId);
    if (res.success) {
      Alert.alert('Succès', `Matière "${nom}" créée.`);
      setFormMatiere({ nom: '', code: '', moduleId: null, coefficient: '1', enseignantId: null, classeId: formMatiere.classeId });
      chargerDonnees();
    } else {
      Alert.alert('Erreur', 'Impossible de créer la matière.');
    }
  };

  // ─── Navigation sections ─────────────────────────────────
  const sections = [
    { id: 'etudiants',    icon: 'people',       label: 'Étudiants' },
    { id: 'utilisateurs', icon: 'person-add',   label: 'Ajouter' },
    { id: 'classes',      icon: 'school',       label: 'Classes' },
    { id: 'filieres',     icon: 'layers',       label: 'Filières' },
    { id: 'matieres',     icon: 'book',         label: 'Matières' },
    { id: 'rattrapages',  icon: 'warning',      label: 'Rattrapages' },
  ];

  // ─── Render ───────────────────────────────────────────────
  return (
    <ScreenBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* En-tête admin */}
        <GlassCard style={styles.headerCard} variant="sm">
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Administration</Text>
              <Text style={styles.headerSub}>
                {isDirecteur() ? 'Directeur' : isSousDirecteur() ? 'Sous-Directeur' : 'Inspecteur'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Navigation sections */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionNav}>
          {sections.map(sec => (
            <TouchableOpacity
              key={sec.id}
              style={[styles.sectionBtn, activeSection === sec.id && styles.sectionBtnActive]}
              onPress={() => setActiveSection(sec.id)}
            >
              <Ionicons name={sec.icon} size={16} color={activeSection === sec.id ? COLORS.accent : COLORS.textTertiary} />
              <Text style={[styles.sectionBtnText, activeSection === sec.id && styles.sectionBtnTextActive]}>
                {sec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />}

        {/*SECTION ÉTUDIANTS  */}
        {activeSection === 'etudiants' && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classeScroll}>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.classeChip, selectedClasse?.id === cls.id && styles.classeChipActive]}
                  onPress={() => setSelectedClasse(cls)}
                >
                  <Text style={[styles.classeChipText, selectedClasse?.id === cls.id && styles.classeChipTextActive]}>
                    {cls.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <GlassCard style={styles.listCard}>
              <Text style={styles.listTitle}>
                Étudiants — {selectedClasse?.nom} ({etudiants.length})
              </Text>
              {etudiants.length === 0 ? (
                <Text style={styles.emptyText}>Aucun étudiant dans cette classe.</Text>
              ) : (
                etudiants.map((etud, idx) => (
                  <TouchableOpacity
                    key={etud.id}
                    style={[styles.etudRow, idx % 2 === 0 && styles.etudRowEven]}
                    onPress={() => navigation.navigate('Bulletin', { etudiantId: etud.id })}
                  >
                    <View style={styles.etudAvatar}>
                      <Text style={styles.etudAvatarText}>{etud.prenom[0]}{etud.nom[0]}</Text>
                    </View>
                    <View style={styles.etudInfo}>
                      <Text style={styles.etudNom}>{etud.nom} {etud.prenom}</Text>
                      <Text style={styles.etudMat}>{etud.matricule || 'Pas de matricule'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                ))
              )}
            </GlassCard>
          </View>
        )}

        {/*  SECTION AJOUTER UTILISATEUR */}
        {activeSection === 'utilisateurs' && (
          <GlassCard style={styles.formCard}>
            <Text style={styles.formTitle}>Créer un utilisateur</Text>

            <FormField label="Prénom *" value={formUser.prenom} onChangeText={v => setFormUser(p => ({ ...p, prenom: v }))} placeholder="Prénom" />
            <FormField label="Nom *" value={formUser.nom} onChangeText={v => setFormUser(p => ({ ...p, nom: v }))} placeholder="Nom de famille" />
            <FormField label="Email *" value={formUser.email} onChangeText={v => setFormUser(p => ({ ...p, email: v }))} placeholder="email@inphb.ci" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Mot de passe *" value={formUser.password} onChangeText={v => setFormUser(p => ({ ...p, password: v }))} placeholder="••••••••" secureTextEntry />
            <FormField label="Matricule (étudiants)" value={formUser.matricule} onChangeText={v => setFormUser(p => ({ ...p, matricule: v }))} placeholder="12INP00001" />

            {/* Sélecteur de rôle */}
            <Text style={styles.fieldLabel}>Rôle *</Text>
            <View style={styles.roleSelector}>
              {['etudiant', 'enseignant', 'admin'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, formUser.role === r && styles.roleBtnActive]}
                  onPress={() => setFormUser(p => ({ ...p, role: r, classeId: null, matiereId: null, adminRole: '' }))}
                >
                  <Text style={[styles.roleBtnText, formUser.role === r && styles.roleBtnTextActive]}>
                    {r === 'etudiant' ? 'Étudiant' : r === 'enseignant' ? 'Enseignant' : 'Admin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rôle admin */}
            {formUser.role === 'admin' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Rôle Admin</Text>
                <View style={styles.roleSelector}>
                  {[['directeur', 'Directeur'], ['sous_directeur', 'Sous-Dir.'], ['inspecteur', 'Inspecteur']].map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.roleBtn, formUser.adminRole === k && styles.roleBtnActive]}
                      onPress={() => setFormUser(p => ({ ...p, adminRole: k }))}
                    >
                      <Text style={[styles.roleBtnText, formUser.adminRole === k && styles.roleBtnTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Classe pour étudiant */}
            {formUser.role === 'etudiant' && (
              <ChipSelector
                label="Classe *"
                items={classes}
                selected={formUser.classeId}
                onSelect={v => setFormUser(p => ({ ...p, classeId: v }))}
              />
            )}

            {/* Matière + Classe optionnelle pour enseignant */}
            {formUser.role === 'enseignant' && (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.infoBoxText}>
                    Assignez une matière à cet enseignant. La classe est optionnelle et peut être définie plus tard.
                  </Text>
                </View>

                <ChipSelector
                  label="Matière enseignée"
                  items={matieres.map(m => ({ id: m.id, nom: `${m.nom} (${m.classe_nom})` }))}
                  selected={formUser.matiereId}
                  onSelect={v => setFormUser(p => ({ ...p, matiereId: v }))}
                  nullable
                  nullLabel="Non assignée"
                />

                <ChipSelector
                  label="Classe (optionnel)"
                  items={classes}
                  selected={formUser.classeId}
                  onSelect={v => setFormUser(p => ({ ...p, classeId: v }))}
                  nullable
                  nullLabel="Non assignée"
                />
              </>
            )}

            <TouchableOpacity style={styles.createBtn} onPress={handleAddUser} activeOpacity={0.85}>
              <Ionicons name="person-add" size={18} color={COLORS.white} />
              <Text style={styles.createBtnText}>Créer l'utilisateur</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* SECTION CLASSES  */}
        {activeSection === 'classes' && (
          <View>
            {/* Formulaire création classe */}
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>Nouvelle classe</Text>

              <FormField
                label="Nom de la classe *"
                value={formClasse.nom}
                onChangeText={v => setFormClasse(p => ({ ...p, nom: v }))}
                placeholder="ex: ING INFO 3"
                autoCapitalize="characters"
              />
              <FormField
                label="Année scolaire *"
                value={formClasse.annee}
                onChangeText={v => setFormClasse(p => ({ ...p, annee: v }))}
                placeholder="2025-2026"
                autoCapitalize="none"
              />

              <ChipSelector
                label="Filière *"
                items={filieres}
                selected={formClasse.filiereId}
                onSelect={v => setFormClasse(p => ({ ...p, filiereId: v }))}
              />

              <Text style={styles.fieldLabel}>Semestre *</Text>
              <View style={styles.roleSelector}>
                {[1, 2].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.roleBtn, formClasse.semestre === s && styles.roleBtnActive]}
                    onPress={() => setFormClasse(p => ({ ...p, semestre: s }))}
                  >
                    <Text style={[styles.roleBtnText, formClasse.semestre === s && styles.roleBtnTextActive]}>
                      Semestre {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.createBtn} onPress={handleAddClasse} activeOpacity={0.85}>
                <Ionicons name="add-circle" size={18} color={COLORS.white} />
                <Text style={styles.createBtnText}>Créer la classe</Text>
              </TouchableOpacity>
            </GlassCard>

            {/* Liste des classes existantes */}
            <GlassCard style={styles.listCard}>
              <Text style={styles.listTitle}>Classes existantes ({classes.length})</Text>
              {classes.map((cls, idx) => (
                <View key={cls.id} style={[styles.classeRow, idx % 2 === 0 && styles.etudRowEven]}>
                  <View style={styles.classeRowIcon}>
                    <Ionicons name="school" size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.etudInfo}>
                    <Text style={styles.etudNom}>{cls.nom}</Text>
                    <Text style={styles.etudMat}>{cls.filiere_nom} — S{cls.semestre} — {cls.annee_scolaire}</Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {/*SECTION FILIÈRES */}
        {activeSection === 'filieres' && (
          <View>
            {/* Formulaire création filière */}
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>Nouvelle filière</Text>

              <FormField
                label="Nom de la filière *"
                value={formFiliere.nom}
                onChangeText={v => setFormFiliere(p => ({ ...p, nom: v }))}
                placeholder="ex: STIC"
                autoCapitalize="characters"
              />
              <FormField
                label="Description"
                value={formFiliere.description}
                onChangeText={v => setFormFiliere(p => ({ ...p, description: v }))}
                placeholder="Sciences et Technologies..."
              />

              <TouchableOpacity style={styles.createBtn} onPress={handleAddFiliere} activeOpacity={0.85}>
                <Ionicons name="layers" size={18} color={COLORS.white} />
                <Text style={styles.createBtnText}>Créer la filière</Text>
              </TouchableOpacity>
            </GlassCard>

            {/* Liste des filières existantes */}
            <GlassCard style={styles.listCard}>
              <Text style={styles.listTitle}>Filières existantes ({filieres.length})</Text>
              {filieres.map((fil, idx) => (
                <View key={fil.id} style={[styles.classeRow, idx % 2 === 0 && styles.etudRowEven]}>
                  <View style={[styles.classeRowIcon, { backgroundColor: 'rgba(5,150,105,0.1)' }]}>
                    <Ionicons name="layers" size={20} color="#059669" />
                  </View>
                  <View style={styles.etudInfo}>
                    <Text style={styles.etudNom}>{fil.nom}</Text>
                    {fil.description ? <Text style={styles.etudMat}>{fil.description}</Text> : null}
                  </View>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {/* SECTION MATIÈRES  */}
        {activeSection === 'matieres' && (
          <View>
            {/* Formulaire ajout module (optionnel, expansible) */}
            <GlassCard style={styles.formCard}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setShowAddModule(v => !v)}
                activeOpacity={0.8}
              >
                <Text style={styles.collapsibleTitle}>
                  <Ionicons name="folder-open" size={15} color={COLORS.accent} />  Créer un module (optionnel)
                </Text>
                <Ionicons name={showAddModule ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>

              {showAddModule && (
                <View style={{ marginTop: SPACING.md }}>
                  <FormField
                    label="Nom du module *"
                    value={formModule.nom}
                    onChangeText={v => setFormModule(p => ({ ...p, nom: v }))}
                    placeholder="ex: Mathématiques"
                  />
                  <ChipSelector
                    label="Classe *"
                    items={classes}
                    selected={formModule.classeId}
                    onSelect={v => setFormModule(p => ({ ...p, classeId: v }))}
                  />
                  <Text style={styles.fieldLabel}>Semestre *</Text>
                  <View style={styles.roleSelector}>
                    {[1, 2].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.roleBtn, formModule.semestre === s && styles.roleBtnActive]}
                        onPress={() => setFormModule(p => ({ ...p, semestre: s }))}
                      >
                        <Text style={[styles.roleBtnText, formModule.semestre === s && styles.roleBtnTextActive]}>
                          S{s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[styles.createBtn, styles.createBtnSecondary]} onPress={handleAddModule} activeOpacity={0.85}>
                    <Ionicons name="add" size={18} color={COLORS.accent} />
                    <Text style={[styles.createBtnText, { color: COLORS.accent }]}>Créer le module</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

            {/* Formulaire ajout matière */}
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>Nouvelle matière</Text>

              <FormField
                label="Nom de la matière *"
                value={formMatiere.nom}
                onChangeText={v => setFormMatiere(p => ({ ...p, nom: v }))}
                placeholder="ex: Analyse Numérique"
              />
              <FormField
                label="Code (optionnel)"
                value={formMatiere.code}
                onChangeText={v => setFormMatiere(p => ({ ...p, code: v }))}
                placeholder="ex: MATH301"
                autoCapitalize="characters"
              />
              <FormField
                label="Coefficient"
                value={formMatiere.coefficient}
                onChangeText={v => setFormMatiere(p => ({ ...p, coefficient: v.replace(/[^0-9]/g, '') }))}
                placeholder="1"
                keyboardType="numeric"
              />

              {/* Filtrer les modules par classe */}
              <ChipSelector
                label="Classe (pour filtrer les modules) *"
                items={classes}
                selected={formMatiere.classeId}
                onSelect={v => setFormMatiere(p => ({ ...p, classeId: v }))}
              />

              {formMatiere.classeId && (
                <ChipSelector
                  label="Module *"
                  items={modulesForMatiere}
                  selected={formMatiere.moduleId}
                  onSelect={v => setFormMatiere(p => ({ ...p, moduleId: v }))}
                />
              )}

              {formMatiere.classeId && modulesForMatiere.length === 0 && (
                <View style={styles.infoBox}>
                  <Ionicons name="warning-outline" size={16} color="#D97706" />
                  <Text style={[styles.infoBoxText, { color: '#D97706' }]}>
                    Aucun module pour cette classe. Créez-en un ci-dessus.
                  </Text>
                </View>
              )}

              {/* Enseignant optionnel */}
              <ChipSelector
                label="Enseignant (optionnel)"
                items={enseignants.map(e => ({ id: e.id, nom: `${e.prenom} ${e.nom}` }))}
                selected={formMatiere.enseignantId}
                onSelect={v => setFormMatiere(p => ({ ...p, enseignantId: v }))}
                nullable
                nullLabel="Non assigné"
              />

              <TouchableOpacity style={styles.createBtn} onPress={handleAddMatiere} activeOpacity={0.85}>
                <Ionicons name="book" size={18} color={COLORS.white} />
                <Text style={styles.createBtnText}>Ajouter la matière</Text>
              </TouchableOpacity>
            </GlassCard>

            {/* Liste des matières existantes */}
            <GlassCard style={styles.listCard}>
              <Text style={styles.listTitle}>Matières ({matieres.length})</Text>
              {matieres.length === 0 ? (
                <Text style={styles.emptyText}>Aucune matière enregistrée.</Text>
              ) : (
                matieres.map((mat, idx) => (
                  <View key={mat.id} style={[styles.matiereRow, idx % 2 === 0 && styles.etudRowEven]}>
                    <View style={[styles.classeRowIcon, { backgroundColor: 'rgba(37,99,235,0.1)' }]}>
                      <Ionicons name="book" size={18} color="#2563EB" />
                    </View>
                    <View style={styles.etudInfo}>
                      <Text style={styles.etudNom}>{mat.nom}{mat.code ? ` — ${mat.code}` : ''}</Text>
                      <Text style={styles.etudMat}>{mat.classe_nom} › {mat.module_nom}</Text>
                      <Text style={styles.etudMat}>
                        Coef. {mat.coefficient} •{' '}
                        {mat.enseignant_prenom
                          ? `${mat.enseignant_prenom} ${mat.enseignant_nom}`
                          : 'Enseignant non assigné'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          </View>
        )}

        {/* SECTION RATTRAPAGES */}
        {activeSection === 'rattrapages' && (
          <GlassCard style={styles.listCard}>
            <Text style={styles.listTitle}>Gestion des Rattrapages</Text>
            <Text style={styles.emptyText}>
              Sélectionnez un étudiant depuis la matrice ou la liste pour définir ses dates de rattrapage.
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('Matrice')}
              activeOpacity={0.85}
            >
              <Ionicons name="grid" size={18} color={COLORS.white} />
              <Text style={styles.createBtnText}>Aller à la Matrice</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },

  // Header
  headerCard: { marginBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TYPOGRAPHY.h3 },
  headerSub: { ...TYPOGRAPHY.caption },

  // Navigation
  sectionNav: { marginBottom: SPACING.md },
  sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: COLORS.glassBorder, marginRight: 8 },
  sectionBtnActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  sectionBtnText: { ...TYPOGRAPHY.captionBold, color: COLORS.textTertiary },
  sectionBtnTextActive: { color: COLORS.accent },

  // Chips classes
  classeScroll: { marginBottom: SPACING.sm },
  classeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: COLORS.glassBorder, marginRight: 8 },
  classeChipActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  classeChipText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
  classeChipTextActive: { color: COLORS.accent },

  // Listes
  listCard: { marginBottom: SPACING.sm },
  listTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', paddingVertical: SPACING.md, color: COLORS.textTertiary },

  etudRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  etudRowEven: { backgroundColor: 'rgba(248,250,255,0.5)', marginHorizontal: -16, paddingHorizontal: 16 },
  etudAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },
  etudAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
  etudInfo: { flex: 1 },
  etudNom: { ...TYPOGRAPHY.bodyBold },
  etudMat: { ...TYPOGRAPHY.caption },

  classeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  classeRowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center' },

  matiereRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },

  // Formulaires
  formCard: { marginBottom: SPACING.sm },
  formTitle: { ...TYPOGRAPHY.h3, marginBottom: SPACING.md },
  fieldGroup: { marginBottom: SPACING.md },
  fieldLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary, marginBottom: 6 },
  fieldInput: { ...GLASS.input, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary },

  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  roleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: COLORS.glassBorder },
  roleBtnActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleBtnTextActive: { color: COLORS.accent },

  // Boutons
  createBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: SPACING.sm, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  createBtnSecondary: { backgroundColor: COLORS.accentLight, shadowOpacity: 0, elevation: 0 },
  createBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Section collapsible (module)
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collapsibleTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.accent },

  // Info box
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md },
  infoBoxText: { flex: 1, ...TYPOGRAPHY.caption, color: COLORS.accent, lineHeight: 18 },
});

export default AdminScreen;