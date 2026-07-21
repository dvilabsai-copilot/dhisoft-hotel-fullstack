import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

export default function PlatformDomainsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [form, setForm] = useState({ tenantId: '', domain: '', type: 'CUSTOM', primary: false });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [domainResponse, tenantResponse] = await Promise.all([
        platformApi.get('/platform/domains'),
        platformApi.get('/platform/tenants'),
      ]);
      setRows(domainResponse.data);
      setTenants(tenantResponse.data);
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load domains'); }
  }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try { await platformApi.post('/platform/domains', form); setForm({ tenantId: '', domain: '', type: 'CUSTOM', primary: false }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Domain creation failed'); }
  }
  async function action(id: string, actionName: string) {
    try { await platformApi.post(`/platform/domains/${id}/${actionName}`, actionName === 'activate' ? { sslStatus: 'READY' } : {}); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? `${actionName} failed`); }
  }

  return (
    <section>
      <PlatformHeading eyebrow="Traffic & SSL" title="Tenant Domains" description="Managed subdomains activate automatically; custom domains require DNS TXT verification before SSL activation." />
      <ErrorNotice error={error} />
      <form className="panel inline-platform-form" onSubmit={create}>
        <label>Tenant<select required value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })}><option value="">Select tenant</option>{tenants.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
        <label>Domain<input required placeholder="booking.hotel.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} /></label>
        <label>Type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>CUSTOM</option><option>SUBDOMAIN</option></select></label>
        <button className="btn">Add Domain</button>
      </form>
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>Domain</th><th>Tenant</th><th>Type</th><th>Status</th><th>SSL</th><th>Verification</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.domain}</strong>{row.primary && <><br/><span className="tag gold">Primary</span></>}</td><td>{row.tenant.name}</td><td>{row.type}</td><td><StatusPill value={row.status} /></td><td>{row.sslStatus}</td><td><code>_dhisoft-verification.{row.domain}</code><br/><span className="small">{row.verificationToken}</span></td><td><div className="inline-actions">{row.status === 'PENDING_VERIFICATION' || row.status === 'FAILED' ? <button className="btn secondary compact" onClick={() => action(row.id, 'verify')}>Verify DNS</button> : null}{row.status === 'VERIFIED' && <button className="btn compact" onClick={() => action(row.id, 'activate')}>Activate</button>}{row.status === 'ACTIVE' && !row.primary && <button className="btn secondary compact" onClick={() => action(row.id, 'primary')}>Make Primary</button>}</div></td></tr>)}</tbody></table></div></div>
    </section>
  );
}
