# Plateforme d'analyse d'audience temps réel

Projet semestriel 4A TL – S2 (2025-2026). Solution SaaS d'analyse comportementale et de tracking d'audience en temps réel, dans l'esprit de Google Analytics / Hotjar : un SDK à installer sur un site client, une API qui ingère et agrège les données, et un tableau de bord temps réel avec un support client intégré.

---

## Stack technique


| Domaine          | Technologies                                                |
| ---------------- | ----------------------------------------------------------- |
| Backend / API    | Node.js 24 LTS, Express 5, MongoDB (Mongoose 8), TypeScript |
| Authentification | JWT (access + refresh), argon2, cookie httpOnly             |
| Temps réel       | Socket.IO (WebSocket), Redis ; WebRTC pour la visio (bonus) |
| Frontend         | Next.js 16, React 19, TypeScript                            |
| Validation       | Zod                                                         |
| Outils           | ESLint, Prettier, GitHub Actions (CI)                       |


---



## Structure du projet

Le dépôt est un **monorepo** géré avec les *workspaces npm*

```
M1S2/
├── apps/
│   ├── api/            # API REST + temps réel (Node.js / Express)
│   └── dashboard/      # Interface web (Next.js) — non démarré pour l'instant
├── packages/
│   └── shared/         # Types et schémas partagés entre api, dashboard et SDK
├── docs/               # Documentation (technique, cahier des charges, cadrage)
├── .github/workflows/  # Intégration continue (CI)
└── README.md
```

Détail du backend (là où on travaille actuellement) :

```
apps/api/src/
├── config/         # variables d'environnement et connexion à la base
├── models/         # schémas Mongoose (users, companies)
├── middlewares/    # authentification, contrôle des rôles, gestion des erreurs
├── modules/
│   ├── auth/       # inscription, connexion, JWT
│   └── admin/      # administration des comptes, impersonation
├── scripts/        # scripts utilitaires (création de l'admin)
└── server.ts       # point d'entrée de l'API
```

---



## Prérequis

