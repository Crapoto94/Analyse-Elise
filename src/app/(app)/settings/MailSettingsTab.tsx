'use client';

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { SectionHeader, LoadingBlock, Field } from '@/components/ui';

// Pied de page des mails d'envoi des statistiques
type Footer = { footer1: string; footer2: string; footer3: string; footerColor: string };

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

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

  const color = isHex(footer.footerColor) ? footer.footerColor : '#0055A4';

  return (
    <div>
      <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <SectionHeader title="E-mail d'envoi" subtitle="Pied de page des mails de statistiques envoyés via l'APM." />
      </div>

      {error && <div className="alert alert-danger m-6" role="alert">{error}</div>}
      {saved && <div className="alert alert-ok m-6">Pied de page enregistré.</div>}

      {loading ? <LoadingBlock /> : (
        <div className="grid gap-8 p-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <Field label="Ligne 1"><input className="input" value={footer.footer1} maxLength={200} onChange={e => set('footer1', e.target.value)} /></Field>
            <Field label="Ligne 2"><input className="input" value={footer.footer2} maxLength={200} onChange={e => set('footer2', e.target.value)} /></Field>
            <Field label="Ligne 3"><input className="input" value={footer.footer3} maxLength={200} onChange={e => set('footer3', e.target.value)} /></Field>
            <Field label="Couleur" hint="Une ligne laissée vide prend la valeur par défaut de l'APM.">
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={e => set('footerColor', e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-[8px] border p-0.5" style={{ borderColor: 'var(--line-strong)' }} aria-label="Choisir la couleur" />
                <input className="input !w-32 font-mono" value={footer.footerColor} maxLength={7} onChange={e => set('footerColor', e.target.value)} />
              </div>
            </Field>
            <div className="flex gap-3 pt-1">
              <button onClick={save} disabled={saving} className="btn btn-primary"><Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              {defaults && (
                <button onClick={() => { setFooter(defaults); setSaved(false); }} className="btn btn-secondary"><RotateCcw size={16} /> Valeurs par défaut</button>
              )}
            </div>
          </div>

          <div>
            <p className="label">Aperçu</p>
            <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
              <div className="space-y-2 p-5 text-sm" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
                <p>Bonjour,</p>
                <p>Veuillez trouver ci-joint les statistiques du courrier du mois…</p>
              </div>
              <div className="space-y-0.5 px-5 py-4 text-center text-xs text-white" style={{ background: color }}>
                <p className="font-semibold">{footer.footer1 || ' '}</p>
                <p>{footer.footer2 || ' '}</p>
                <p className="opacity-80">{footer.footer3 || ' '}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
