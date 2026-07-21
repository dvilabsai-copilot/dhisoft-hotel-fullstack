import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

export default function PlatformSupportPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [form, setForm] = useState({ tenantId: '', reason: '', durationMinutes: 30, requiresTenantApproval: true });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [sessions, tenantResponse] = await Promise.all([
        platformApi.get('/platform/support-sessions'),
        platformApi.get('/platform/tenants'),
      ]);
      setRows(sessions.data); setTenants(tenantResponse.data.filter((row: any) => row.status === 'ACTIVE'));
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load support sessions'); }
  }
  useEffect(() => { load(); }, []);

  async function requestAccess(event: FormEvent) {
    event.preventDefault();
    try { await platformApi.post('/platform/support-sessions', form); setForm({ ...form, reason: '' }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Support request failed'); }
  }

  async function start(row: any) {
    try {
      const response = await platformApi.post(`/platform/support-sessions/${row.id}/exchange`);
      localStorage.setItem('hotel_os_token', response.data.accessToken);
      localStorage.setItem('hotel_os_tenant_slug', response.data.tenant.slug);
      localStorage.setItem('hotel_os_user', JSON.stringify({ id: row.requestedBy.id, name: row.requestedBy.name, email: row.requestedBy.email, role: 'TENANT_ADMIN', tenant: response.data.tenant }));
      localStorage.setItem('hotel_os_support_session', JSON.stringify(response.data.session));
      window.open('/admin', '_blank', 'noopener,noreferrer');
      await load();
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to start support session'); }
  }

  async function revoke(id: string) {
    try { await platformApi.post(`/platform/support-sessions/${id}/revoke`); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Revoke failed'); }
  }

  return (
    <section>
      <PlatformHeading eyebrow="Controlled Tenant Access" title="Support Sessions" description="No platform user automatically bypasses tenant filters. Access is reason-bound, time-limited, tenant-approved by default and independently audited." />
      <ErrorNotice error={error} />
      <form className="panel inline-platform-form" onSubmit={requestAccess}>
        <label>Tenant<select required value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}><option value="">Select active tenant</option>{tenants.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
        <label>Reason<input required minLength={10} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
        <label>Minutes<input type="number" min="5" max="60" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.requiresTenantApproval} onChange={e => setForm({ ...form, requiresTenantApproval: e.target.checked })} /> Require tenant approval</label>
        <button className="btn">Request Access</button>
      </form>
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Requester</th><th>Reason</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.tenant.name}</td><td>{row.requestedBy.name}<br/><span className="small">{row.requestedBy.role}</span></td><td>{row.reason}</td><td><StatusPill value={row.status} /></td><td>{new Date(row.expiresAt).toLocaleString()}</td><td><div className="inline-actions">{['APPROVED', 'ACTIVE'].includes(row.status) && new Date(row.expiresAt) > new Date() && <button className="btn compact" onClick={() => start(row)}>Open Tenant</button>}{!['REVOKED', 'EXPIRED', 'REJECTED'].includes(row.status) && <button className="btn danger compact" onClick={() => revoke(row.id)}>Revoke</button>}</div></td></tr>)}</tbody></table></div></div>
    </section>
  );
}
