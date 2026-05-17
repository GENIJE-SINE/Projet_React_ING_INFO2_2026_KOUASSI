// src/utils/gradesCalculator.js
// Logique métier pour le calcul des moyennes, validations, couleurs

// RÈGLES DE VALIDATION

// Note minimale pour valider une matière
export const NOTE_MIN_MATIERE = 6;

// Moyenne minimale pour valider un module
export const MOY_MIN_MODULE = 10;

// Moyenne générale minimale pour valider un semestre
export const MOY_MIN_SEMESTRE = 12;

// Moyenne minimale d'une matière pour être "suggestion de rattrapage" au niveau semestre
export const MOY_MIN_MATIERE_SEMESTRE = 12;

// CALCUL DE LA MOYENNE FINALE (session 1 + rattrapage)

/**
 * Calcule la moyenne finale d'une matière en tenant compte du rattrapage
 * Si note_session2 > note_session1 : finale = 0.2 * s1 + 0.8 * s2
 * Sinon : finale = note_session1
 */
export const calculerNotefinale = (noteS1, noteS2) => {
  if (noteS2 === null || noteS2 === undefined) return noteS1;
  if (noteS2 > noteS1) {
    return 0.2 * noteS1 + 0.8 * noteS2;
  }
  return noteS1;
};

// CONSTRUCTION DE LA STRUCTURE DE DONNÉES

/**
 * Construit la structure complète des résultats d'un étudiant
 * à partir des modules, matières et notes.
 *
 * @param {Array} modules - Liste des modules
 * @param {Array} matieresByModule - Map moduleId -> [matières]
 * @param {Array} notesS1 - Notes de session 1
 * @param {Array} notesS2 - Notes de session 2 (rattrapage)
 * @returns {Object} Structure complète avec moyennes et statuts
 */
export const construireResultats = (modules, matieresByModule, notesS1, notesS2 = []) => {
  // Créer des maps pour accès rapide aux notes
  const notesS1Map = {};
  notesS1.forEach(n => { notesS1Map[n.matiere_id] = n.note; });

  const notesS2Map = {};
  notesS2.forEach(n => { notesS2Map[n.matiere_id] = n.note; });

  let totalCoeffSemestre = 0;
  let totalMoyPonderee = 0;

  const modulesCalcules = modules.map(module => {
    const matieres = matieresByModule[module.id] || [];
    let totalCoeffModule = 0;
    let totalNotesPonderees = 0;

    const matieresCalculees = matieres.map(matiere => {
      const noteS1 = notesS1Map[matiere.id] ?? null;
      const noteS2 = notesS2Map[matiere.id] ?? null;
      const noteFinale = noteS1 !== null ? calculerNotefinale(noteS1, noteS2) : null;

      totalCoeffModule += matiere.coefficient;
      if (noteFinale !== null) {
        totalNotesPonderees += noteFinale * matiere.coefficient;
      }

      const validee = noteFinale !== null && noteFinale >= NOTE_MIN_MATIERE;

      return {
        ...matiere,
        noteS1,
        noteS2,
        noteFinale,
        validee,
        aRattrapage: noteS2 !== null,
      };
    });

    // Coefficient du module = somme des coefficients de ses matières
    const coeffModule = totalCoeffModule;
    const moyenneModule = totalCoeffModule > 0
      ? totalNotesPonderees / totalCoeffModule
      : null;

    const moduleValide = moyenneModule !== null && moyenneModule >= MOY_MIN_MODULE;
    const toutesMatieresValidees = matieresCalculees.every(m => m.validee);

    // Accumulation pour semestre
    totalCoeffSemestre += coeffModule;
    if (moyenneModule !== null) {
      totalMoyPonderee += moyenneModule * coeffModule;
    }

    return {
      ...module,
      matieres: matieresCalculees,
      coeffModule,
      moyenneModule,
      moduleValide,
      toutesMatieresValidees,
    };
  });

  const moyenneSemestre = totalCoeffSemestre > 0
    ? totalMoyPonderee / totalCoeffSemestre
    : null;

  const tousModulesValides = modulesCalcules.every(m => m.moduleValide);
  const semestreValide = tousModulesValides && moyenneSemestre !== null && moyenneSemestre >= MOY_MIN_SEMESTRE;

  return {
    modules: modulesCalcules,
    moyenneSemestre,
    semestreValide,
    tousModulesValides,
  };
};

