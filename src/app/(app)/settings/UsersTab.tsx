'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { SectionHeader, EmptyState, LoadingBlock, Field } from '@/components/ui';

// Comptes locaux de l'application (les comptes AD sont gérés par AD_ADMIN_USERS / AD_ALLOWED_USERS)
export default function UsersTab() {
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
    <div>
      <div className="p-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <SectionHeader
          title="Comptes locaux"
          subtitle="Les agents de la Ville se connectent avec leur compte Windows (AD) ; ces comptes servent aux accès de secours et aux tests."
          actions={!showAdd && (
            <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm"><Plus size={16} /> Nouvel utilisateur</button>
          )}
        />
      </div>

      {showAdd && (
        <form onSubmit={handleAddUser} className="grid items-end gap-4 p-6 md:grid-cols-[1.4fr_1fr_1fr_auto]" style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
          <Field label="E-mail ou identifiant">
            <input type="text" className="input" placeholder="ex. test.local@ivry.fr" value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
          </Field>
          <Field label="Mot de passe">
            <input type="password" className="input" value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
          </Field>
          <Field label="Rôle">
            <select className="select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="USER">Utilisateur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </Field>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">Créer</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {loading ? <LoadingBlock /> : users.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="Aucun compte local" hint="Créez un compte pour permettre une connexion sans passer par l'AD." />
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>Utilisateur</th><th>Rôle</th><th className="w-16"></th></tr>
          </thead>
          <tbody>
            {users.map(u => {
              const name = u.email || u.username || '';
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{name}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-brand' : ''}`}>{u.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</span></td>
                  <td className="text-right">
                    <button onClick={() => handleDelete(u.id, name)} className="btn btn-ghost btn-sm !p-2" title="Révoquer l'accès" aria-label={`Supprimer ${name}`}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
