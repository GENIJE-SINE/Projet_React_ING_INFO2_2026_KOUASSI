// src/database/database.js


import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// CONFIGURATION SUPABASE
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// HASHAGE DU MOT DE PASSE
const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

//RETOUR DES ERREUR DE LA BASE DE DONNÉES
const throwIfError = (error, context = '') => {
  if (error) {
    console.error(`[Supabase] ${context}:`, error.message);
    throw new Error(error.message);
  }
};


// AUTHENTIFICATION

export const loginUser = async (email, password) => {
  const hashed = hashPassword(password);
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      classes (
        nom,
        filieres ( nom )
      )
    `)
    .eq('email', email.toLowerCase())
    .eq('password', hashed)
    .single();

  if (error) return null;

  return data
    ? {
        ...data,
        classe_nom: data.classes?.nom ?? null,
        filiere_nom: data.classes?.filieres?.nom ?? null,
      }
    : null;
};


// CLASSES

export const getClasses = async (userRole, userClasseId) => {
  if (userRole === 'etudiant') {
    const { data, error } = await supabase
      .from('classes')
      .select('*, filieres(nom)')
      .eq('id', userClasseId);
    throwIfError(error, 'getClasses/etudiant');
    return (data ?? []).map(flattenFiliere);
  }

  const { data, error } = await supabase
    .from('classes')
    .select('*, filieres(nom)')
    .order('nom');
  throwIfError(error, 'getClasses');
  return (data ?? []).map(flattenFiliere);
};

// MODULES

export const getModules = async (classeId, semestre) => {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('classe_id', classeId)
    .eq('semestre', semestre)
    .order('id');
  throwIfError(error, 'getModules');
  return data ?? [];
};

// MATIÈRES

export const getMatieresByModule = async (moduleId) => {
  const { data, error } = await supabase
    .from('matieres')
    .select('*, users!enseignant_id(prenom, nom)')
    .eq('module_id', moduleId)
    .order('id');
  throwIfError(error, 'getMatieresByModule');

  return (data ?? []).map((m) => ({
    ...m,
    enseignant_prenom: m.users?.prenom ?? null,
    enseignant_nom: m.users?.nom ?? null,
    users: undefined,
  }));
};

export const getMatieresByEnseignant = async (enseignantId) => {
  const { data, error } = await supabase
    .from('matieres')
    .select(`
      *,
      modules (
        nom,
        classe_id,
        classes ( nom )
      )
    `)
    .eq('enseignant_id', enseignantId);
  throwIfError(error, 'getMatieresByEnseignant');

  return (data ?? []).map((m) => ({
    ...m,
    module_nom: m.modules?.nom ?? null,
    classe_id: m.modules?.classe_id ?? null,
    classe_nom: m.modules?.classes?.nom ?? null,
    modules: undefined,
  }));
};

export const getAllMatieres = async () => {
  const { data, error } = await supabase
    .from('matieres')
    .select(`
      *,
      modules (
        nom,
        classe_id,
        classes ( nom )
      ),
      users!enseignant_id ( prenom, nom )
    `)
    .order('id');
  throwIfError(error, 'getAllMatieres');

  return (data ?? []).map((m) => ({
    ...m,
    module_nom: m.modules?.nom ?? null,
    classe_id: m.modules?.classe_id ?? null,
    classe_nom: m.modules?.classes?.nom ?? null,
    enseignant_prenom: m.users?.prenom ?? null,
    enseignant_nom: m.users?.nom ?? null,
    modules: undefined,
    users: undefined,
  }));
};

// ÉTUDIANTS

export const getEtudiantsByClasse = async (classeId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('classe_id', classeId)
    .eq('role', 'etudiant')
    .order('nom')
    .order('prenom');
  throwIfError(error, 'getEtudiantsByClasse');
  return data ?? [];
};

export const getEtudiantById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      classes (
        nom,
        semestre,
        filieres ( nom )
      )
    `)
    .eq('id', id)
    .single();
  throwIfError(error, 'getEtudiantById');

  return data
    ? {
        ...data,
        classe_nom: data.classes?.nom ?? null,
        semestre: data.classes?.semestre ?? null,
        filiere_nom: data.classes?.filieres?.nom ?? null,
      }
    : null;
};