// DÉTERMINATION DES COULEURS

/**
 * Détermine la couleur d'une matière dans le bulletin ou la matrice
 * 
 * Règles :
 * - Rouge : matière non validée (note < 6)
 * - Jaune (cas 1) : toutes matières du module validées, module non validé,
 *   note matière < 10
 * - Jaune (cas 2) : tous modules validés, semestre non validé,
 *   moyenne module < 12 OU (module ok mais matière < 12)
 * - Normal : matière et module et semestre OK
 */
export const getCouleurMatiere = (matiere, module, resultats) => {
  const { moyenneSemestre, semestreValide, tousModulesValides } = resultats;

  if (matiere.noteFinale === null) return 'gris'; // Pas de note

  // ROUGE : matière non validée (note < 6)
  if (!matiere.validee) return 'rouge';

  // Cas : toutes matières du module validées mais module non validé
  if (module.toutesMatieresValidees && !module.moduleValide) {
    // Jaune pour les matières avec note < 10
    if (matiere.noteFinale < MOY_MIN_MODULE) return 'jaune';
  }

  // Cas : semestre non validé → toute matière validée avec note < 12 en jaune
  if (!semestreValide) {
    if (matiere.noteFinale < MOY_MIN_MATIERE_SEMESTRE) return 'jaune';
  }

  return 'vert'; // Tout bon
};

/**
 * Détermine la couleur d'un module
 */
export const getCouleurModule = (module, resultats) => {
  const { semestreValide, tousModulesValides } = resultats;

  if (module.moyenneModule === null) return 'gris';

  // ROUGE : module non validé
  if (!module.moduleValide) return 'rouge';

  // Si le semestre n'est pas validé :
  // - modules dont la moyenne < 12 → jaune (sauf module non validé qui est rouge)
  // - module >=12 mais contenant une matière <12 → jaune
  if (!semestreValide) {
    if (module.moyenneModule < MOY_MIN_MATIERE_SEMESTRE) return 'jaune';
    const uneMatiereSousSeuil = module.matieres.some(m => m.noteFinale !== null && m.noteFinale < MOY_MIN_MATIERE_SEMESTRE);
    if (uneMatiereSousSeuil) return 'jaune';
  }

  return 'vert';
};

// DÉTERMINATION DES RATTRAPAGES

/**
 * Retourne la liste des matières à rattraper pour un étudiant
 * avec le statut obligatoire ou suggestion
 */
export const getMatiereRattrapage = (resultats) => {
  const obligatoires = [];
  const suggestions = [];

  resultats.modules.forEach(module => {
    module.matieres.forEach(matiere => {
      const couleur = getCouleurMatiere(matiere, module, resultats);
      if (couleur === 'rouge') {
        obligatoires.push({ ...matiere, module_nom: module.nom, obligatoire: true });
      } else if (couleur === 'jaune') {
        suggestions.push({ ...matiere, module_nom: module.nom, obligatoire: false });
      }
    });
  });

  return { obligatoires, suggestions };
};

// CONSTANTES DE COULEURS VISUELLES

export const COULEURS = {
  rouge: {
    bg: 'rgba(255, 59, 48, 0.15)',
    text: '#FF3B30',
    border: 'rgba(255, 59, 48, 0.4)',
    label: 'Non validé',
  },
  jaune: {
    bg: 'rgba(255, 204, 0, 0.15)',
    text: '#CC8800',
    border: 'rgba(255, 204, 0, 0.4)',
    label: 'Suggestion',
  },
  vert: {
    bg: 'rgba(52, 199, 89, 0.1)',
    text: '#34C759',
    border: 'rgba(52, 199, 89, 0.3)',
    label: 'Validé',
  },
  gris: {
    bg: 'rgba(142, 142, 147, 0.1)',
    text: '#8E8E93',
    border: 'rgba(142, 142, 147, 0.3)',
    label: 'Absent',
  },
};