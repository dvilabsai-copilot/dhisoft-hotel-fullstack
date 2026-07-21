import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

export default function PlatformSubscriptionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    platformApi.get('/platform/subscriptions').then(response => setRows(response.data)).catch((requestError: any) => setError(requestError.response?.data?.message ?? 'Unable to load subscriptions'));
  }, []);
  return (
    <section>
      <PlatformHeading eyebrow="Billing Operations" title="Tenant Subscriptions" description="One current commercial assignment per tenant is enforced by the service while historical subscriptions remain auditable." />
      <ErrorNotice error={error} />
      <div className="panel"><div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Plan</th><th>Status</th><th>Started</th><th>Period end</th><th>Renewal</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.tenant.name}<br/><span className="small">{row.tenant.slug}</span></td><td>{row.plan.name}</td><td><StatusPill value={row.status} /></td><td>{new Date(row.startsAt).toLocaleDateString()}</td><td>{row.currentPeriodEndsAt ? new Date(row.currentPeriodEndsAt).toLocaleDateString() : 'Custom'}</td><td>{row.autoRenew ? 'Auto-renew' : 'Manual'}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}
