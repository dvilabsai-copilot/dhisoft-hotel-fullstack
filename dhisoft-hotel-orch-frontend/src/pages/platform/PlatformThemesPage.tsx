import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

const defaultConfig = JSON.stringify({ primaryColor: '#0f3d5f', accentColor: '#c99b42', buttonStyle: 'pill', logoUrl: '' }, null, 2);
const defaultSchema = JSON.stringify({ sections: ['hero', 'booking-search', 'featured-properties', 'rooms', 'offers', 'gallery', 'contact'] }, null, 2);

export default function PlatformThemesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ key: 'rainwood-heritage', version: 1, name: 'RainWood Heritage', description: '', previewUrl: '', config: defaultConfig, sectionSchema: defaultSchema });
  const [error, setError] = useState('');
  async function load() { try { setRows((await platformApi.get('/platform/themes')).data); } catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load themes'); } }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await platformApi.post('/platform/themes', { ...form, version: Number(form.version), config: JSON.parse(form.config), sectionSchema: JSON.parse(form.sectionSchema) });
      await load();
    } catch (e: any) { setError(e.response?.data?.message ?? e.message); }
  }
  async function publish(id: string) { try { await platformApi.post(`/platform/themes/${id}/publish`); await load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Publish failed'); } }

  return (
    <section>
      <PlatformHeading eyebrow="Website Builder" title="Theme Catalogue" description="Published versions are immutable. Design changes create a new version so tenant sites never change unexpectedly." />
      <ErrorNotice error={error} />
      <div className="split admin-split">
        <form className="panel" onSubmit={create}>
          <h3>Create theme version</h3>
          <div className="form-grid">
            <label>Key<input required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} /></label>
            <label>Version<input type="number" min="1" value={form.version} onChange={e => setForm({ ...form, version: Number(e.target.value) })} /></label>
            <label className="full">Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label className="full">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <label className="full">Theme config JSON<textarea value={form.config} onChange={e => setForm({ ...form, config: e.target.value })} /></label>
            <label className="full">Section schema JSON<textarea value={form.sectionSchema} onChange={e => setForm({ ...form, sectionSchema: e.target.value })} /></label>
          </div>
          <button className="btn">Create Draft Version</button>
        </form>
        <div className="panel"><h3>RainWood baseline</h3><p>The first catalogue entry should reproduce the accepted RainWood design through structured sections—not saved arbitrary HTML.</p></div>
      </div>
      <div className="panel spaced"><div className="table-wrap"><table><thead><tr><th>Theme</th><th>Version</th><th>Status</th><th>Assignments</th><th>Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.name}<br/><span className="small">{row.key}</span></td><td>v{row.version}</td><td><StatusPill value={row.status} /></td><td>{row._count.tenantThemes}</td><td>{row.status === 'DRAFT' && <button className="btn compact" onClick={() => publish(row.id)}>Publish</button>}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}
