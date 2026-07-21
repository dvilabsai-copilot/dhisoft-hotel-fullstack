import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

const initial = {
  code: '',
  name: '',
  description: '',
  billingInterval: 'MONTHLY',
  monthlyPrice: 0,
  annualPrice: 0,
  setupFee: 0,
  currency: 'INR',
  limits: '{"properties":1,"adminUsers":5,"storageGb":5}',
  features: '{"websiteBuilder":true,"bookingEngine":true}',
  active: true,
};

export default function PlatformPlansPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  async function load() {
    try { setRows((await platformApi.get('/platform/plans')).data); }
    catch (requestError: any) { setError(requestError.response?.data?.message ?? 'Unable to load plans'); }
  }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await platformApi.post('/platform/plans', {
        ...form,
        monthlyPrice: Number(form.monthlyPrice),
        annualPrice: Number(form.annualPrice),
        setupFee: Number(form.setupFee),
        limits: JSON.parse(form.limits),
        features: JSON.parse(form.features),
      });
      setForm(initial);
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? requestError.message);
    }
  }

  return (
    <section>
      <PlatformHeading eyebrow="Commercial Catalogue" title="Subscription Plans" description="Plan limits and feature packaging are commercial controls; tenant feature overrides remain explicit and audited." />
      <ErrorNotice error={error} />
      <div className="split admin-split">
        <form className="panel" onSubmit={create}>
          <h3>Create plan</h3>
          <div className="form-grid">
            <label>Code<input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></label>
            <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Billing interval<select value={form.billingInterval} onChange={e => setForm({ ...form, billingInterval: e.target.value })}><option>MONTHLY</option><option>ANNUAL</option><option>CUSTOM</option></select></label>
            <label>Monthly price<input type="number" min="0" value={form.monthlyPrice} onChange={e => setForm({ ...form, monthlyPrice: Number(e.target.value) })} /></label>
            <label>Annual price<input type="number" min="0" value={form.annualPrice} onChange={e => setForm({ ...form, annualPrice: Number(e.target.value) })} /></label>
            <label>Setup fee<input type="number" min="0" value={form.setupFee} onChange={e => setForm({ ...form, setupFee: Number(e.target.value) })} /></label>
            <label className="full">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <label className="full">Limits JSON<textarea value={form.limits} onChange={e => setForm({ ...form, limits: e.target.value })} /></label>
            <label className="full">Features JSON<textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} /></label>
          </div>
          <button className="btn">Create Plan</button>
        </form>
        <div className="panel">
          <h3>Design rule</h3>
          <p>Plans define the commercial bundle. Runtime access is resolved through feature definitions and tenant overrides, so price changes do not silently rewrite tenant permissions.</p>
        </div>
      </div>
      <div className="panel spaced">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Plan</th><th>Interval</th><th>Price</th><th>Setup</th><th>Tenants</th><th>Status</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><br/><span className="small">{row.code}</span></td><td>{row.billingInterval}</td><td>₹{Number(row.monthlyPrice ?? 0).toLocaleString('en-IN')} monthly<br/>₹{Number(row.annualPrice ?? 0).toLocaleString('en-IN')} annual</td><td>₹{Number(row.setupFee).toLocaleString('en-IN')}</td><td>{row._count.subscriptions}</td><td><StatusPill value={row.active ? 'ACTIVE' : 'DISABLED'} /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
