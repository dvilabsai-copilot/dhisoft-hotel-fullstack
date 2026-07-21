import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading } from '../../components/platform/PlatformUi';

const initial = {
  name: '',
  legalName: '',
  slug: '',
  companyEmail: '',
  companyPhone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  planId: '',
  themeCatalogueId: '',
};

export default function PlatformTenantOnboardingPage() {
  const [form, setForm] = useState(initial);
  const [plans, setPlans] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      platformApi.get('/platform/plans'),
      platformApi.get('/platform/themes'),
    ]).then(([planResponse, themeResponse]) => {
      setPlans(planResponse.data.filter((plan: any) => plan.active));
      setThemes(themeResponse.data.filter((theme: any) => theme.status === 'PUBLISHED'));
    }).catch(() => setError('Unable to load onboarding dependencies'));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        planId: form.planId || undefined,
        themeCatalogueId: form.themeCatalogueId || undefined,
      };
      const response = await platformApi.post('/platform/tenants', payload);
      navigate(`/platform-admin/tenants/${response.data.id}`);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Tenant onboarding failed');
    }
  }

  return (
    <section>
      <PlatformHeading
        eyebrow="Onboarding"
        title="Create Hotel Tenant"
        description="Creates the isolated tenant, first tenant administrator, managed subdomain, default feature grants and optional trial/theme assignment in one transaction."
      />
      <ErrorNotice error={error} />
      <form className="panel platform-form" onSubmit={submit}>
        <h3>Hotel group</h3>
        <div className="form-grid">
          <label>Name<input required value={form.name} onChange={e => { set('name', e.target.value); if (!form.slug) set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }} /></label>
          <label>Legal name<input value={form.legalName} onChange={e => set('legalName', e.target.value)} /></label>
          <label>Tenant slug<input required value={form.slug} pattern="[a-z0-9-]+" onChange={e => set('slug', e.target.value.toLowerCase())} /></label>
          <label>Company email<input type="email" value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} /></label>
          <label>Company phone<input value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} /></label>
          <label>Plan<select value={form.planId} onChange={e => set('planId', e.target.value)}><option value="">Assign later</option>{plans.map(plan => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select></label>
          <label>Initial theme<select value={form.themeCatalogueId} onChange={e => set('themeCatalogueId', e.target.value)}><option value="">Assign later</option>{themes.map(theme => <option value={theme.id} key={theme.id}>{theme.name} v{theme.version}</option>)}</select></label>
        </div>
        <h3 className="spaced">First tenant administrator</h3>
        <div className="form-grid">
          <label>Name<input required value={form.adminName} onChange={e => set('adminName', e.target.value)} /></label>
          <label>Email<input required type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} /></label>
          <label className="full">Temporary password<input required minLength={10} type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} /></label>
        </div>
        <div className="notice">The tenant remains in ONBOARDING until an active administrator, subscription, theme and primary domain are present.</div>
        <button className="btn">Create Isolated Tenant</button>
      </form>
    </section>
  );
}
