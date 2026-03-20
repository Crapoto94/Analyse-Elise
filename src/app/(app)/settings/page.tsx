'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'sql' | 'logs' | 'users' | 'config'>('sql');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) { router.push('/login'); return; }
        const json = await res.json();
        if (json.user.role !== 'ADMIN') { router.push('/statistiques'); return; }
        setSession(json.user);
      } catch (err) { router.push('/login'); }
      finally { setLoading(false); }
    };
    checkSession();
  }, [router]);

  if (loading || !session) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const tabs = [
    { id: 'sql', label: 'Base de données', icon: '🗄️' },
    { id: 'logs', label: 'Sync Logs', icon: '📜' },
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
    { id: 'config', label: 'Connexion OData', icon: '☁️' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight italic">Administration Système</h1>
          <p className="text-gray-500 font-medium text-xs uppercase tracking-widest mt-1">Gestion locale et supervision Elise</p>
        </div>
        <div className="flex items-center gap-4">
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}
             >
               <span>{tab.icon}</span>
               <span>{tab.label}</span>
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl shadow-gray-200/50 dark:shadow-none min-h-[600px] overflow-hidden">
        {activeTab === 'sql' && <RestoredSqlExplorer />}
        {activeTab === 'logs' && <SyncLogsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'config' && <ConfigTab />}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 1. RESTORED SQL EXPLORER (As requested, full original UI)
// --------------------------------------------------------------------------------
function RestoredSqlExplorer() {
  const [dbType, setDbType] = useState<'system' | 'entities'>('entities');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [indexes, setIndexes] = useState<{ name: string; sql: string }[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);

  useEffect(() => { fetchTables(); }, [dbType]);

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/sql-explorer?db=${dbType}`);
      const json = await res.json();
      setTables(json.tables || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingTables(false); }
  };

  const fetchTableData = async (table: string) => {
    setLoading(true);
    setSelectedTable(table);
    try {
      const res = await fetch(`/api/sql-explorer?table=${table}&db=${dbType}&limit=200`);
      const json = await res.json();
      setColumns(json.columns || []);
      setData(json.data || []);
      setIndexes(json.indexes || []);
      setTotalCount(json.count ?? (json.data || []).length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const syncTables = tables.filter(t => t.startsWith('sync_'));
  const systemTables = tables.filter(t => !t.startsWith('sync_'));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 h-[700px]">
      <div className="border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 p-6 overflow-y-auto">
        <div className="flex gap-2 mb-6 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
           <button 
             onClick={() => { setDbType('entities'); setSelectedTable(''); setData([]); }}
             className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${dbType === 'entities' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
           >Entités</button>
           <button 
             onClick={() => { setDbType('system'); setSelectedTable(''); setData([]); }}
             className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${dbType === 'system' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
           >Système</button>
        </div>
        
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Tableaux ({tables.length})</h2>
        <div className="space-y-1">
          {tables.map(t => (
            <button 
              key={t} 
              onClick={() => fetchTableData(t)} 
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedTable === t ? (dbType === 'entities' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-900 text-white shadow-lg') : 'text-gray-500 hover:bg-white'}`}
            >
              {t.replace('sync_', '')}
            </button>
          ))}
        </div>
      </div>
      <div className="md:col-span-3 p-8">
         {selectedTable ? (
           <div className="space-y-6">
             <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedTable}</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-800">{data.length} / {totalCount} LIGNES</span>
                </div>
             </div>
             <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="min-w-full text-[10px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 uppercase tracking-widest font-black">
                    <tr>{Object.keys(data[0] || {}).map(k => <th key={k} className="px-4 py-3 text-left">{k}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.map((row, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        {Object.values(row).map((v: any, j) => <td key={j} className="px-4 py-3 text-gray-500 font-medium truncate max-w-[150px]">{String(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             {/* Indexes Section */}
             {indexes.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Index de performance ({indexes.length})</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {indexes.map(idx => (
                      <div key={idx.name} className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl">
                        <div className="font-black text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-tight mb-2">{idx.name}</div>
                        <code className="text-[10px] text-gray-400 block whitespace-pre-wrap break-all leading-relaxed font-mono italic">
                          {idx.sql}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </div>
         ) : <div className="h-full flex flex-col items-center justify-center opacity-30 text-center"><span className="text-6xl mb-4">🔍</span><p className="font-black uppercase tracking-widest text-xs">Sélectionnez une table</p></div>}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------------
// 2. SYNC LOGS TAB
// --------------------------------------------------------------------------------
function SyncLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/auth/sync-logs').then(res => res.json()).then(setLogs);
  }, []);

  const [optimizing, setOptimizing] = useState(false);
  const [optLogs, setOptLogs] = useState<{ step: string; message: string }[]>([]);

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-black uppercase tracking-tight">Historique de Synchronisation</h2>
         <div className="flex gap-4 items-center">
            <button 
              disabled={optimizing}
              onClick={async (e) => {
                setOptimizing(true);
                setOptLogs([]);
                try {
                  const res = await fetch('/api/sync/optimize', { method: 'POST' });
                  if (!res.body) return;
                  
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  let buffer = '';

                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                      if (!line.trim()) continue;
                      const data = JSON.parse(line);
                      setOptLogs(prev => [...prev, data]);
                    }
                  }
                } catch (err: any) {
                  alert(`Erreur fatale: ${err.message}`);
                } finally {
                  setOptimizing(false);
                }
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              {optimizing ? '⏳ Optimisation...' : '⚡ Optimiser la Base'}
            </button>
            <button 
              id="repair-dimensions-btn"
              onClick={async (e) => {
                const btn = e.currentTarget;
                const originalText = btn.innerText;
                btn.innerText = '⏳ Réparation...';
                btn.disabled = true;
                try {
                  const confRes = await fetch('/api/config');
                  const conf = await confRes.json();
                  if (!conf.ODATA_URL) return alert('Configurez OData d\'abord');
                  
                  const res = await fetch('/api/sync/dimensions', { method: 'POST', body: JSON.stringify({ config: conf }) });
                  const data = await res.json();
                  
                  if (res.ok) {
                    const detail = Object.entries(data.stats || {}).map(([k,v]) => `${k}: ${v}`).join('\n');
                    alert(`Réparation terminée (Hiérarchie complète) !\n\n${detail}`);
                  } else {
                    alert(`Erreur: ${data.error || 'Inconnue'}`);
                  }
                } catch (err: any) {
                  alert(`Erreur fatale: ${err.message}`);
                } finally {
                  btn.innerText = originalText;
                  btn.disabled = false;
                }
              }}
              className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              🔧 Réparer les Dimensions
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Opérations de Maintenance</span>
         </div>
      </div>

      {optLogs.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 font-mono text-[10px] space-y-1 max-h-[200px] overflow-y-auto shadow-2xl">
          <div className="text-gray-500 mb-2 font-black uppercase tracking-widest text-[8px] flex justify-between">
            <span>Console d&apos;optimisation</span>
            {optimizing && <span className="animate-pulse text-indigo-400 italic">En cours...</span>}
          </div>
          {optLogs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-indigo-500">[{log.step}]</span>
              <span className={log.step === 'error' ? 'text-red-400' : log.step === 'done' ? 'text-green-400 font-black uppercase' : 'text-gray-300'}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-700">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-6 py-4 text-left">Statut</th>
              <th className="px-6 py-4 text-left">Début</th>
              <th className="px-6 py-4 text-left">Dossiers</th>
              <th className="px-6 py-4 text-left">Tâches</th>
              <th className="px-6 py-4 text-left">Durée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-all font-medium">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{new Date(log.startTime).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 font-bold">{log.docsCount}</td>
                <td className="px-6 py-4 font-bold">{log.tasksCount}</td>
                <td className="px-6 py-4 text-gray-400">{Math.round(log.durationMs / 1000)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 3. USERS TAB
// --------------------------------------------------------------------------------
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');

  const fetchUsers = () => fetch('/api/auth/users').then(res => res.json()).then(setUsers);
  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const method = editingUser ? 'PATCH' : 'POST';
    const body = editingUser 
      ? { id: editingUser.id, role, password: password || undefined }
      : { email, password, role };

    await fetch('/api/auth/users', {
      method,
      body: JSON.stringify(body)
    });
    
    setEmail(''); setPassword(''); setRole('USER'); setEditingUser(null);
    fetchUsers();
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setEmail(u.email);
    setRole(u.role);
    setPassword('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous supprimer cet utilisateur ?')) return;
    await fetch('/api/auth/users', { method: 'DELETE', body: JSON.stringify({ id }) });
    fetchUsers();
  };

  return (
    <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-6">
         <h2 className="text-2xl font-black uppercase tracking-tight">Comptes Utilisateurs</h2>
         <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-700">
           <table className="min-w-full text-xs">
             <thead className="bg-gray-50 dark:bg-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-400">
               <tr>
                 <th className="px-6 py-4 text-left">Email</th>
                 <th className="px-6 py-4 text-left">Rôle</th>
                 <th className="px-6 py-4 text-left">Créé le</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
               {users.map((u: any) => (
                 <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                   <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{u.email}</td>
                   <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{u.role}</span>
                   </td>
                   <td className="px-6 py-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                   <td className="px-6 py-4 text-right flex gap-3 justify-end">
                      <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest">Éditer</button>
                      <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">Supprimer</button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900/30 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 h-fit">
         <h3 className="text-sm font-black uppercase tracking-widest mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
           {editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
         </h3>
         <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Email" 
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" 
              required 
              disabled={!!editingUser}
            />
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder={editingUser ? 'Nouveau mot de passe (laisser vide pour garder)' : 'Mot de passe'} 
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" 
              required={!editingUser} 
            />
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-xs outline-none cursor-pointer font-bold">
               <option value="USER">Utilisateur (Lecture seule)</option>
               <option value="ADMIN">Administrateur (Tout accès)</option>
            </select>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                {editingUser ? 'Enregistrer' : 'Créer le compte'}
              </button>
              {editingUser && (
                <button type="button" onClick={() => {setEditingUser(null); setEmail(''); setRole('USER');}} className="px-5 bg-white border border-gray-200 text-gray-400 font-bold rounded-xl text-[10px] uppercase tracking-widest">
                  Annuler
                </button>
              )}
            </div>
         </form>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 4. CONFIG TAB
// --------------------------------------------------------------------------------
function ConfigTab() {
  const [config, setConfig] = useState<any>({});
  useEffect(() => { fetch('/api/config').then(res => res.json()).then(setConfig); }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    await fetch('/api/config', { method: 'POST', body: JSON.stringify(config) });
    alert('Configuration enregistrée');
  };

  return (
    <div className="p-10 space-y-10 max-w-2xl">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tight italic">Connexion OData</h2>
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">Paramètres de liaison Elise</p>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-6">
           <div>
             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">URL API OData</label>
             <input value={config.ODATA_URL || ''} onChange={e => setConfig({...config, ODATA_URL: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-5 py-4 rounded-2xl text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <div>
             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">Identifiant Service (Gateway)</label>
             <input value={config.ODATA_USER || ''} onChange={e => setConfig({...config, ODATA_USER: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-5 py-4 rounded-2xl text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <div>
             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">Mot de passe / Secret</label>
             <input type="password" value={config.ODATA_PASS || ''} onChange={e => setConfig({...config, ODATA_PASS: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-5 py-4 rounded-2xl text-sm font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
           </div>
        </div>
        <button className="bg-gray-900 text-white dark:bg-white dark:text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 shadow-gray-200 dark:shadow-none">Enregistrer la configuration</button>
      </form>
    </div>
  );
}
