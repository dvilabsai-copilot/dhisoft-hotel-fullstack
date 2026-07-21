import { FormEvent, useEffect, useState } from 'react';
import api from '../../api/client';
import { useSite } from '../../hooks/useSite';

const tenantRoles = [
  'TENANT_ADMIN',
  'RESERVATION_MANAGER',
  'RESERVATION_AGENT',
  'ACCOUNTS',
  'CONTENT_EDITOR',
  'VIEWER',
];

export default function UsersPage() {
  const { site } = useSite();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER',
    propertyIds: [] as string[],
  });
  const [error, setError] = useState('');

  async function load() {
    try { setRows((await api.get('/users')).data); }
    catch (requestError: any) { setError(requestError.response?.data?.message ?? 'Unable to load users'); }
  }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'VIEWER', propertyIds: [] });
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'User creation failed');
    }
  }

  async function toggle(row: any) {
    try {
      await api.patch(`/users/${row.id}`, {
        status: row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
      });
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'User update failed');
    }
  }

  function toggleProperty(propertyId: string) {
    setForm(current => ({
      ...current,
      propertyIds: current.propertyIds.includes(propertyId)
        ? current.propertyIds.filter(id => id !== propertyId)
        : [...current.propertyIds, propertyId],
    }));
  }

  return (
    <section>
      <div className="admin-heading">
        <div><div className="kicker">Access Control</div><h2>Tenant Users</h2></div>
        <p>Property-scoped hotel users are separate from DHISOFT platform operators.</p>
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <form className="panel" onSubmit={create}>
        <h3>Create tenant user</h3>
        <div className="form-grid">
          <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input required minLength={10} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{tenantRoles.map(role => <option key={role}>{role}</option>)}</select></label>
        </div>
        <div className="property-selector">
          <strong>Property access</strong>
          <p className="small">No selection means tenant-wide access according to the assigned role.</p>
          <div className="tag-row">
            {site?.properties.map(property => (
              <label className="checkbox-chip" key={property.id}>
                <input type="checkbox" checked={form.propertyIds.includes(property.id)} onChange={() => toggleProperty(property.id)} />
                {property.name}
              </label>
            ))}
          </div>
        </div>
        <button className="btn">Create User</button>
      </form>
      <div className="panel spaced">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Properties</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}><td>{row.name}<br/><span className="small">{row.email}</span></td><td>{row.role}</td><td>{row.propertyAccess.length ? row.propertyAccess.map((access: any) => access.property.name).join(', ') : 'All permitted properties'}</td><td>{row.status}</td><td><button className="btn secondary compact" onClick={() => toggle(row)}>{row.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
