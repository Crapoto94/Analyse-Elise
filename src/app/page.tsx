import { redirect } from 'next/navigation';

// Pas de page d'accueil : on arrive directement sur les statistiques (le middleware renvoie vers la connexion si besoin).
export default function Home() {
  redirect('/statistiques');
}
