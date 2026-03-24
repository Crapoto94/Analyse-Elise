'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ODataClient, ODataConfig, getEntityInfo } from '@/lib/odata';
import Link from 'next/link';

export default function ExplorerPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [config, setConfig] = useState<ODataConfig | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const resSession = await fetch('/api/auth/session');
        const sessionJson = await resSession.json();
        if (sessionJson.user?.role !== 'ADMIN') {
           router.push('/statistiques');
           return;
        }

        const resConfig = await fetch('/api/config/odata');
        if (!resConfig.ok) throw new Error('Impossible de charger la configuration OData');
        const odataConfig = await resConfig.ok ? await resConfig.json() : null;
        
        if (!odataConfig || !odataConfig.baseUrl) {
          setError('Configuration OData manquante sur le serveur.');
          setLoading(false);
          return;
        }

        setConfig(odataConfig);

        const client = new ODataClient(odataConfig);
        const res = await client.getCollections();
        setCollections(res.value);
        setLoading(false);

        const countPromises = res.value.map(async (collection: any) => {
          try {
            const count = await client.getCount(collection.name);
            setCounts(prev => ({ ...prev, [collection.name]: count }));
          } catch { /* silent */ }
        });
        await Promise.all(countPromises);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement des collections...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Explorateur d&apos;Entités</h1>
          <p className="text-slate-500 mt-1">{config?.baseUrl}</p>
        </div>
        <div className="flex gap-4 items-center">
        </div>
      </header>

      {error ? (
        <div className="max-w-7xl mx-auto p-8 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          <h3 className="text-xl font-bold mb-2">Erreur de connexion</h3>
          <p className="italic">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium">Réessayer</button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {collections.map((collection) => {
            const info = getEntityInfo(collection.name);
            return (
              <Link
                key={collection.name}
                href={`/explorer/${collection.name}`}
                className="group card hover:border-blue-200 hover:ring-1 hover:ring-blue-100 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {info.icon}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{collection.kind}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1">
                  {info.label}
                </h3>
                <div className="flex items-center gap-2 mt-auto">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    counts[collection.name] === undefined ? 'bg-slate-100 text-slate-400 animate-pulse' :
                    counts[collection.name] === 0 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {counts[collection.name] === undefined ? '...' :
                     counts[collection.name] === 0 ? 'Aucun élément' :
                     `${counts[collection.name].toLocaleString()} éléments`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
