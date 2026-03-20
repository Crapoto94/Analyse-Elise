'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ODataClient, ODataConfig, getEntityInfo } from '@/lib/odata';
import { syncData, SyncProgress } from '@/lib/sync';
import Link from 'next/link';

interface EntityProgress {
  status: 'pending' | 'fetching' | 'saving' | 'done' | 'error' | 'skipped';
  count?: number;
  error?: string;
}

export default function ExplorerPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [config, setConfig] = useState<ODataConfig | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sync modal state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);

  // Sync progress state
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<'selecting' | 'running' | 'done'>('selecting');
  const [entityProgress, setEntityProgress] = useState<Record<string, EntityProgress>>({});
  const [currentEntity, setCurrentEntity] = useState<string>('');
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncDoneCount, setSyncDoneCount] = useState(0);
  const [syncGlobalCount, setSyncGlobalCount] = useState(0);

  useEffect(() => {
    const savedConfig = sessionStorage.getItem('odata_config');
    if (!savedConfig) { router.push('/connect'); return; }

    const odataConfig = JSON.parse(savedConfig);
    setConfig(odataConfig);

    const client = new ODataClient(odataConfig);
    client.getCollections()
      .then(async (res) => {
        setCollections(res.value);
        setSelectedEntities(res.value.map((c: any) => c.name));
        setLoading(false);

        const countPromises = res.value.map(async (collection: any) => {
          try {
            const count = await client.getCount(collection.name);
            setCounts(prev => ({ ...prev, [collection.name]: count }));
          } catch { /* silent */ }
        });
        await Promise.all(countPromises);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [router]);

  const openSyncModal = () => {
    setSyncPhase('selecting');
    setEntityProgress({});
    setSyncDoneCount(0);
    setSyncGlobalCount(0);
    setCurrentEntity('');
    setSyncModalOpen(true);
  };

  const handleSync = async () => {
    setSyncPhase('running');
    setSyncing(true);

    // Initialize progress state for all selected entities
    const initialProgress: Record<string, EntityProgress> = {};
    for (const e of selectedEntities) initialProgress[e] = { status: 'pending' };
    setEntityProgress(initialProgress);

    try {
      await syncData(selectedEntities, (event: SyncProgress) => {
        if (event.type === 'start') {
          setSyncTotal(event.total || selectedEntities.length);
        }
        if (event.type === 'entity_start') {
          setCurrentEntity(event.entity || '');
          setEntityProgress(prev => ({
            ...prev,
            [event.entity!]: { status: 'fetching' }
          }));
        }
        if (event.type === 'entity_progress') {
          setEntityProgress(prev => ({
            ...prev,
            [event.entity!]: { status: 'fetching', count: event.count }
          }));
        }
        if (event.type === 'entity_fetched') {
          setEntityProgress(prev => ({
            ...prev,
            [event.entity!]: { status: 'saving', count: event.count }
          }));
        }
        if (event.type === 'entity_done') {
          setEntityProgress(prev => ({
            ...prev,
            [event.entity!]: { status: 'done', count: event.count }
          }));
          setSyncDoneCount(d => d + 1);
          setSyncGlobalCount(c => c + (event.count || 0));
        }
        if (event.type === 'entity_error') {
          setEntityProgress(prev => ({
            ...prev,
            [event.entity!]: { status: 'error', error: event.error }
          }));
          setSyncDoneCount(d => d + 1);
        }
        if (event.type === 'done') {
          setSyncPhase('done');
          setSyncing(false);
          setSyncGlobalCount(event.totalCount || 0);
        }
      });
    } catch (e: any) {
      console.error(e);
      setSyncPhase('done');
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement des collections...</p>
      </div>
    );
  }

  const overallPercent = syncTotal > 0 ? Math.round((syncDoneCount / syncTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Explorateur d&apos;Entités</h1>
          <p className="text-slate-500 mt-1">{config?.baseUrl}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={openSyncModal}
            disabled={syncing}
            className={`px-4 py-2 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-200 transition-all ${syncing ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
          >
            {syncing ? '⌛ Sync en cours...' : '🔄 Synchro Locale'}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('odata_config'); router.push('/connect'); }}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {error ? (
        <div className="max-w-7xl mx-auto p-8 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          <h3 className="text-xl font-bold mb-2">Erreur de connexion</h3>
          <p className="italic">{error}</p>
          <button onClick={() => router.push('/connect')} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium">Réessayer</button>
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

      {/* Sync Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">

            {syncPhase === 'selecting' && (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Sélection des Entités</h2>
                <p className="text-slate-500 text-sm mb-4">Choisissez les entités à synchroniser localement.</p>

                <div className="flex justify-between items-center mb-3">
                  <button onClick={() => setSelectedEntities(collections.map(c => c.name))} className="text-sm font-bold text-blue-600 hover:text-blue-800">Tout sélectionner</button>
                  <button onClick={() => setSelectedEntities([])} className="text-sm font-bold text-slate-500 hover:text-slate-700">Tout désélectionner</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-6 border border-slate-100 rounded-xl p-3 bg-slate-50 shadow-inner">
                  {collections.map(collection => {
                    const info = getEntityInfo(collection.name);
                    const isSelected = selectedEntities.includes(collection.name);
                    return (
                      <label key={collection.name} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-slate-100'}`}>
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedEntities([...selectedEntities, collection.name]);
                            else setSelectedEntities(selectedEntities.filter(n => n !== collection.name));
                          }}
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-sm">{info.label}</span>
                          <span className="text-xs text-slate-400">{collection.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setSyncModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Annuler</button>
                  <button onClick={handleSync} disabled={selectedEntities.length === 0} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
                    Lancer la Synchro
                  </button>
                </div>
              </>
            )}

            {(syncPhase === 'running' || syncPhase === 'done') && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold text-slate-800">
                    {syncPhase === 'done' ? '✅ Synchronisation terminée' : '⌛ Synchronisation en cours...'}
                  </h2>
                  <span className="text-sm font-bold text-blue-600">{overallPercent}%</span>
                </div>

                {/* Overall progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  {syncDoneCount}/{syncTotal} entités — {syncGlobalCount.toLocaleString()} enregistrements
                </p>

                {/* Per-entity progress list */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {selectedEntities.map(entity => {
                    const prog = entityProgress[entity];
                    const info = getEntityInfo(entity);
                    const statusColors: Record<string, string> = {
                      pending: 'text-slate-300',
                      fetching: 'text-blue-500 animate-pulse',
                      saving: 'text-amber-500 animate-pulse',
                      done: 'text-emerald-600',
                      error: 'text-red-500',
                      skipped: 'text-slate-400',
                    };
                    const statusIcons: Record<string, string> = {
                      pending: '○',
                      fetching: '⟳',
                      saving: '💾',
                      done: '✓',
                      error: '✗',
                      skipped: '—',
                    };
                    const status = prog?.status || 'pending';

                    return (
                      <div key={entity} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${entity === currentEntity && syncPhase === 'running' ? 'bg-blue-50 ring-1 ring-blue-100' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-base ${statusColors[status]}`}>{statusIcons[status]}</span>
                          <div>
                            <span className="font-medium text-slate-700">{info.label}</span>
                            {prog?.error && <span className="block text-xs text-red-500 italic">{prog.error.slice(0, 60)}</span>}
                          </div>
                        </div>
                        {prog?.count !== undefined && prog.count >= 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {prog.count.toLocaleString()} lignes
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {syncPhase === 'done' && (
                  <div className="flex justify-end">
                    <button onClick={() => setSyncModalOpen(false)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                      Fermer
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
