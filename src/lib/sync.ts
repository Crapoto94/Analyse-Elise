import { ODataConfig } from './odata';

export async function syncData(onProgress?: (progress: string) => void) {
  const savedConfig = sessionStorage.getItem('odata_config');
  if (!savedConfig) throw new Error("OData client not configured");
  
  const config = JSON.parse(savedConfig) as ODataConfig;

  onProgress?.("Démarrage de la synchronisation serveur...");

  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erreur lors de la synchronisation serveur");
  }

  onProgress?.("Synchronisation terminée !");
}
