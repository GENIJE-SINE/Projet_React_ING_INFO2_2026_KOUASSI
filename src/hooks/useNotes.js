// src/hooks/useNotes.js
// Hook pour la gestion de la saisie et sauvegarde des notes
import { useState, useCallback } from 'react';
import { upsertNote } from '../database/database';

/**
 * Hook pour gérer la saisie des notes
 * Gère l'état local des notes et leur persistance
 */
const useNotes = () => {
  // { etudiantId_matiereId_session: noteString }
  const [notesLocales, setNotesLocales] = useState({});
  const [modifications, setModifications] = useState({});
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreur, setErreur] = useState(null);

  const clé = (etudiantId, matiereId, session) => `${etudiantId}_${matiereId}_${session}`;

  // Initialiser les notes depuis la base
  const initialiserNotes = useCallback((notesDB) => {
    const map = {};
    notesDB.forEach(n => {
      map[clé(n.etudiant_id, n.matiere_id, n.session)] = String(n.note);
    });
    setNotesLocales(map);
    setModifications({});
  }, []);

  // Modifier une note localement
  const modifierNote = useCallback((etudiantId, matiereId, session, valeur) => {
    // Validation
    if (valeur !== '' && (isNaN(Number(valeur)) || Number(valeur) < 0 || Number(valeur) > 20)) {
      return false;
    }
    const k = clé(etudiantId, matiereId, session);
    setNotesLocales(prev => ({ ...prev, [k]: valeur }));
    setModifications(prev => ({ ...prev, [k]: { etudiantId, matiereId, session } }));
    return true;
  }, []);

  // Obtenir la valeur d'une note
  const getNote = useCallback((etudiantId, matiereId, session) => {
    return notesLocales[clé(etudiantId, matiereId, session)] ?? '';
  }, [notesLocales]);

  // Vérifier si une note est modifiée
  const estModifiee = useCallback((etudiantId, matiereId, session) => {
    return !!modifications[clé(etudiantId, matiereId, session)];
  }, [modifications]);

  // Compter les modifications
  const nombreModifications = Object.keys(modifications).length;

  // Sauvegarder toutes les modifications
  const sauvegarderTout = useCallback(async () => {
    if (nombreModifications === 0) return { succes: true, count: 0 };
    setSauvegarde(true);
    setErreur(null);
    let count = 0;
    try {
      for (const [, info] of Object.entries(modifications)) {
        const { etudiantId, matiereId, session } = info;
        const noteStr = notesLocales[clé(etudiantId, matiereId, session)];
        if (noteStr !== '' && noteStr !== undefined) {
          await upsertNote(etudiantId, matiereId, session, parseFloat(noteStr));
          count++;
        }
      }
      setModifications({});
      return { succes: true, count };
    } catch (err) {
      setErreur(err.message);
      return { succes: false, erreur: err.message };
    } finally {
      setSauvegarde(false);
    }
  }, [modifications, notesLocales, nombreModifications]);

  return {
    getNote,
    modifierNote,
    estModifiee,
    nombreModifications,
    initialiserNotes,
    sauvegarderTout,
    sauvegarde,
    erreur,
  };
};

export default useNotes;