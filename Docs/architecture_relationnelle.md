# Architecture Relationnelle - Stats Elise

Ce document détaille l'organisation structurelle et les interdépendances du projet.

## Hiérarchie des Composants

```text
src/
├── 🛡️ CORE (Infrastructure & Config)
│   ├── app/layout.tsx ────────── Racine de l'application
│   ├── middleware.ts ─────────── Garde d'authentification
│   ├── lib/prisma.ts ─────────── Client Base de Données (SQLite)
│   ├── lib/auth.ts ───────────── Logique de Session & Hachage
│   └── app/api/auth/ ─────────── Terminaux d'Authentification
│
├── 🚀 FEATURE (Routes & Pages)
│   ├── app/(app)/statistiques/ ── Dashboard Global
│   ├── app/(app)/stats-cab/ ───── Analyses Cabinet
│   ├── app/(app)/explorer/ ────── Navigation OData
│   ├── app/(app)/sql-explorer/ ── Requêteur OData RAW
│   └── app/(app)/settings/ ────── Configuration & Sync
│
├── 🧱 SUB (Composants UI)
│   ├── components/Sidebar.tsx ─── Menu Latéral & État Session
│   └── components/StatsCard.tsx ─ Cartes KPI Réutilisables
│
└── 🛠️ UTILITY (Outils & Helpers)
    ├── lib/odata.ts ──────────── Client OData & Mapping
    ├── lib/odata-direct.ts ───── Logique Métier OData + Cache
    ├── lib/sync.ts ───────────── Orchestrateur de Synchronisation
    └── app/api/odata-proxy/ ───── Proxy de contournement CORS
```

---

## Détails Relationnels

### 🛡️ CORE

#### [prisma.ts](file:///c:/CODE/Stats_Elise/src/lib/prisma.ts)
- **Utilise** : `@prisma/client`
- **Utilisé par** : `auth.ts`, `odata-direct.ts`, `api/hierarchy`
- **Relation** : **persiste dans** `system.db`

#### [auth.ts](file:///c:/CODE/Stats_Elise/src/lib/auth.ts)
- **Utilise** : `prisma.ts`, `next/headers`, `crypto`
- **Utilisé par** : `middleware.ts`, `api/auth/*`
- **Relation** : **déclenche** la gestion des Cookies de session

#### [middleware.ts](file:///c:/CODE/Stats_Elise/src/middleware.ts)
- **Utilise** : `next/server`
- **Utilisé par** : Next.js Engine
- **Relation** : **dépend de** l'état du cookie `elise_session`

---

### 🚀 FEATURE

#### [statistiques/page.tsx](file:///c:/CODE/Stats_Elise/src/app/(app)/statistiques/page.tsx)
- **Utilise** : `recharts`, `Sidebar.tsx`
- **Utilisé par** : Routing Next.js
- **Relation** : **déclenche** les appels vers `api/stats` et `api/hierarchy`

#### [settings/page.tsx](file:///c:/CODE/Stats_Elise/src/app/(app)/settings/page.tsx)
- **Utilise** : `lib/sync.ts`, `lib/odata.ts`
- **Utilisé par** : Routing Next.js
- **Relation** : **persiste dans** `localStorage` et **déclenche** `api/sync`

---

### 🛠️ UTILITY

#### [odata.ts](file:///c:/CODE/Stats_Elise/src/lib/odata.ts)
- **Utilise** : - (Standard Fetch/Buffer)
- **Utilisé par** : `odata-direct.ts`, `sync.ts`, `api/odata-proxy`
- **Relation** : **dépend de** l'API OData externe d'Elise

#### [odata-direct.ts](file:///c:/CODE/Stats_Elise/src/lib/odata-direct.ts)
- **Utilise** : `odata.ts`, `prisma.ts`
- **Utilisé par** : `api/stats`, `api/hierarchy`
- **Relation** : **dépend de** `odata.ts` (calculs métiers complexes)

#### [sync.ts](file:///c:/CODE/Stats_Elise/src/lib/sync.ts)
- **Utilise** : `odata.ts` (Interfaces)
- **Utilisé par** : `settings/page.tsx`
- **Relation** : **déclenche** un flux de données (Stream) via `api/sync`

---

### 🧱 SUB

#### [Sidebar.tsx](file:///c:/CODE/Stats_Elise/src/components/Sidebar.tsx)
- **Utilise** : `next/link`, `next/navigation`
- **Utilisé par** : `(app)/layout.tsx`
- **Relation** : **déclenche** `api/auth/session` et `api/auth/logout`
