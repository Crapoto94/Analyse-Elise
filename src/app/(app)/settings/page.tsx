'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ODataClient, ODataConfig } from '@/lib/odata';
import { 
  Database, 
  Users, 
  Settings2, 
  History, 
  ChevronRight, 
  Search, 
  Play, 
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit2,
  Save,
  ShieldCheck,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'sql' | 'users' | 'config' | 'audit'>('sql');
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
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
    { id: 'config', label: 'Connexion OData', icon: '☁️' },
    { id: 'audit', label: 'Audit API', icon: '📋' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      {/* Header Area */}
      <div className="flex justify-between items-end mb-4 px-2">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic flex items-center gap-3">
            <span className="w-2 h-10 bg-blue-600 rounded-full"></span>
            Administration
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Pilotage Système & Gouvernance OData</p>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left Sub-Sidebar Nav */}
        <div className="w-64 shrink-0 space-y-2 sticky top-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-x-2' 
                  : 'text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white border border-transparent hover:border-gray-100 dark:hover:border-gray-700'
              }`}
            >
              <span className={`text-xl transition-transform group-hover:scale-120 ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area (Glassmorphism) */}
        <div className="flex-1 bg-white/70 dark:bg-gray-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none min-h-[750px] overflow-hidden">
          {activeTab === 'sql' && <RestoredSqlExplorer />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'config' && <ConfigTab />}
          {activeTab === 'audit' && <AuditLogsTab />}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 1. RESTORED SQL EXPLORER (Premium Redesign)
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

  return (
    <div className="flex h-[750px]">
      {/* Tables Sub-Sidebar */}
      <div className="w-80 border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10 flex flex-col overflow-hidden">
        <div className="p-6 space-y-4 border-b border-gray-100 dark:border-gray-800">
           <div className="flex p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <button 
               onClick={() => { setDbType('entities'); setSelectedTable(''); setData([]); }}
               className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${dbType === 'entities' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
             >Entités</button>
             <button 
               onClick={() => { setDbType('system'); setSelectedTable(''); setData([]); }}
               className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${dbType === 'system' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
             >Système</button>
           </div>
           <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base de données</span>
              <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{tables.length} tables</span>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {tables.map(t => (
            <button 
              key={t} 
              onClick={() => fetchTableData(t)} 
              className={`w-full group text-left p-4 rounded-2xl transition-all border ${
                selectedTable === t 
                  ? (dbType === 'entities' ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-500/20' : 'bg-gray-900 text-white border-gray-800 shadow-xl shadow-gray-900/20') 
                  : 'bg-white dark:bg-gray-800 border-gray-50 dark:border-gray-700 hover:border-blue-200 hover:shadow-lg dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                 <div className={`w-2 h-2 rounded-full ${t.startsWith('sync_') ? 'bg-amber-400' : 'bg-blue-400'} ${selectedTable === t ? 'animate-pulse bg-white' : ''}`}></div>
                 {t.startsWith('sync_') && <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${selectedTable === t ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>Synchro</span>}
              </div>
              <p className={`text-[11px] font-black truncate tracking-tight ${selectedTable === t ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                {t.replace('sync_', '')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Table Data View */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900/20">
         {selectedTable ? (
           <>
             {/* View Header */}
             <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3 italic">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    {selectedTable}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{dbType === 'entities' ? 'Base Entités' : 'Base Système'}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{totalCount} enregistrements</span>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                      Affichage : {data.length} lignes
                   </div>
                </div>
             </div>

             {/* Spreadsheet-like Grid */}
             <div className="flex-1 overflow-auto bg-gray-50/30 dark:bg-gray-900/10 custom-scrollbar">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden border-b border-gray-100 dark:border-gray-800">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 border-separate border-spacing-0">
                      <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10">
                        <tr>
                          {Object.keys(data[0] || {}).map(k => (
                            <th key={k} className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 whitespace-nowrap bg-white/90 dark:bg-gray-800/90 backdrop-blur">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-transparent divide-y divide-gray-50 dark:divide-gray-800">
                        {data.map((row, i) => (
                          <tr key={i} className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} className="px-6 py-4 text-[10px] font-medium text-gray-600 dark:text-gray-400 border-b border-gray-50 dark:border-gray-800 truncate max-w-[200px]" title={String(v)}>
                                {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Performance Indexes Section */}
                {indexes.length > 0 && (
                   <div className="p-8 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="h-[2px] w-8 bg-amber-400"></span>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Optimisation & Index ({indexes.length})</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {indexes.map(idx => (
                          <div key={idx.name} className="p-6 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-4">
                               <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">{idx.name}</div>
                               <span className="text-[8px] font-black text-amber-500 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-tighter">Active Index</span>
                            </div>
                            <div className="bg-gray-900 dark:bg-black/40 p-4 rounded-xl border border-gray-800">
                              <code className="text-[9px] text-emerald-400 font-mono italic leading-relaxed break-all block">
                                {idx.sql}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>
                )}
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-8 animate-fade-in opacity-50 grayscale hover:grayscale-0 transition-all">
             <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-4xl shadow-inner border border-white/20">
               🗄️
             </div>
             <div>
               <h3 className="text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">Sélectionnez une table</h3>
               <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2 italic">Parcourez les structures de données en temps réel</p>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 2. USERS TAB (Redesigned with Premium Cards)
// --------------------------------------------------------------------------------
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'USER' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowAdd(false);
        setNewUser({ email: '', password: '', role: 'USER' });
        fetchUsers();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Supprimer l'utilisateur ${email} ?`)) return;
    try {
      await fetch(`/api/auth/users`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-10 space-y-10 min-h-[750px] flex flex-col">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestion des Accès</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Contrôle des privilèges et comptes utilisateurs</p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/20 active:scale-95"
          >
            <span className="text-lg transition-transform group-hover:rotate-90">+</span>
            Nouveau Utilisateur
          </button>
       </div>

       {showAdd && (
         <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900 shadow-2xl animate-in slide-in-from-top-4 duration-500">
           <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Email / Identifiant</label>
                <input 
                  type="text" 
                  placeholder="Ex: admin@ivry.fr"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mot de passe</label>
                <input 
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Rôle Système</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black uppercase tracking-widest"
                >
                  <option value="USER">Utilisateur Standard</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Créer</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 bg-gray-100 text-gray-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors">Annuler</button>
              </div>
           </form>
         </div>
       )}

       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
          {users.map(u => (
            <div key={u.id} className="group relative bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 p-6 rounded-[2.5rem] hover:shadow-2xl hover:shadow-indigo-500/10 transition-all hover:-translate-y-1">
               <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xl ${u.role === 'ADMIN' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                    {(u.email || u.username || '??').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {u.role}
                     </span>
                  </div>
               </div>

               <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate pr-4">{u.email || u.username}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Compte Actif</p>
                  </div>

                  <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">En ligne</span>
                     </div>
                     <button 
                       onClick={() => handleDelete(u.id, u.email || u.username)}
                       className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                       title="Révoquer l'accès"
                     >
                        🗑️
                     </button>
                  </div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 3. CONFIG TAB (Premium Redesign)
// --------------------------------------------------------------------------------
function ConfigTab() {
  const [activeSubTab, setActiveSubTab] = useState<'connexion' | 'logs'>('connexion');
  const [baseUrl, setBaseUrl] = useState('https://ville-ivry94.illico.city/AppBI/odata/');
  const [username, setUsername] = useState('User_StatBI');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/config/odata')
      .then(res => res.json())
      .then(data => {
        if (data && data.baseUrl) {
          setBaseUrl(data.baseUrl);
          setUsername(data.username || '');
        }
      })
      .catch(e => console.error("Error loading config", e));
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') fetchLogs();
  }, [activeSubTab]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/sync-logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) { console.error(e); }
  };

  const handleTest = async () => {
    setError(''); setTestSuccess(false); setTestLoading(true);
    try {
      const client = new ODataClient({
        baseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
        username,
        password
      });
      await client.getMetadata();
      setTestSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    const config: ODataConfig = {
      baseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
      username,
      password
    };
    try {
      setLoading(true);
      const res = await fetch('/api/config/odata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Erreur de sauvegarde');
      alert('Configuration enregistrée');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 space-y-10 min-h-[750px] flex flex-col">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Connexion Elise</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Passerelle de synchronisation OData</p>
          </div>
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <button 
              onClick={() => setActiveSubTab('connexion')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeSubTab === 'connexion' ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}
            >Paramètres</button>
            <button 
              onClick={() => setActiveSubTab('logs')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeSubTab === 'logs' ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}
            >Journal</button>
          </div>
       </div>

       {activeSubTab === 'connexion' ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
               <div className="bg-white dark:bg-gray-800/40 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-700 space-y-8 shadow-inner">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 block">Point de terminaison Elise OData</label>
                     <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl grayscale group-focus-within:grayscale-0 transition-all">🔗</span>
                        <input 
                          type="url" 
                          value={baseUrl} 
                          onChange={e => setBaseUrl(e.target.value)} 
                          className="w-full bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 p-5 pl-14 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" 
                          placeholder="https://..."
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 block">Identifiant</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 block">Mot de passe</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
                     </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={handleTest} disabled={testLoading} className="flex-1 py-6 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-[2rem] shadow-2xl transition-all hover:bg-black active:scale-95 disabled:opacity-50">
                     {testLoading ? 'Analyse réseau...' : '🧪 Tester la Connexion'}
                  </button>
                  <button onClick={handleSave} disabled={loading} className="flex-1 py-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-[2rem] shadow-2xl shadow-blue-500/40 transition-all hover:bg-blue-700 active:scale-95 border-b-4 border-blue-800">
                     {loading ? 'Traitement...' : '💾 Sauvegarder'}
                  </button>
               </div>
            </div>

            <div className="space-y-8">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                  Rapport de Synchronisation
               </h3>
               {error && (
                 <div className="p-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 text-red-600 rounded-[3rem] space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 shadow-xl shadow-red-500/5">
                    <div className="flex items-center gap-3">
                       <span className="text-3xl">⚠️</span>
                       <h4 className="text-xs font-black uppercase tracking-widest">Échec de Liaison</h4>
                    </div>
                    <p className="text-[10px] font-bold italic leading-relaxed opacity-80">{error}</p>
                 </div>
               )}
               {testSuccess && (
                 <div className="p-10 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 text-emerald-600 rounded-[3rem] space-y-4 animate-in zoom-in-95 duration-500 shadow-2xl shadow-emerald-500/10">
                    <div className="flex items-center gap-4">
                       <div className="relative">
                          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs animate-ping absolute"></div>
                          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs relative shadow-lg">✅</div>
                       </div>
                       <div>
                          <h4 className="text-xs font-black uppercase tracking-widest">Canal Sécurisé</h4>
                          <p className="text-[9px] font-bold opacity-70">Liaison opérationnelle</p>
                       </div>
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed border-t border-emerald-100 dark:border-emerald-900 pt-4 mt-4">
                      Les métadonnées Elise sont accessibles. Vous pouvez synchroniser les documents maintenant.
                    </p>
                 </div>
               )}
               {!error && !testSuccess && (
                 <div className="h-80 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[4rem] flex flex-col items-center justify-center text-center p-10 space-y-6 opacity-40 transition-opacity hover:opacity-60 grayscale hover:grayscale-0">
                    <div className="text-5xl">⚡</div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Prêt pour diagnostic.<br/>Veuillez initier un test de flux.</p>
                 </div>
               )}
            </div>
         </div>
       ) : (
         <div className="bg-white/50 dark:bg-gray-900/30 rounded-[3.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 shadow-inner flex flex-col">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50/80 dark:bg-gray-800 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 sticky top-0 z-10">
                  <tr>
                    <th className="px-10 py-8 text-left">Date & Heure</th>
                    <th className="px-10 py-8 text-left">Objets Traités</th>
                    <th className="px-10 py-8 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-all group">
                      <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <span className="w-2 h-2 bg-blue-400 rounded-full group-hover:scale-150 transition-transform shadow-lg shadow-blue-400/20"></span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">{new Date(log.startTime).toLocaleString()}</span>
                          </div>
                      </td>
                      <td className="px-10 py-6 text-gray-500 font-black tracking-widest italic">{log.docsCount} <span className="text-[9px] text-gray-300">DOCS</span> / {log.tasksCount} <span className="text-[9px] text-gray-300">TÂCHES</span></td>
                      <td className="px-10 py-6">
                          <span className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl ${
                            log.status === 'SUCCESS' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'
                          }`}>
                            {log.status === 'SUCCESS' ? 'Succès Total' : 'Échec Système'}
                          </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-32 text-center text-gray-400 italic font-black uppercase tracking-widest opacity-20 text-xs">
                          Aucun journal disponible pour le moment
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
         </div>
       )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// 4. AUDIT LOGS TAB (Merged from Main)
// --------------------------------------------------------------------------------
function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="p-10 space-y-10 min-h-[750px] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Audit API</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Supervision des requêtes BI Gateway</p>
        </div>
        <button onClick={fetchLogs} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl transition-all">
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="bg-white/50 dark:bg-gray-900/30 rounded-[3.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 shadow-inner flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-800 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 sticky top-0 z-10">
              <tr>
                <th className="px-10 py-8 text-left">Horodatage</th>
                <th className="px-10 py-8 text-left">Endpoint</th>
                <th className="px-10 py-8 text-left">Durée</th>
                <th className="px-10 py-8 text-left">Utilisateur</th>
                <th className="px-10 py-8 text-left">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.isArray(logs) && logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700 dark:text-gray-300">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[9px] font-black text-gray-500 uppercase">{log.method}</span>
                       <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{log.endpoint}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-xs font-bold text-gray-500">
                    {log.duration}ms
                  </td>
                  <td className="px-10 py-6 text-[9px] font-black text-blue-600 uppercase tracking-tight">
                    {log.userEmail || 'Anonyme'}
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.status < 400 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${log.status < 400 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-gray-400 italic font-black uppercase tracking-widest opacity-20 text-xs">
                      Aucune donnée d'audit disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
