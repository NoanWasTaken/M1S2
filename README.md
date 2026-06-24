# Plateforme d'analyse d'audience temps réel

Projet semestriel 4A TL – S2 (2025-2026). Solution SaaS d'analyse comportementale et de tracking d'audience en temps réel, dans l'esprit de Google Analytics / Hotjar : un SDK à installer sur un site client, une API qui ingère et agrège les données, et un tableau de bord temps réel avec un support client intégré.

> Ce dépôt contient le **produit** (plateforme + SDK). Le **site de démonstration** sur lequel on branchera le SDK est dans un dépôt séparé.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Lancer le projet](#lancer-le-projet)
- [Scripts utiles](#scripts-utiles)
- [Workflow Git](#workflow-git)
- [Documentation](#documentation)
- [Équipe](#équipe)

---

## Stack technique

| Domaine | Technologies |
| --- | --- |
| Backend / API | Node.js 24 LTS, Express 5, MongoDB (Mongoose 8), TypeScript |
| Temps réel | Socket.IO (WebSocket), Redis ; WebRTC pour la visio (bonus) |
| Frontend | Next.js 16, React 19, TypeScript |
| Validation | Zod |
| Outils | ESLint, Prettier, GitHub Actions (CI) |

Les choix et leur justification sont détaillés dans `docs/documentation-technique.md`.

---

## Structure du projet

Le dépôt est un **monorepo** géré avec les *workspaces npm* (intégrés à npm, rien à installer en plus).

```
M1S2/
├── apps/
│   ├── api/            # API REST + temps réel (Node.js / Express)
│   └── dashboard/      # Interface web (Next.js)
├── packages/
│   └── shared/         # Types et schémas partagés entre api, dashboard et SDK
├── docs/               # Documentation (technique, cahier des charges, cadrage)
├── .github/workflows/  # Intégration continue (CI)
└── README.md
```

> Les packages `sdk-frontend` et `sdk-backend` seront ajoutés plus tard (lot SDK), pour ne pas surcharger l'initialisation.

---

## Prérequis

- **Node.js 24 LTS** (vérifier avec `node -v`). Conseillé : installer via [nvm](https://github.com/nvm-sh/nvm).
- **npm 10+** (livré avec Node).
- **Git** configuré avec **commits signés** (voir `CONTRIBUTING.md`).
- Un accès à une base **MongoDB** (local ou MongoDB Atlas gratuit) et à **Redis** (local ou service géré) — nécessaires seulement quand on lancera l'API.

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/NoanWasTaken/M1S2.git
cd M1S2

# 2. Installer toutes les dépendances du monorepo en une fois
npm install

# 3. Créer les fichiers d'environnement à partir des exemples
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
# puis remplir les valeurs (URL MongoDB, secrets JWT, etc.)
```

---

## Lancer le projet

```bash
# Lancer l'API (port 4000 par défaut)
npm run dev --workspace apps/api

# Lancer le dashboard (port 3000 par défaut)
npm run dev --workspace apps/dashboard
```

L'API sera disponible sur `http://localhost:4000` et le dashboard sur `http://localhost:3000`.

---

## Scripts utiles

| Commande | Effet |
| --- | --- |
| `npm install` | Installe les dépendances de tout le monorepo |
| `npm run dev --workspace apps/api` | Lance l'API en mode développement |
| `npm run dev --workspace apps/dashboard` | Lance le dashboard |
| `npm run lint` | Vérifie le code (ESLint) sur tout le projet |
| `npm run format` | Formate le code (Prettier) |
| `npm run build` | Compile l'API et le dashboard |

---

## Workflow Git

On travaille sur **trois types de branches** :

- **`main`** : branche de production, toujours stable. On y arrive uniquement par PR depuis `dev`.
- **`dev`** : branche d'intégration. On y fusionne les fonctionnalités terminées via PR.
- **`feature/nom-de-la-fonctionnalite`** : une branche par fonctionnalité, sur laquelle on développe, puis qu'on PR sur `dev`.

Le détail (nommage, règles de PR, messages de commit, commits signés) est dans **`CONTRIBUTING.md`**.

---

## Documentation

- `docs/cadrage-projet-analytics.md` — vue d'ensemble du projet
- `docs/cahier-des-charges.md` — besoins, contraintes, critères de recette
- `docs/documentation-technique.md` — architecture détaillée
- `docs/issues-projet.md` — backlog des issues

---

## Équipe

| Membre | Rôle principal |
| --- | --- |
| *à compléter* | Backend / API |
| *à compléter* | Frontend / Dashboard |
| *à compléter* | Web temps réel |

La répartition détaillée des tâches est suivie dans les **issues** et le **board GitHub** du projet.