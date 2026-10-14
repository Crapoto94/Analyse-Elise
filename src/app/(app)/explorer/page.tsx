'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ODataClient, ODataConfig, getEntityInfo } from '@/lib/odata';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader, LoadingBlock } from '@/components/ui';

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

  if (loading) return <LoadingBlock label="Chargement des collections…" />;

  return (
    <div className="page animate-fade-in">
      <PageHeader title="Explorateur d'entités" subtitle={<span className="font-mono text-[13px]">{config?.baseUrl}</span>} />

      {error ? (
        <div className="alert alert-danger" role="alert">
          <p className="font-medium">Erreur de connexion</p>
          <p className="mt-1 text-[13px] opacity-90">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm mt-3">Réessayer</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collections.map((collection) => {
            const info = getEntityInfo(collection.name);
            const count = counts[collection.name];
            return (
              <Link
                key={collection.name}
                href={`/explorer/${collection.name}`}
                className="card group flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] text-lg" style={{ background: 'var(--brand-soft)' }}>{info.icon}</span>
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--ink-3)' }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold">{info.label}</h3>
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{collection.kind}</p>
                </div>
                <div>
                  {count === undefined ? (
                    <span className="skeleton inline-block h-5 w-20 align-middle" />
                  ) : (
                    <span className={`badge num ${count === 0 ? 'badge-warn' : 'badge-brand'}`}>
                      {count === 0 ? 'Aucun élément' : `${count.toLocaleString('fr-FR')} éléments`}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
