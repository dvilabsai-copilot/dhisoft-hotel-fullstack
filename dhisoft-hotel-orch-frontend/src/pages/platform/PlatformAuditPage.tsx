import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading } from '../../components/platform/PlatformUi';

export default function PlatformAuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({ action: '', entityType: '', tenantId: '' });
  const [tenants, setTenants] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const [auditResponse, tenantResponse] = await Promise.all([
        platformApi.get('/platform/audit', { params }),
        platformApi.get('/platform/tenants'),
      ]);
      setRows(auditResponse.data); setTenants(tenantResponse.data);
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load audit trail'); }
  }
  useEffect(() => { load(); }, []);

  function submit(event: FormEvent) { event.preventDefault(); load(); }

  return (
    <section>
      <PlatformHeading eyebrow="Forensics" title="Platform Audit Trail" description="Tenant lifecycle, plan, domain, theme, credential and support-access changes are recorded outside tenant audit logs." />
      <ErrorNotice error={error} />
      <form className="panel inline-platform-form" onSubmit={submit}>
        <label>Tenant<select value={filters.tenantId} onChange={e => setFilters({ ...filters, tenantId: e.target.value })}><option value="">All</option>{tenants.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
        <label>Action contains<input value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} /></label>
        <label>Entity type<input value={filters.entityType} onChange={e => setFilters({ ...filters, entityType: e.target.value })} /></label>
        <button className="btn">Apply Filters</button>
      </form>
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Tenant</th><th>Entity</th><th>Metadata</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.actor?.name ?? row.actorEmail ?? 'System'}<br/><span className="small">{row.actor?.role}</span></td><td>{row.action}</td><td>{row.tenant?.name ?? 'Platform'}</td><td>{row.entityType}<br/><span className="small">{row.entityId}</span></td><td><pre className="json-preview">{JSON.stringify(row.metadata ?? {}, null, 2)}</pre></td></tr>)}</tbody></table></div></div>
    </section>
  );
}
