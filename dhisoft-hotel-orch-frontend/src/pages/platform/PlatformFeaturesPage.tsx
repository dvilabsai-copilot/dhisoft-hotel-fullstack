import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

export default function PlatformFeaturesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ key: '', name: '', description: '', defaultEnabled: false });
  const [error, setError] = useState('');
  async function load() { try { setRows((await platformApi.get('/platform/features')).data); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load feature definitions'); } }
  useEffect(() => { load(); }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    try { await platformApi.post('/platform/features', form); setForm({ key: '', name: '', description: '', defaultEnabled: false }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Feature creation failed'); }
  }
  return (
    <section>
      <PlatformHeading eyebrow="Entitlements" title="Feature Definitions" description="New functionality remains disabled by default unless deliberately published and granted to tenants." />
      <ErrorNotice error={error} />
      <form className="panel inline-platform-form" onSubmit={create}>
        <label>Key<input required value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} /></label>
        <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.defaultEnabled} onChange={e => setForm({ ...form, defaultEnabled: e.target.checked })} /> Enabled by default</label>
        <button className="btn">Create Feature</button>
      </form>
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>Feature</th><th>Key</th><th>Default</th><th>Tenant overrides</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><br/><span className="small">{row.description}</span></td><td><code>{row.key}</code></td><td><StatusPill value={row.defaultEnabled ? 'ACTIVE' : 'DISABLED'} /></td><td>{row._count.tenantFeatures}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}