- **Node.js 24 LTS** (vérifier avec `node -v`). Conseillé : installer via [nvm](https://github.com/nvm-sh/nvm), puis `nvm use`.
- **npm 10+** (livré avec Node).
- **Git** configuré avec **commits signés** (voir `CONTRIBUTING.md`).
- Un **Redis** local (utile plus tard pour le temps réel) : `brew install redis && brew services start redis`.

> La base **MongoDB** est un cluster Atlas **partagé** par l'équipe : rien à installer, il suffit de récupérer l'URL de connexion (voir Variables d'environnement).

---



## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/NoanWasTaken/M1S2.git
cd M1S2

# 2. Installer toutes les dépendances du monorepo en une fois
npm install

# 3. Créer le fichier d'environnement de l'API à partir de l'exemple
cp apps/api/.env.example apps/api/.env
# puis remplir les valeurs (voir la section suivante)
```

---



## Variables d'environnement

Le fichier `apps/api/.env` n'est **jamais** versionné (il contient des secrets). Chaque membre crée le sien à partir de `.env.example`.

Pour rester cohérent avec la base partagée, **demande les valeurs complètes à l'équipe sur un canal privé** : tout le monde utilise le même `.env`. C'est important, notamment parce que certains secrets serviront à chiffrer des données stockées dans la base commune.


| Variable                | Rôle                               | Valeur                   |
| ----------------------- | ---------------------------------- | ------------------------ |
| `PORT`                  | Port d'écoute de l'API             | `4000`                   |
| `MONGODB_URI`           | Connexion au cluster Atlas partagé | fournie par l'équipe     |
| `REDIS_URL`             | Connexion Redis (local)            | `redis://127.0.0.1:6379` |
| `JWT_ACCESS_SECRET`     | Secret des access tokens           | fourni par l'équipe      |
| `JWT_REFRESH_SECRET`    | Secret des refresh tokens          | fourni par l'équipe      |
| `APP_SECRET_ENC_KEY`    | Clé de chiffrement des APP_SECRET  | fourni par l'équipe      |
| `CORS_DASHBOARD_ORIGIN` | Origine autorisée du dashboard     | `http://localhost:3000`  |
| `NODE_ENV`              | Environnement                      | `development`            |


> Pour générer un secret aléatoire (si tu configures un environnement neuf) : `openssl rand -hex 32`.

---



## Lancer le projet

```bash
# Lancer l'API (port 4000)
npm run dev --workspace apps/api
```

Tu dois voir dans la console `Connected to MongoDB` puis `API ready on http://localhost:4000`. Vérifie avec [http://localhost:4000/health](http://localhost:4000/health) : la réponse doit être `{"status":"ok"}`.

---



## Tester le backend

**1. Créer le compte admin** (nécessaire pour valider les inscriptions) :

```bash
npm run seed:admin --workspace apps/api
```

Cela crée un admin `admin@m1s2.local` / `admin1234` (identifiants modifiables via `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans le `.env`).

**2. Inscrire un webmaster** (crée une entreprise + un utilisateur, en attente de validation) :

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": { "name": "Ma Boutique", "baseUrl": "https://maboutique.fr", "kbisFileRef": "kbis-123", "contact": { "name": "Test", "email": "contact@maboutique.fr" } },
    "user": { "email": "test@maboutique.fr", "password": "monMotDePasse123" }
  }'
```

**3. Se connecter en admin, lister et valider l'entreprise** (la validation active le webmaster) :

```bash
# login admin -> récupérer accessToken
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@m1s2.local", "password": "admin1234" }'

# lister les entreprises (récupérer l'_id) puis valider
curl -X POST http://localhost:4000/api/v1/admin/companies/ID_ENTREPRISE/validate \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

**4. Se connecter comme webmaster** : une fois l'entreprise validée, le login renvoie un `accessToken`.

### Aperçu des routes disponibles


| Méthode | Route                                  | Accès    |
| ------- | -------------------------------------- | -------- |
| GET     | `/health`                              | public   |
| POST    | `/api/v1/auth/register`                | public   |
| POST    | `/api/v1/auth/login`                   | public   |
| GET     | `/api/v1/auth/me`                      | connecté |
| GET     | `/api/v1/admin/companies`              | admin    |
| POST    | `/api/v1/admin/companies/:id/validate` | admin    |
| POST    | `/api/v1/admin/companies/:id/reject`   | admin    |
| POST    | `/api/v1/admin/impersonate/:id`        | admin    |


---



## Scripts utiles


| Commande                                  | Effet                                                  |
| ----------------------------------------- | ------------------------------------------------------ |
| `npm install`                             | Installe les dépendances de tout le monorepo           |
| `npm run dev --workspace apps/api`        | Lance l'API en mode développement                      |
| `npm run seed:admin --workspace apps/api` | Crée le compte admin de base                           |
| `npm run build --workspace apps/api`      | Compile l'API (à lancer avant de pousser, comme la CI) |
| `npm run lint`                            | Vérifie le code (ESLint) sur tout le projet            |
| `npm run format`                          | Formate le code (Prettier)                             |


> Réflexe conseillé : lancer `npm run build --workspace apps/api` **avant de pousser**. La CI fait la même chose et bloquera la PR si ça ne compile pas.

---



## Workflow Git

On travaille sur **trois types de branches** :

- `main` : branche stable. On y arrive uniquement par PR depuis `dev`, à chaque fin de lot.
- `dev` : branche d'intégration. On y fusionne les fonctionnalités terminées via PR.
- `feature/nom-de-la-fonctionnalite` : une branche par fonctionnalité, qu'on PR sur `dev`.

---



## Documentation

- `docs/cadrage-projet-analytics.md` — vue d'ensemble du projet
- `docs/cahier-des-charges.md` — besoins, contraintes, critères de recette
- `docs/documentation-technique.md` — architecture détaillée
- `docs/issues-projet.md` — backlog des issues

