'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ODataConfig } from '@/lib/odata';

export default function ConnectPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'connexion' | 'logs'>('connexion');
  const [baseUrl, setBaseUrl] = useState('https://ville-ivry94.illico.city/AppBI/odata/');
  const [username, setUsername] = useState('User_StatBI');
  const [password, setPassword] = useState('2V.}dyRB,8P9h6]8=Fte');
  const [error, setError] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('odata_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setBaseUrl(config.baseUrl);
        setUsername(config.username);
        setPassword(config.password);
      } catch (e) {
        console.error("Error loading saved config", e);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/sync-logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error("Error fetching logs:", e);
    }
  };

  const getAuthHeader = (u: string, p: string) => {
    const str = `${u}:${p}`;
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return `Basic ${btoa(binString)}`;
  };

  const handleTest = async () => {
    setError('');
    setTestSuccess(false);
    setTestLoading(true);

    try {
      const auth = getAuthHeader(username, password);
      const fetchUrl = baseUrl.endsWith('/') ? `${baseUrl}$metadata` : `${baseUrl}/$metadata`;
      
      const res = await fetch(fetchUrl, {
        headers: {
          'Authorization': auth
        }
      });

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }

      setTestSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = () => {
    const config: ODataConfig = {
      baseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
      username,
      password
    };
    localStorage.setItem('odata_config', JSON.stringify(config));
    // Also update session just in case
    sessionStorage.setItem('odata_config', JSON.stringify(config));
    router.push('/explorer');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Paramétrage</h1>
        <p className="text-slate-500">Gérez votre connexion OData et surveillez les synchronisations.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
        <button 
          onClick={() => setActiveTab('connexion')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'connexion' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Connexion
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Logs Synchro
        </button>
      </div>

      {activeTab === 'connexion' ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">URL de la passerelle OData</label>
                <input 
                  type="url" 
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="https://votre-serveur/AppBI/odata/"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Utilisateur</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-bold">Erreur de connexion</p>
                  <p className="opacity-80 italic">{error}</p>
                </div>
              </div>
            )}

            {testSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm flex items-start gap-3">
                <span className="text-lg">✅</span>
                <div>
                  <p className="font-bold">Connexion réussie</p>
                  <p className="opacity-80">Les paramètres sont valides. Vous pouvez maintenant les enregistrer.</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                type="button"
                onClick={handleTest}
                disabled={testLoading}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
              >
                {testLoading ? 'Test en cours...' : '🧪 Tester la connexion'}
              </button>
              <button 
                type="button"
                onClick={handleSave}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
              >
                💾 Enregistrer & Explorer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Historique des synchronisations</h3>
            <button 
              onClick={fetchLogs}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
              title="Rafraîchir"
            >
              🔄
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Début</th>
                  <th className="px-6 py-4">Durée</th>
                  <th className="px-6 py-4">Docs / Tâches</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Aucun log disponible</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {new Date(log.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {log.docCount} / {log.taskCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${
                            log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : 
                            log.status === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {log.status === 'SUCCESS' ? 'Succès' : log.status === 'ERROR' ? 'Erreur' : 'Partiel'}
                          </span>
                          {log.message && (
                            <span className="text-[10px] text-slate-400 italic max-w-xs truncate" title={log.message}>
                              {log.message}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
