'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Stats généraux',
    icon: '📊',
    href: '/statistiques',
    description: 'Tableaux de bord généraux',
  },
  {
    label: 'Stats cabinet',
    icon: '🏛️',
    href: '/stats-cab',
    description: 'Analyses cabinet',
  },
  {
    label: 'Explorateur d\'Entités',
    icon: '🔍',
    href: '/explorer',
    description: 'Parcourir les données brutes',
  },
  {
    label: 'Explorateur SQL',
    icon: '🗄️',
    href: '/sql-explorer',
    description: 'Structure de la base locale',
  },
  {
    label: 'Paramètres',
    icon: '⚙️',
    href: '/connect',
    description: 'Configuration OData',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white/80 backdrop-blur-lg border-r border-slate-200/80 flex flex-col shadow-xl z-40">
      {/* Logo / Brand */}
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-md">
            📡
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">Stat Elise</p>
            <p className="text-xs text-slate-400">OData Explorer</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {item.label}
                </p>
                <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100">
        <Link
          href="/connect"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span>⚙️</span>
          <span>Changer de compte</span>
        </Link>
      </div>
    </aside>
  );
}
