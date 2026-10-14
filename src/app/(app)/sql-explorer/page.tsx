import { redirect } from 'next/navigation';

// L'explorateur SQL est désormais l'onglet « Base de données » des Paramètres.
export default function SqlExplorerPage() {
  redirect('/settings');
}
