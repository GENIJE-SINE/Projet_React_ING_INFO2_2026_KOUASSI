# Rapport Technique — INPHB Grades
### Application de Gestion des Résultats Académiques

---

| Propriété | Valeur |
|-----------|--------|
| Nom du projet | GestResultsEtudiants |
| Version | 1.0.0 |
| Plateformes | iOS · Android · Web |
| Framework | React Native + Expo |
| Langage | JavaScript |
| Base de données | Supabase (PostgreSQL) |
| Dépôt GitHub | Voire 6.Téléchargement et exécution |
| Année scolaire | 2025-2026 |

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Diagramme des cas d'utilisation](#2-diagramme-des-cas-dutilisation)
3. [Diagramme des classes UML](#3-diagramme-des-classes-uml)
4. [Structure du projet](#4-structure-du-projet)
5. [Logique entre les données](#5-logique-entre-les-données)
6. [Téléchargement et exécution](#6-téléchargement-et-exécution)

---

## 1. Présentation du projet

**INPHB Grades** est une application mobile et web de gestion des résultats académiques développée pour l'Institut National Polytechnique Houphouët-Boigny (INPHB), Yamoussoukro, Côte d'Ivoire.

Elle couvre l'intégralité du cycle des résultats scolaires : saisie des notes par les enseignants, consultation des bulletins par les étudiants, gestion des rattrapages, visualisation de la matrice de classe et administration des utilisateurs.

La base de données initiale (store JavaScript en mémoire) a été remplacée par **Supabase**, une plateforme BaaS (Backend-as-a-Service) reposant sur PostgreSQL. Les requêtes sont centralisées dans `src/database/database.js` et les identifiants de connexion sont gérés via un fichier `.env`.

---

## 2. Diagramme des cas d'utilisation

Trois acteurs principaux interagissent avec le système :

| Acteur | Cas d'utilisation principaux |
|--------|------------------------------|
| **Étudiant** | Consulter son bulletin · Voir la matrice de sa classe · Voir ses rattrapages |
| **Enseignant** | Saisir / modifier les notes de ses matières · Consulter les bulletins de ses classes |
| **Administration** | Créer les utilisateurs, les filières, les classes, les matières, les modules,  · Beneficier des fonctionnalités des autres utilisateurs · Voir tous les bulletins et matrices |

**Relations notables :**

- Un étudiant ne peut accéder qu'à son propre bulletin depuis la matrice.
- Un enseignant hérite des droits administration s'il est directeur ou sous-directeur.
- L'inspecteur a des droits restreints à sa filière.

### Matrice des permissions

| Action | Directeur | Sous-Directeur | Inspecteur | Enseignant | Étudiant |
|--------|:---------:|:--------------:|:----------:|:----------:|:--------:|
| Voir tous les bulletins | ✅ | ✅ | ✅ *(sa filière)* | ✅ *(ses classes)* | ❌ |
| Voir son propre bulletin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir la matrice de sa classe | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modifier les notes de ses matières | ✅ | ✅ | ✅ *(sa filière)* | ✅ | ❌ |
| Créer des utilisateurs | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 3. Diagramme des classes UML

### Entités et attributs clés

| Entité | Attributs principaux | Relations |
|--------|----------------------|-----------|
| `users` | id, matricule, email, password, prenom, nom, role, admin_role, classe_id | → classes (étudiant) · ← matieres (enseignant) |
| `filieres` | id, nom, description | ← classes |
| `classes` | id, nom, filiere_id, annee_scolaire, semestre | → filieres · ← modules · ←> users |
| `modules` | id, nom, classe_id, semestre | → classes · ← matieres |
| `matieres` | id, nom, code, module_id, coefficient, enseignant_id | → modules · → users · ← notes · ← rattrapages |
| `notes` | id, etudiant_id, matiere_id, session (1\|2), note | → users · → matieres |
| `rattrapages` | etudiant_id, matiere_id, date_rattrapage, obligatoire | → users · → matieres |

### Schéma de relations

```
filiere  ──<  classe  ──<  module  ──<  matiere  ──<  note
                             matiere  >──  enseignant (user)
                   classe  >──<  etudiant (user)
                   matiere  ──<  rattrapage  >──  etudiant
```

---

## 4. Structure du projet

```
GestResultsEtudiants/
│
├── App.js                        # Racine — providers GestureHandler + SafeArea
├── index.js                      # Point d'entrée Expo (registerRootComponent)
├── .env                          # Variables d'environnement Supabase (non versionné)
├── package.json
├── babel.config.js
├── metro.config.js
├── app.json
│
└── src/
    ├── context/
    │   ├── AuthContext.js        # Session utilisateur — login synchrone
    │   └── NetworkContext.js     # Détection de l'état réseau (navigator.onLine)
    │
    ├── navigation/
    │   └── AppNavigator.js       # 3 Tab navigateurs selon le rôle
    │
    ├── database/
    │   └── database.js           # Couche d'accès données — requêtes Supabase
    │
    ├── utils/
    │   └── gradesCalculators.js  # Logique métier : calculs et validations
    │
    ├── styles/
    │   └── theme.js              # Thème Liquid Glass — couleurs et styles
    │
    └── screens/
        ├── LoginScreen.js        # Écran de connexion
        ├── HomeScreen.js         # Tableau de bord adapté au rôle
        ├── MatriceScreen.js      # Matrice de résultats de la classe
        ├── BulletinScreen.js     # Bulletin individuel + onglet rattrapages
        ├── SaisieNotesScreen.js  # Saisie et modification des notes
        ├── AdminScreen.js        # Panneau d'administration
        └── ProfileScreen.js      # Profil utilisateur et paramètres
```

---

## 5. Logique entre les données

### 5.1 Migration vers Supabase

Le client Supabase est initialisé dans `database.js` à partir des variables d'environnement `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` définies dans le fichier `.env`. Le package `react-native-dotenv` assure la lecture de ce fichier au bundling.

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
```

### 5.2 Calcul de la note finale

```
Si note_S2 > note_S1 :
    note_finale = 0.2 × note_S1 + 0.8 × note_S2
Sinon :
    note_finale = note_S1
```

### 5.3 Règles de validation

| Niveau | Condition | Seuil |
|--------|-----------|-------|
| Matière | note_finale ≥ seuil | **6 / 20** |
| Module | moyenne pondérée ≥ seuil | **10 / 20** |
| Semestre | tous modules validés ET moyenne générale ≥ seuil | **12 / 20** |
| Année | les deux semestres validés | — |

La moyenne d'un module est calculée par moyenne pondérée :

```
moyenne_module = Σ(note_matière × coefficient) / Σ(coefficients)
```

### 5.4 Code couleur des notes

| Couleur | Condition | Signification |
|---------|-----------|---------------|
| 🔴 Rouge | note_matière < 6 | Rattrapage **obligatoire** |
| 🟡 Jaune | matière < 10 avec module non validé | Suggestion de rattrapage |
| 🟡 Jaune | module < 12 avec semestre non validé | Suggestion de rattrapage |
| 🟢 Vert | tout validé | Aucun rattrapage nécessaire |
| ⚫ Gris | pas de note saisie | Absent |


---

## 6. Téléchargement et exécution

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Expo CLI | `npm install -g expo-cli` |
| Expo Go (mobile) | iOS ou Android |

### Installation

```bash
# 1. Cloner le dépôt
git clone "https://github.com/GENIJE-SINE/Projet_React_ING_INFO2_2026_KOUASSI.git"
cd GestResultsEtudiants

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npx expo start -c          # QR code pour Expo Go
npx expo start --android        # Émulateur Android
npx expo start --ios            # Simulateur iOS (macOS uniquement)
```


### Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Directeur | `admin@inphb.ci` | `admin123` |
| Enseignant | `jean.kouassi@inphb.ci` | `prof123` |
| Enseignant | `marie.bamba@inphb.ci` | `prof123` |
| Étudiant  | `konan.adou@inphb.ci` | `etud123` |
| Étudiant | `brice.yao@inphb.ci` | `etud123` |
| Étudiant | `adjoua.coulibaly@inphb.ci` | `etud123` |