// NOTES

export const getNotesByEtudiant = async (etudiantId, session = 1) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*, matieres(nom, coefficient, module_id, code)')
    .eq('etudiant_id', etudiantId)
    .eq('session', session);
  throwIfError(error, 'getNotesByEtudiant');

  return (data ?? []).map((n) => ({
    ...n,
    matiere_nom: n.matieres?.nom ?? null,
    coefficient: n.matieres?.coefficient ?? null,
    module_id: n.matieres?.module_id ?? null,
    code: n.matieres?.code ?? null,
    matieres: undefined,
  }));
};

export const getAllNotesByEtudiant = async (etudiantId) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*, matieres(nom, coefficient, module_id, code)')
    .eq('etudiant_id', etudiantId)
    .order('matiere_id')
    .order('session');
  throwIfError(error, 'getAllNotesByEtudiant');

  return (data ?? []).map((n) => ({
    ...n,
    matiere_nom: n.matieres?.nom ?? null,
    coefficient: n.matieres?.coefficient ?? null,
    module_id: n.matieres?.module_id ?? null,
    code: n.matieres?.code ?? null,
    matieres: undefined,
  }));
};


//Upsert d'une note (INSERT ou UPDATE si conflit)
export const upsertNote = async (etudiantId, matiereId, session, note) => {
  const { error } = await supabase
    .from('notes')
    .upsert(
      {
        etudiant_id: etudiantId,
        matiere_id: matiereId,
        session,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'etudiant_id,matiere_id,session' }
    );
  throwIfError(error, 'upsertNote');
};

// RATTRAPAGES

export const getRattrapagesByEtudiant = async (etudiantId) => {
  const { data, error } = await supabase
    .from('rattrapages')
    .select(`
      *,
      matieres (
        nom,
        module_id,
        modules ( nom )
      )
    `)
    .eq('etudiant_id', etudiantId)
    .order('date_rattrapage');
  throwIfError(error, 'getRattrapagesByEtudiant');

  return (data ?? []).map((r) => ({
    ...r,
    matiere_nom: r.matieres?.nom ?? null,
    module_id: r.matieres?.module_id ?? null,
    module_nom: r.matieres?.modules?.nom ?? null,
    matieres: undefined,
  }));
};

export const upsertRattrapage = async (etudiantId, matiereId, dateRattrapage, statut, obligatoire) => {
  const { error } = await supabase
    .from('rattrapages')
    .upsert(
      {
        etudiant_id: etudiantId,
        matiere_id: matiereId,
        date_rattrapage: dateRattrapage,
        statut,
        obligatoire: obligatoire ? 1 : 0,
      },
      { onConflict: 'etudiant_id,matiere_id' }
    );
  throwIfError(error, 'upsertRattrapage');
};

// CONFIGURATION ÉCOLE

export const getEcoleConfig = async () => {
  const { data, error } = await supabase
    .from('ecole_config')
    .select('*')
    .limit(1)
    .single();
  throwIfError(error, 'getEcoleConfig');
  return data;
};
// FILIÈRES

export const getFilieres = async () => {
  const { data, error } = await supabase
    .from('filieres')
    .select('*')
    .order('nom');
  throwIfError(error, 'getFilieres');
  return data ?? [];
};

export const addFiliere = async (nom, description = '') => {
  const { data, error } = await supabase
    .from('filieres')
    .insert({ nom: nom.trim(), description: description.trim() })
    .select('id')
    .single();
  if (error) {
    console.error('Erreur création filière:', error.message);
    return { success: false, error };
  }
  return { success: true, id: data.id };
};

