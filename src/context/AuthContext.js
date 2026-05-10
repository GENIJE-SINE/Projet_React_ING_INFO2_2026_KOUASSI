// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../database/database';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si une session existe au démarrage
  useEffect(() => {
  const init = async () => {
    // Simule une lecture de base de données
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setLoading(false);
  };
  init();
}, []);

  // Connexion utilisateur

  const login = async (email, password) => {
  try {
    const userData = await loginUser(email, password);
    if (userData) {
    setUser(userData);
    return { success: true };
  }
    } catch (error) {
      console.error('Erreur login:', error);
      return { success: false, error: 'Erreur de connexion à la base de données' };
    }
  };

  const logout = () => {
    setUser(null);
  };

  // Vérifications de rôle
  const isAdmin = () => user?.role === 'admin';
  const isEnseignant = () => user?.role === 'enseignant';
  const isEtudiant = () => user?.role === 'etudiant';
  const isDirecteur = () => user?.admin_role === 'directeur';
  const isSousDirecteur = () => user?.admin_role === 'sous_directeur';
  const isInspecteur = () => user?.admin_role === 'inspecteur';

  // Peut modifier toutes les notes (directeur, sous-directeur)
  const peutToutModifier = () => isAdmin() && (isDirecteur() || isSousDirecteur());

  // Peut modifier les notes d'une classe (inspecteur de la filière)
  const peutModifierClasse = (classeId) => {
    if (peutToutModifier()) return true;
    // L'inspecteur peut modifier les classes de sa filière
    return isAdmin() && isInspecteur();
  };

  // Peut modifier les notes d'une matière (enseignant de la matière)
  const peutModifierMatiere = (enseignantId) => {
    if (peutToutModifier()) return true;
    return isEnseignant() && user?.id === enseignantId;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isEnseignant,
      isEtudiant,
      isDirecteur,
      isSousDirecteur,
      isInspecteur,
      peutToutModifier,
      peutModifierClasse,
      peutModifierMatiere,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être dans AuthProvider');
  return ctx;
};