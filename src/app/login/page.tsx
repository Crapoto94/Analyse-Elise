'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = '/statistiques'; // Full refresh to update layout
      } else {
        const json = await res.json();
        setError(json.error || 'Identifiants invalides');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panneau de marque */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: 'linear-gradient(160deg, #14398f 0%, #1f5eea 60%, #3b7bff 100%)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="" className="h-11 w-11 rounded-[10px] bg-white object-contain p-0.5" />
          <div className="leading-tight">
            <p className="text-base font-semibold">Ville d&apos;Ivry-sur-Seine</p>
            <p className="text-sm text-white/70">Direction des Systèmes d&apos;Information</p>
          </div>
        </div>

        <div className="max-w-md">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-[12px] bg-white/15 backdrop-blur">
            <BarChart3 size={24} />
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Le courrier de la Ville, en chiffres.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            Flux entrants et sortants, délais de traitement et activité par direction, à partir des données Elise.
          </p>
        </div>

        <p className="text-sm text-white/60">Statistiques Elise</p>

        {/* Motif décoratif */}
        <svg className="pointer-events-none absolute -bottom-24 -right-24 opacity-[0.07]" width="520" height="520" viewBox="0 0 520 520" fill="none" aria-hidden>
          {[80, 140, 200, 260].map(r => <circle key={r} cx="260" cy="260" r={r} stroke="white" strokeWidth="2" />)}
        </svg>
      </aside>

      {/* Formulaire */}
      <main className="flex items-center justify-center p-6 sm:p-12" style={{ background: 'var(--surface)' }}>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-[10px] object-contain" style={{ border: '1px solid var(--line)' }} />
            <p className="text-base font-semibold">Statistiques Elise</p>
          </div>

          <h2 className="text-[26px] font-semibold">Connexion</h2>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-3)' }}>
            Utilisez votre identifiant Ville (compte Windows) ou votre e-mail.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="identifiant" className="label">Identifiant Ville (AD) ou e-mail</label>
              <input
                id="identifiant"
                type="text"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input !py-2.5"
                placeholder="ex. mchevalier"
                required
              />
            </div>

            <div>
              <label htmlFor="mot-de-passe" className="label">Mot de passe</label>
              <input
                id="mot-de-passe"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input !py-2.5"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div role="alert" className="alert alert-danger">{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full !py-2.5">
              {loading ? <span className="spinner !h-4 !w-4 !border-white/40 !border-t-white" /> : 'Se connecter'}
            </button>
          </form>

          <p className="mt-8 flex items-center gap-2 text-xs" style={{ color: 'var(--ink-3)' }}>
            <ShieldCheck size={14} /> Accès réservé aux agents autorisés.
          </p>
        </div>
      </main>
    </div>
  );
}
