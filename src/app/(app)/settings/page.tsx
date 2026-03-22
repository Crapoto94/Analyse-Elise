'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ODataClient, ODataConfig } from '@/lib/odata';

type TabType = 'sql' | 'users' | 'odata' | 'logs' | 'audit';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sql');
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

  if (loading || !session) return (
    <div className="flex items-center justify-center min-vh-screen">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase tracking-widest">BI</div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'sql', label: 'Données', icon: <Database className="w-4 h-4" /> },
    { id: 'odata', label: 'Connexion Data', icon: <Cloud className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit API', icon: <History className="w-4 h-4" /> },
    { id: 'users', label: 'Accès', icon: <Users className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                <Settings2 className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Administration</h1>
            </div>
            <p className="text-slate-500 font-medium text-xs uppercase tracking-[0.2em] ml-11">Configuration & Supervision du Système</p>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[26px] gap-1 shrink-0 border border-slate-200/50 dark:border-slate-700/50">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as TabType)}
                 className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 transform ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 -translate-y-0.5' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 shadow-none hover:shadow-md'}`}
               >
                 {tab.icon}
                 <span className="hidden sm:inline-block">{tab.label}</span>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="transition-all duration-500 ease-in-out">
        {activeTab === 'sql' && <SqlExplorerTab />}
        {activeTab === 'odata' && <ODataConfigTab />}
        {activeTab === 'audit' && <AuditLogsTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 1. REFINED SQL EXPLORER
// --------------------------------------------------------------------------------
function SqlExplorerTab() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTables = async () => {
      const res = await fetch('/api/sql-explorer');
      const json = await res.json();
      setTables(json.tables || []);
    };
    fetchTables();
  }, []);

  const fetchTableData = async (table: string) => {
    setLoading(true);
    setSelectedTable(table);
    try {
      const res = await fetch(`/api/sql-explorer?table=${table}&limit=100`);
      const json = await res.json();
      setColumns(json.columns || []);
      setData(json.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher une table..."
            className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300 transition-all"
          />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-4 space-y-1 overflow-y-auto max-h-[600px] shadow-lg shadow-slate-200/20 dark:shadow-none">
          {filteredTables.map(t => (
            <button 
              key={t}
              onClick={() => fetchTableData(t)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all ${selectedTable === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <Database className={`w-3.5 h-3.5 ${selectedTable === t ? 'text-indigo-200' : 'text-slate-300'}`} />
                <span>{t.replace('sync_', '')}</span>
              </div>
              {selectedTable === t && <ChevronRight className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>
      
      <div className="lg:col-span-3 min-h-[700px]">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none h-full">
           {selectedTable ? (
             <div className="flex flex-col h-full">
               <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">{selectedTable}</h3>
                    <div className="flex gap-3">
                       <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-100/50 dark:border-indigo-800/50">
                         {data.length} Enregistrements
                       </span>
                    </div>
                  </div>
                  <button onClick={() => fetchTableData(selectedTable)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
               </div>
               <div className="flex-1 overflow-auto">
                 {loading ? (
                   <div className="h-full flex items-center justify-center p-20 opacity-20">
                     <div className="h-8 w-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                   </div>
                 ) : (
                   <table className="w-full text-left border-collapse">
                     <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-md z-10">
                       <tr className="border-b border-slate-100 dark:border-slate-800">
                         {Object.keys(data[0] || {}).map(k => (
                           <th key={k} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{k}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {data.map((row, i) => (
                         <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                           {Object.values(row).map((v: any, j) => (
                             <td key={j} className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                               {String(v)}
                             </td>
                           ))}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 )}
               </div>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-20 space-y-6 opacity-30 grayscale pointer-events-none">
               <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[32px] flex items-center justify-center">
                 <Database className="w-10 h-10 text-slate-300" />
               </div>
               <div>
                  <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Aucune table sélectionnée</h4>
                  <p className="text-sm font-medium text-slate-400">Parcourez le schéma de la base système sur la gauche</p>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 2. ODATA CONFIG TAB (Merged from /connect)
// --------------------------------------------------------------------------------
function ODataConfigTab() {
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/config/odata').then(res => res.json()).then(data => {
      setBaseUrl(data.baseUrl || '');
      setUsername(data.username || '');
      setPassword(data.password || '');
    });
  }, []);

  const handleTest = async () => {
    setLoading(true);
    setTestSuccess(null);
    setErrorMessage('');
    try {
      const client = new ODataClient({ baseUrl, username, password });
      await client.getMetadata();
      setTestSuccess(true);
    } catch (e: any) {
      setTestSuccess(false);
      setErrorMessage(e.message);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/odata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, username, password })
      });
      if (res.ok) alert('Configuration enregistrée');
      else alert('Erreur lors de la sauvegarde');
    } catch (e) { alert('Erreur réseau'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 md:p-14 shadow-2xl space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Configuration de la Passerelle</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Liaison temps réel avec Elise</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Endpoint URL OData</label>
             <input 
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
              placeholder="https://server/odata/"
             />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Identifiant</label>
               <input 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
               />
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Clé d'API / Passwort</label>
               <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
               />
            </div>
          </div>
        </div>

        {testSuccess !== null && (
          <div className={`p-6 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${testSuccess ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100/50' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-100/50'}`}>
            {testSuccess ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight">{testSuccess ? 'Connexion Validée' : 'Échec de Connexion'}</h4>
              <p className="text-xs font-medium opacity-80 mt-1">{testSuccess ? 'La passerelle répond correctement aux requêtes OData.' : errorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button 
            disabled={loading}
            onClick={handleTest}
            className="flex-1 py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-3xl uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Démarrer un Test
          </button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            Enregistrer les Paramètres
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 3. AUDIT LOGS TAB
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
    <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Audit des Interrogations API</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Supervision des requêtes BI Gateway</p>
        </div>
        <button onClick={fetchLogs} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="overflow-x-auto min-h-[400px]">
        {loading && logs.length === 0 ? (
          <div className="p-20 flex justify-center opacity-20">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Horodatage</th>
                <th className="px-8 py-5">Endpoint</th>
                <th className="px-8 py-5">Durée</th>
                <th className="px-8 py-5">Utilisateur</th>
                <th className="px-8 py-5">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {Array.isArray(logs) && logs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase">{log.method}</span>
                       <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{log.endpoint}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-500">
                    {log.duration}ms
                  </td>
                  <td className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-tight">
                    {log.userEmail || 'Anonyme'}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.status < 400 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500 shadow-lg shadow-rose-500/50'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${log.status < 400 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 4. IMPROVED USERS TAB
// --------------------------------------------------------------------------------
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [loading, setLoading] = useState(false);

  const fetchUsers = () => fetch('/api/auth/users').then(res => res.json()).then(setUsers);
  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const method = editingUser ? 'PATCH' : 'POST';
    const body = editingUser 
      ? { id: editingUser.id, role, password: password || undefined }
      : { email, password, role };

    await fetch('/api/auth/users', { method, body: JSON.stringify(body) });
    
    setEmail(''); setPassword(''); setRole('USER'); setEditingUser(null);
    await fetchUsers();
    setLoading(false);
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
      <div className="xl:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tight">Utilisateurs Autorisés</h2>
            <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest leading-none flex items-center gap-2">
               <ShieldCheck className="w-3 h-3 text-indigo-500" />
               {users.length} Comptes
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-8 py-5 italic">Identité</th>
                  <th className="px-8 py-5 italic">Privilèges</th>
                  <th className="px-8 py-5 italic text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black text-xl">
                          {u.email[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-black text-slate-900 dark:text-white">{u.email}</span>
                          <span className="text-[10px] text-slate-400 font-medium tracking-tight">Créé le {new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${u.role === 'ADMIN' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/50 dark:border-slate-700'}`}>
                         {u.role}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEdit(u)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(u.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="xl:col-span-1">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-xl space-y-8 sticky top-8">
          <div className="pb-6 border-b border-slate-50 dark:border-slate-800/50">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
              {editingUser ? 'Édition Profil' : 'Nouvel Accès'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Email</label>
                  <input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="ex: admin@ivry.fr" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 transition-all font-mono" 
                    required 
                    disabled={!!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret d'accès</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder={editingUser ? '--- Inchangé ---' : 'Mot de passe sécurisé'} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                    required={!editingUser} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle Système</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl text-xs font-black outline-none cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all uppercase tracking-tight">
                     <option value="USER">👤 Utilisateur (Standard)</option>
                     <option value="ADMIN">🛡️ Administrateur (Privilégié)</option>
                  </select>
                </div>
             </div>
             <div className="flex gap-3 pt-4">
               <button disabled={loading} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 uppercase text-[11px] tracking-widest hover:bg-indigo-700 flex items-center justify-center gap-2">
                 {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {editingUser ? 'Appliquer' : 'Confirmer'}
               </button>
               {editingUser && (
                 <button type="button" onClick={() => {setEditingUser(null); setEmail(''); setRole('USER');}} className="px-8 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black rounded-3xl text-[11px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                   Annuler
                 </button>
               )}
             </div>
          </form>
          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-[32px] border border-indigo-100/50 dark:border-indigo-800/50">
            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold leading-relaxed italic">
              * Les changements de permissions prennent effet à la prochaine session de l'utilisateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
