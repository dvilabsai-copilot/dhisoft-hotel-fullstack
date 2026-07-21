import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';
import { platformUser } from '../../auth/session';

const roles = ['PLATFORM_OWNER', 'SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN', 'READ_ONLY_AUDITOR'];

export default function PlatformUsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SUPPORT_ADMIN' });
  const [error, setError] = useState('');
  const current = platformUser();

  async function load() {
    try { setRows((await platformApi.get('/platform/users')).data); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load platform users'); }
  }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try { await platformApi.post('/platform/users', form); setForm({ name: '', email: '', password: '', role: 'SUPPORT_ADMIN' }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'User creation failed'); }
  }

  async function toggle(row: any) {
    try { await platformApi.patch(`/platform/users/${row.id}`, { status: row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'User update failed'); }
  }

  return (
    <section>
      <PlatformHeading eyebrow="Platform Security" title="Platform Users" description="These identities never belong to RainWood or another hotel tenant. Platform-owner continuity and self-disable protections are enforced server-side." />
      <ErrorNotice error={error} />
      {current?.role === 'PLATFORM_OWNER' && (
        <form className="panel inline-platform-form" onSubmit={create}>
          <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Temporary password<input required type="password" minLength={12} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
          <button className="btn">Create Platform User</button>
        </form>
      )}
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>MFA policy</th><th>Last login</th><th>Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.name}<br/><span className="small">{row.email}</span></td><td>{row.role}</td><td><StatusPill value={row.status} /></td><td>{row.mfaRequired ? 'Required' : 'Not required'}</td><td>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'}</td><td>{current?.role === 'PLATFORM_OWNER' && row.id !== current.id && <button className="btn secondary compact" onClick={() => toggle(row)}>{row.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}
