'use client';

import React, { useState, useEffect } from 'react';

// Pied de page des mails d'envoi des statistiques
type Footer = { footer1: string; footer2: string; footer3: string; footerColor: string };

export default function MailSettingsTab() {
  const [footer, setFooter] = useState<Footer>({ footer1: '', footer2: '', footer3: '', footerColor: '#0055A4' });
  const [defaults, setDefaults] = useState<Footer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/envoi-stats/settings')
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Erreur'); return j; })
      .then(j => { setFooter(j.footer); setDefaults(j.defaults); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Footer, v: string) => { setFooter(f => ({ ...f, [k]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/envoi-stats/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ footer }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      setSaved(true);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const field = (k: keyof Footer, label: string) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{label}</label>
      <input value={footer[k]} onChange={e => set(k, e.target.value)} maxLength={200}
        className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div className="p-10 space-y-8 max-w-3xl">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">E-mail d&apos;envoi</h2>
        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
          Pied de page des mails de statistiques envoyés via l&apos;APM
        </p>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}
      {saved && <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">Pied de page enregistré.</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <>
          <div className="space-y-5">
            {field('footer1', 'Ligne 1')}
            {field('footer2', 'Ligne 2')}
            {field('footer3', 'Ligne 3')}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Couleur du pied de page</label>
              <div className="flex items-center gap-3">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(footer.footerColor) ? footer.footerColor : '#0055A4'}
                  onChange={e => set('footerColor', e.target.value)} className="w-12 h-10 rounded-lg border border-gray-100 cursor-pointer" />
                <input value={footer.footerColor} onChange={e => set('footerColor', e.target.value)} maxLength={7}
                  className="w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Aperçu</p>
            <div className="rounded-2xl p-5 text-white text-center text-xs space-y-1" style={{ background: /^#[0-9a-fA-F]{6}$/.test(footer.footerColor) ? footer.footerColor : '#0055A4' }}>
              <div className="font-bold">{footer.footer1 || ' '}</div>
              <div>{footer.footer2 || ' '}</div>
              <div className="opacity-80">{footer.footer3 || ' '}</div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 px-1">Une ligne laissée vide prend la valeur par défaut de l&apos;APM.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {defaults && (
              <button onClick={() => { setFooter(defaults); setSaved(false); }}
                className="px-6 py-3 border border-gray-200 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                Valeurs par défaut
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
