// src/hooks/useResultats.js
// Hook personnalisé pour charger et calculer les résultats d'un étudiant
import { useState, useEffect, useCallback } from 'react';
import {
  getModules, getMatieresByModule,
  getNotesByEtudiant, getEtudiantById
} from '../database/database';
import { construireResultats, getMatiereRattrapage } from '../utils/gradesCalculator';

/**
 * Hook qui charge tous les résultats d'un étudiant
 * @param {number} etudiantId - ID de l'étudiant
 * @param {number} semestre - 1 ou 2
 */
const useResultats = (etudiantId, semestre = 1) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [etudiant, setEtudiant] = useState(null);
  const [resultats, setResultats] = useState(null);
  const [infoRattrapage, setInfoRattrapage] = useState({ obligatoires: [], suggestions: [] });

  const charger = useCallback(async () => {
    if (!etudiantId) return;
    setLoading(true);
    setError(null);
    try {
      const etud = await getEtudiantById(etudiantId);
      setEtudiant(etud);

      if (!etud?.classe_id) {
        setLoading(false);
        return;
      }

      const modules = await getModules(etud.classe_id, semestre);
      const matieresByModule = {};
      for (const mod of modules) {
        matieresByModule[mod.id] = await getMatieresByModule(mod.id);
      }

      const notesS1 = await getNotesByEtudiant(etudiantId, 1);
      const notesS2 = await getNotesByEtudiant(etudiantId, 2);

      const res = construireResultats(modules, matieresByModule, notesS1, notesS2);
      setResultats(res);

      const info = getMatiereRattrapage(res);
      setInfoRattrapage(info);

    } catch (err) {
      console.error('useResultats error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [etudiantId, semestre]);

  useEffect(() => { charger(); }, [charger]);

  return { loading, error, etudiant, resultats, infoRattrapage, refresh: charger };
};

export default useResultats;