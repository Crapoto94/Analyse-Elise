'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Plug, Save, Zap } from 'lucide-react';
import type { ODataConfig } from '@/lib/odata';
import { SectionHeader, EmptyState, Field } from '@/components/ui';

// Connexion à la passerelle OData Elise et journal de synchronisation
export default function OdataTab() {
  const [activeSubTab, setActiveSubTab] = useState<'connexion' | 'logs'>('connexion');
  const [baseUrl, setBaseUrl] = useState('https://ville-ivry94.illico.city/AppBI/odata/');
  const [username, setUsername] = useState('User_StatBI');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);
  const [saved, setSaved] = useState('');
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
    setError(''); setTestSuccess(false); setSaved(''); setTestLoading(true);
    try {
      const res = await fetch('/api/config/odata/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
          username,
          password: password || undefined // Send undefined if empty to use DB password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');

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
    setError(''); setSaved('');
    try {
      setLoading(true);
      const res = await fetch('/api/config/odata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Erreur de sauvegarde');
      setSaved('Configuration enregistrée.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <SectionHeader
          title="Connexion Elise"
          subtitle="Passerelle OData utilisée pour lire les courriers et les tâches."
          actions={
            <div className="seg">
              <button className="seg-item" data-active={activeSubTab === 'connexion'} onClick={() => setActiveSubTab('connexion')}>Paramètres</button>
              <button className="seg-item" data-active={activeSubTab === 'logs'} onClick={() => setActiveSubTab('logs')}>Journal</button>
            </div>
          }
        />
      </div>

      {activeSubTab === 'connexion' ? (
        <div className="grid gap-8 p-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <Field label="Point de terminaison OData">
              <input type="url" className="input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Identifiant">
                <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} />
              </Field>
              <Field label="Mot de passe" hint="Laissez vide pour conserver le mot de passe enregistré.">
                <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </Field>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleTest} disabled={testLoading} className="btn btn-secondary">
                <Plug size={16} /> {testLoading ? 'Test en cours…' : 'Tester la connexion'}
              </button>
              <button onClick={handleSave} disabled={loading} className="btn btn-primary">
                <Save size={16} /> {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div>
            <p className="label">Résultat du test</p>
            {error && (
              <div className="alert alert-danger flex gap-3" role="alert">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div><p className="font-medium">Échec de la connexion</p><p className="mt-1 text-[13px] opacity-90">{error}</p></div>
              </div>
            )}
            {testSuccess && (
              <div className="alert alert-ok flex gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div><p className="font-medium">Connexion opérationnelle</p><p className="mt-1 text-[13px] opacity-90">Les métadonnées Elise sont accessibles.</p></div>
              </div>
            )}
            {saved && !error && <div className="alert alert-ok mt-3">{saved}</div>}
            {!error && !testSuccess && !saved && (
              <div className="rounded-[12px]" style={{ border: '1px dashed var(--line-strong)' }}>
                <EmptyState icon={<Zap size={20} />} title="Aucun test lancé" hint="Lancez un test pour vérifier l'accès à Elise." />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Date et heure</th><th>Objets traités</th><th>Statut</th></tr></thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap font-medium">{new Date(log.startTime).toLocaleString('fr-FR')}</td>
                  <td className="num" style={{ color: 'var(--ink-2)' }}>{log.docsCount} documents · {log.tasksCount} tâches</td>
                  <td><span className={`badge ${log.status === 'SUCCESS' ? 'badge-ok' : 'badge-danger'}`}>{log.status === 'SUCCESS' ? 'Succès' : 'Échec'}</span></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={3}><EmptyState title="Aucun journal disponible" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
