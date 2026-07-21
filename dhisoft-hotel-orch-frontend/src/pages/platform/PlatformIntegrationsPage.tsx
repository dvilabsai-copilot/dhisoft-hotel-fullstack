import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

export default function PlatformIntegrationsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [provider, setProvider] = useState({ key: 'AXISROOMS', name: 'AxisRooms', category: 'CHANNEL_MANAGER', enabled: true, publicConfig: '{}' });
  const [credential, setCredential] = useState({ tenantId: '', providerId: '', credentials: '{"apiKey":"","hotelCode":""}', enabled: true });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [p, c, t] = await Promise.all([
        platformApi.get('/platform/integrations/providers'),
        platformApi.get('/platform/integrations/credentials'),
        platformApi.get('/platform/tenants'),
      ]);
      setProviders(p.data); setCredentials(c.data); setTenants(t.data);
    } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load integrations'); }
  }
  useEffect(() => { load(); }, []);

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    try { await platformApi.post('/platform/integrations/providers', { ...provider, publicConfig: JSON.parse(provider.publicConfig) }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? e.message); }
  }
  async function saveCredential(event: FormEvent) {
    event.preventDefault();
    try { await platformApi.post('/platform/integrations/credentials', { ...credential, credentials: JSON.parse(credential.credentials) }); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? e.message); }
  }
  async function test(id: string) {
    try { await platformApi.post(`/platform/integrations/credentials/${id}/test`); await load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Credential test failed'); }
  }

  return (
    <section>
      <PlatformHeading eyebrow="Providers" title="Global Integrations" description="Secrets are AES-GCM encrypted and never returned. The included test verifies secure storage; certified provider adapters must perform real network health checks." />
      <ErrorNotice error={error} />
      <div className="split admin-split">
        <form className="panel" onSubmit={saveProvider}><h3>Provider catalogue</h3><label>Key<input value={provider.key} onChange={e => setProvider({ ...provider, key: e.target.value })} /></label><label>Name<input value={provider.name} onChange={e => setProvider({ ...provider, name: e.target.value })} /></label><label>Category<input value={provider.category} onChange={e => setProvider({ ...provider, category: e.target.value })} /></label><label>Public config JSON<textarea value={provider.publicConfig} onChange={e => setProvider({ ...provider, publicConfig: e.target.value })} /></label><button className="btn">Save Provider</button></form>
        <form className="panel" onSubmit={saveCredential}><h3>Tenant credentials</h3><label>Tenant<select required value={credential.tenantId} onChange={e => setCredential({ ...credential, tenantId: e.target.value })}><option value="">Select tenant</option>{tenants.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label><label>Provider<select required value={credential.providerId} onChange={e => setCredential({ ...credential, providerId: e.target.value })}><option value="">Select provider</option>{providers.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label><label>Credential JSON<textarea value={credential.credentials} onChange={e => setCredential({ ...credential, credentials: e.target.value })} /></label><button className="btn">Encrypt & Store</button></form>
      </div>
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Provider</th><th>Enabled</th><th>Health</th><th>Last tested</th><th>Action</th></tr></thead><tbody>{credentials.map(row => <tr key={row.id}><td>{row.tenant.name}</td><td>{row.provider.name}</td><td>{row.enabled ? 'Yes' : 'No'}</td><td><StatusPill value={row.health} /></td><td>{row.lastTestedAt ? new Date(row.lastTestedAt).toLocaleString() : 'Never'}</td><td><button className="btn secondary compact" onClick={() => test(row.id)}>Test Secure Storage</button></td></tr>)}</tbody></table></div></div>
    </section>
  );
}
