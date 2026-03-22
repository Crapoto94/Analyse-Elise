This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Déploiement Docker (Proxmox/Production)

Ce projet est optimisé pour un déploiement via Docker Compose, idéal pour un environnement Proxmox.

### 1. Préparation
Assurez-vous que le dossier `prisma` contient votre base de données `system.db` ou qu'il est prêt à être monté.

### 2. Lancement
Exécutez la commande suivante à la racine du projet :

```bash
docker compose up -d --build
```

### 3. Vérification
L'application sera accessible sur le port **5002**. Vous pouvez vérifier la santé du conteneur avec :
```bash
docker compose ps
```

### Configuration OData
Les identifiants de connexion OData sont configurés dans le fichier `docker-compose.yml`. En cas de changement, modifiez les variables `ODATA_USERNAME` et `ODATA_PASSWORD` puis redémarrez le conteneur.
