import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { platformApi } from '../../api/client';
import {
  ErrorNotice,
  Metric,
  PlatformHeading,
  StatusPill,
} from '../../components/platform/PlatformUi';

export default function PlatformTenantDetailPage() {
  const { id = '' } = useParams();
  const [tenant, setTenant] = useState<any>();
  const [plans, setPlans] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [planId, setPlanId] = useState('');
  const [themeId, setThemeId] = useState('');
  const [domain, setDomain] = useState('');

  async function load() {
    setError('');
    try {
      const [tenantResponse, planResponse, themeResponse, featureResponse] =
        await Promise.all([
          platformApi.get(`/platform/tenants/${id}`),
          platformApi.get('/platform/plans'),
          platformApi.get('/platform/themes'),
          platformApi.get('/platform/features'),
        ]);
      setTenant(tenantResponse.data);
      setPlans(planResponse.data.filter((row: any) => row.active));
      setThemes(themeResponse.data.filter((row: any) => row.status === 'PUBLISHED'));
      setFeatures(featureResponse.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Unable to load tenant');
    }
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(status: string) {
    try {
      await platformApi.post(`/platform/tenants/${id}/status`, { status });
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Status update failed');
    }
  }

  async function assignPlan(event: FormEvent) {
    event.preventDefault();
    if (!planId) return;
    await platformApi.post('/platform/subscriptions', {
      tenantId: id,
      planId,
      status: 'ACTIVE',
      startsAt: new Date().toISOString(),
      currentPeriodEndsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      autoRenew: true,
    });
    setPlanId('');
    await load();
  }

  async function assignTheme(event: FormEvent) {
    event.preventDefault();
    if (!themeId) return;
    await platformApi.post('/platform/themes/assign', {
      tenantId: id,
      catalogueThemeId: themeId,
    });
    setThemeId('');
    await load();
  }

  async function toggleFeature(featureId: string, enabled: boolean) {
    await platformApi.post('/platform/features/tenant', {
      tenantId: id,
      featureId,
      enabled,
    });
    await load();
  }

  async function addDomain(event: FormEvent) {
    event.preventDefault();
    if (!domain) return;
    await platformApi.post('/platform/domains', {
      tenantId: id,
      domain,
      type: 'CUSTOM',
      primary: false,
    });
    setDomain('');
    await load();
  }

  if (!tenant) {
    return <section><ErrorNotice error={error} /><div className="panel">Loading tenant…</div></section>;
  }

  const currentSubscription = tenant.subscriptions.find((row: any) =>
    ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(row.status),
  );

  return (
    <section>
      <PlatformHeading
        eyebrow="Tenant Control"
        title={tenant.name}
        description={`${tenant.slug} · Tenant data remains isolated from the platform identity.`}
        actions={<Link className="btn secondary" to="/platform-admin/tenants">Back to Tenants</Link>}
      />
      <ErrorNotice error={error} />
      <div className="admin-grid">
        <Metric label="Status" value={<StatusPill value={tenant.status} />} />
        <Metric label="Properties" value={tenant.properties.length} />
        <Metric label="Users" value={tenant.users.length} />
        <Metric label="Reservations" value={tenant._count.reservations} />
      </div>
      <div className="panel tenant-command-bar">
        <strong>Lifecycle</strong>
        <div className="inline-actions">
          {tenant.status !== 'ACTIVE' && tenant.status !== 'ARCHIVED' && <button className="btn compact" onClick={() => changeStatus('ACTIVE')}>Activate</button>}
          {tenant.status === 'ACTIVE' && <button className="btn danger compact" onClick={() => changeStatus('SUSPENDED')}>Suspend</button>}
          {tenant.status !== 'ARCHIVED' && <button className="btn secondary compact" onClick={() => changeStatus('ARCHIVED')}>Archive</button>}
        </div>
      </div>
      <div className="split admin-split spaced">
        <div className="panel">
          <h3>Onboarding gates</h3>
          {Object.entries(tenant.onboardingChecks).map(([key, value]) => (
            <div className="check-row" key={key}>
              <span>{key.replace(/([A-Z])/g, ' $1')}</span>
              <StatusPill value={value ? 'ACTIVE' : 'PENDING'} />
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Commercial plan</h3>
          <p>{currentSubscription ? `${currentSubscription.plan.name} · ${currentSubscription.status}` : 'No active subscription'}</p>
          <form className="inline-form" onSubmit={assignPlan}>
            <select value={planId} onChange={e => setPlanId(e.target.value)}>
              <option value="">Select plan</option>
              {plans.map(plan => <option value={plan.id} key={plan.id}>{plan.name}</option>)}
            </select>
            <button className="btn compact">Assign</button>
          </form>
        </div>
      </div>
      <div className="split admin-split spaced">
        <div className="panel">
          <h3>Theme assignment</h3>
          <p>{tenant.themes.find((row: any) => row.active)?.name ?? 'No active theme'}</p>
          <form className="inline-form" onSubmit={assignTheme}>
            <select value={themeId} onChange={e => setThemeId(e.target.value)}>
              <option value="">Select published theme</option>
              {themes.map(theme => <option value={theme.id} key={theme.id}>{theme.name} v{theme.version}</option>)}
            </select>
            <button className="btn compact">Assign</button>
          </form>
        </div>
        <div className="panel">
          <h3>Domains</h3>
          {tenant.domains.map((row: any) => (
            <div className="check-row" key={row.id}>
              <span>{row.domain}{row.primary ? ' · Primary' : ''}</span>
              <StatusPill value={row.status} />
            </div>
          ))}
          <form className="inline-form" onSubmit={addDomain}>
            <input placeholder="book.hotel.com" value={domain} onChange={e => setDomain(e.target.value)} />
            <button className="btn compact">Add</button>
          </form>
        </div>
      </div>
      <div className="panel spaced">
        <h3>Feature entitlements</h3>
        <div className="feature-grid">
          {features.map(feature => {
            const override = tenant.features.find((row: any) => row.featureId === feature.id);
            const enabled = override?.enabled ?? feature.defaultEnabled;
            return (
              <label className="feature-toggle" key={feature.id}>
                <span><strong>{feature.name}</strong><small>{feature.key}</small></span>
                <input type="checkbox" checked={enabled} onChange={e => toggleFeature(feature.id, e.target.checked)} />
              </label>
            );
          })}
        </div>
      </div>
      <div className="panel spaced">
        <h3>Tenant administrators</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>{tenant.users.map((user: any) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td><StatusPill value={user.status} /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
