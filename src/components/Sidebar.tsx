'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [lastSync, setLastSync] = useState<string>('Chargement...');

  useEffect(() => {
    // Session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) setSession(json.user);
      })
      .catch(() => {});

    // Last Sync (from any stats API or dedicated)
    fetch('/api/stats/cabinet-v2?year=2026')
      .then(res => res.json())
      .then(json => {
        if (json.lastSyncDate) setLastSync(json.lastSyncDate);
        else setLastSync('Indisponible');
      })
      .catch(() => setLastSync('Erreur'));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      label: 'Stats généraux',
      icon: '📊',
      href: '/statistiques',
      description: 'Tableaux de bord globaux',
    },
    {
      label: 'Stats cabinet',
      icon: '🏛️',
      href: '/stats-cab',
      description: 'Analyses ville & cabinet',
    },
    {
      label: 'Explorateur d\'Entités',
      icon: '🔍',
      href: '/explorer',
      description: 'Parcourir les données brutes',
    },
  ];

  if (session?.role === 'ADMIN') {
    navItems.push({
      label: 'Paramètres',
      icon: '⚙️',
      href: '/settings',
      description: 'Outils & Configuration',
    });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-r border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl z-40">
      {/* Brand with Logo */}
      <div className="px-6 py-8 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-lg border border-gray-100 dark:border-gray-700">
             <img src="/logo.jpg" alt="Logo Ville" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-white leading-none tracking-tight truncate">Ivry-sur-Seine</p>
            <div className="flex flex-col mt-1.5">
               <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">BI GATEWAY</span>
               <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">LOCALES : {lastSync}</span>
               </div>
            </div>
          </div>
        </div>
      </div>


      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 translate-x-1'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600'
              }`}
            >
              <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  {item.label}
                </p>
                <p className={`text-[10px] font-medium truncate ${isActive ? 'text-blue-100/70' : 'text-gray-400'}`}>
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User / Technical Info */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="space-y-4">
           {session && (
             <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {session.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                   <p className="text-[10px] font-black text-gray-900 dark:text-white truncate">{session.email}</p>
                   <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">{session.role}</p>
                </div>
             </div>
           )}
           
           <div className="px-2 pb-2">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                 (c) Direction des Systèmes d'Informations<br/>
                  <span className="text-blue-600">Marc CHEVALIER</span> — <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[7px]">v0.1.60</span>
              </p>
           </div>

           {session ? (
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-gray-100 dark:border-gray-700 border-dashed transition-all active:scale-95 shadow-sm"
             >
               <span>🚪</span>
               <span>Déconnexion</span>
             </button>
           ) : (
             <Link
               href="/login"
               className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all hover:bg-blue-700"
             >
               Se Connecter
             </Link>
           )}
        </div>
      </div>
    </aside>
  );
}