// GESTION UTILISATEURS / ADMINS

export const addUser = async (matricule, email, password, prenom, nom, role, adminRole, classeId) => {
  const hashed = hashPassword(password);
  const { error } = await supabase
    .from('users')
    .insert({
      matricule,
      email: email.toLowerCase(),
      password: hashed,
      prenom,
      nom,
      role,
      admin_role: adminRole ?? null,
      classe_id: classeId ?? null,
    });
  throwIfError(error, 'addUser');
};

export const getAllEnseignants = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, prenom, nom, email, classe_id, classes(nom)')
    .eq('role', 'enseignant')
    .order('nom')
    .order('prenom');
  throwIfError(error, 'getAllEnseignants');

  return (data ?? []).map((u) => ({
    ...u,
    classe_nom: u.classes?.nom ?? null,
    classes: undefined,
  }));
};

export const addEnseignantWithDetails = async (
  email, password, prenom, nom, matiereId = null, classeId = null
) => {
  const hashed = hashPassword(password);
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password: hashed,
      prenom,
      nom,
      role: 'enseignant',
      classe_id: classeId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erreur création enseignant:', error.message);
    return { success: false, error };
  }

  if (matiereId) {
    await assignEnseignantToMatiere(matiereId, data.id);
  }
  return { success: true, id: data.id };
};

// MODULES & MATIÈRES (ADMIN)

export const createClasse = async (nom, filiereId, annee = '2025-2026', semestre = 1) => {
  const { data, error } = await supabase
    .from('classes')
    .insert({ nom, filiere_id: filiereId, annee_scolaire: annee, semestre })
    .select('id')
    .single();
  if (error) {
    console.error('Erreur création classe:', error.message);
    return { success: false, error };
  }
  return { success: true, id: data.id };
};

export const addModule = async (nom, classeId, semestre) => {
  const { data, error } = await supabase
    .from('modules')
    .insert({ nom: nom.trim(), classe_id: classeId, semestre })
    .select('id')
    .single();
  if (error) {
    console.error('Erreur création module:', error.message);
    return { success: false, error };
  }
  return { success: true, id: data.id };
};

export const addMatiere = async (nom, code, moduleId, coefficient, enseignantId = null) => {
  const { data, error } = await supabase
    .from('matieres')
    .insert({
      nom: nom.trim(),
      code: code ? code.trim() : null,
      module_id: moduleId,
      coefficient,
      enseignant_id: enseignantId ?? null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('Erreur création matière:', error.message);
    return { success: false, error };
  }
  return { success: true, id: data.id };
};

export const assignEnseignantToMatiere = async (matiereId, enseignantId) => {
  const { error } = await supabase
    .from('matieres')
    .update({ enseignant_id: enseignantId })
    .eq('id', matiereId);
  if (error) {
    console.error('Erreur assignation enseignant:', error.message);
    return { success: false, error };
  }
  return { success: true };
};

export const assignEnseignantToClasse = async (enseignantId, classeId) => {
  const { error } = await supabase
    .from('users')
    .update({ classe_id: classeId })
    .eq('id', enseignantId)
    .eq('role', 'enseignant');
  if (error) {
    console.error('Erreur assignation classe:', error.message);
    return { success: false, error };
  }
  return { success: true };
};

// CHANGEMENT DE MOT DE PASSE

export const changePassword = async (email, oldPassword, newPassword) => {
  try {
    const hashedOld = hashPassword(oldPassword);

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('password', hashedOld)
      .single();

    if (fetchError || !user) {
      return { success: false, error: 'Email ou mot de passe actuel incorrect' };
    }

    const hashedNew = hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNew, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour du mot de passe' };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    return { success: false, error: 'Une erreur est survenue, veuillez réessayer' };
  }
};


// HELPER PRIVÉ : aplatir la jointure filieres

const flattenFiliere = (c) => ({
  ...c,
  filiere_nom: c.filieres?.nom ?? null,
  filieres: undefined,
});