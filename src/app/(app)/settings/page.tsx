'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Users, Activity, Cloud, Link2, Mail, ScrollText, type LucideIcon } from 'lucide-react';
import { PageHeader, LoadingBlock } from '@/components/ui';
import SqlTab from './SqlTab';
import UsersTab from './UsersTab';
import OdataTab from './OdataTab';
import AuditTab from './AuditTab';
import RattachementTab from './RattachementTab';
import MailSettingsTab from './MailSettingsTab';
import ConnexionsTab from './ConnexionsTab';

type TabId = 'sql' | 'users' | 'connexions' | 'config' | 'rattachement' | 'mail' | 'audit';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'connexions', label: 'Connexions', icon: Activity },
  { id: 'config', label: 'Connexion Elise', icon: Cloud },
  { id: 'rattachement', label: 'Rattachement', icon: Link2 },
  { id: 'mail', label: 'E-mail d\'envoi', icon: Mail },
  { id: 'audit', label: 'Audit API', icon: ScrollText },
  { id: 'sql', label: 'Base de données', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users');
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

  if (loading || !session) return <LoadingBlock />;

  return (
    <div className="page animate-fade-in">
      <PageHeader title="Administration" subtitle="Utilisateurs, connexions, envoi des statistiques et supervision." />

      {/* Onglets */}
      <div role="tablist" className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
              style={{ color: active ? 'var(--brand-ink)' : 'var(--ink-3)' }}
            >
              <Icon size={16} strokeWidth={active ? 2.1 : 1.8} />
              {tab.label}
              {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full" style={{ background: 'var(--brand)' }} />}
            </button>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        {activeTab === 'sql' && <SqlTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'config' && <OdataTab />}
        {activeTab === 'rattachement' && <RattachementTab />}
        {activeTab === 'mail' && <MailSettingsTab />}
        {activeTab === 'connexions' && <ConnexionsTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
