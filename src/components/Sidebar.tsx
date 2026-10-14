'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartColumn, Landmark, Inbox, ChartPie, ArrowLeftRight, Send, Database, Settings, LogOut, LogIn,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [lastSync, setLastSync] = useState<string>('…');

  useEffect(() => {
    // Session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) setSession(json.user);
      })
      .catch(() => {});

    // Dernière synchronisation (lue sur l'API des stats cabinet, mise en cache côté serveur)
    fetch(`/api/stats/cabinet-v2?year=${new Date().getFullYear()}`)
      .then(res => res.json())
      .then(json => {
        if (json.lastSyncDate) setLastSync(json.lastSyncDate);
        else setLastSync('Indisponible');
      })
      .catch(() => setLastSync('Erreur'));
  }, []);

  // Signale la présence de l'utilisateur toutes les 60 s (liste « utilisateurs en ligne » des Paramètres)
  useEffect(() => {
    const t = setInterval(() => { fetch('/api/auth/session').catch(() => {}); }, 60_000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const groups: NavGroup[] = [
    {
      title: 'Statistiques',
      items: [
        { label: 'Stats généraux', href: '/statistiques', icon: ChartColumn },
        { label: 'Stats cabinet', href: '/stats-cab', icon: Landmark },
        { label: 'Stats courrier', href: '/stats-courrier', icon: ChartPie },
        { label: 'Entrants / Sortants', href: '/entrants-sortants', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Courrier',
      items: [
        { label: 'Explorateur courrier', href: '/explorer/courriers', icon: Inbox },
        { label: 'Envoi des stats', href: '/envoi-stats', icon: Send },
      ],
    },
  ];

  if (session?.role === 'ADMIN') {
    groups.push({
      title: 'Administration',
      items: [
        { label: 'Explorateur d\'entités', href: '/explorer', icon: Database },
        { label: 'Paramètres', href: '/settings', icon: Settings },
      ],
    });
  }

  const isActive = (href: string) =>
    href === '/explorer' ? pathname === '/explorer' : pathname === href || pathname.startsWith(href + '/');

  const initials = (session?.email || '?').slice(0, 2).toUpperCase();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col"
      style={{ width: 'var(--sidebar-w)', background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
    >
      {/* Marque */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <img src="/logo.jpg" alt="Ville d'Ivry-sur-Seine" className="h-10 w-10 rounded-[10px] object-contain" style={{ border: '1px solid var(--line)' }} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>Ivry-sur-Seine</p>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Statistiques Elise</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map(g => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map(item => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className="group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors"
                      style={active
                        ? { background: 'var(--brand-soft)', color: 'var(--brand-ink)' }
                        : { color: 'var(--ink-2)' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-sunken)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full" style={{ background: 'var(--brand)' }} />}
                      <Icon size={18} strokeWidth={active ? 2.1 : 1.8} style={{ color: active ? 'var(--brand)' : 'var(--ink-3)' }} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Synchro + utilisateur */}
      <div className="space-y-3 p-3" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2 px-2 text-xs" style={{ color: 'var(--ink-3)' }} title="Dernière synchronisation des données Elise">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ok)' }} />
          <span className="truncate">Données : {lastSync}</span>
        </div>

        {session ? (
          <div className="flex items-center gap-3 rounded-[12px] p-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--line)' }}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{session.email}</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{session.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</p>
            </div>
            <button onClick={handleLogout} title="Déconnexion" aria-label="Déconnexion" className="btn btn-ghost !p-2">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary w-full">
            <LogIn size={16} /> Se connecter
          </Link>
        )}

        <p className="px-2 text-[11px] leading-snug" style={{ color: 'var(--ink-3)' }}>
          Direction des Systèmes d&apos;Information · v0.1.79
        </p>
      </div>
    </aside>
  );
}
