import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import {
  ErrorNotice,
  LoadingPanel,
  Metric,
  PlatformHeading,
  StatusPill,
} from '../../components/platform/PlatformUi';

export default function PlatformDashboardPage() {
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');

  useEffect(() => {
    platformApi
      .get('/platform/dashboard')
      .then(response => setData(response.data))
      .catch(requestError =>
        setError(requestError.response?.data?.message ?? 'Unable to load dashboard'),
      );
  }, []);

  if (!data && !error) return <LoadingPanel />;

  return (
    <section>
      <PlatformHeading
        eyebrow="Control Plane"
        title="Platform Dashboard"
        description="Commercial, operational and reliability signals across every hotel tenant."
      />
      <ErrorNotice error={error} />
      {data && (
        <>
          <div className="admin-grid">
            <Metric label="Tenants" value={data.tenants.total} note={`${data.tenants.byStatus?.ACTIVE ?? 0} active`} />
            <Metric label="Properties" value={data.activeProperties} />
            <Metric label="30-day bookings" value={data.last30Days.reservations} />
            <Metric label="Estimated MRR" value={`₹${Number(data.commercial.estimatedMrr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
          </div>
          <div className="admin-grid">
            <Metric label="Booking value" value={`₹${Number(data.last30Days.bookingValue).toLocaleString('en-IN')}`} note="Last 30 days" />
            <Metric label="Failed sync jobs" value={data.last30Days.failedSyncJobs} />
            <Metric label="Failed payments" value={data.last30Days.failedPayments} />
            <Metric label="Active tenant users" value={data.activeTenantUsers} />
          </div>
          <div className="panel">
            <h3>Recent platform activity</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>Action</th><th>Actor</th><th>Tenant</th><th>Entity</th></tr>
                </thead>
                <tbody>
                  {data.recentAudits.map((row: any) => (
                    <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
                      <td>{row.action}</td>
                      <td>{row.actor?.name ?? row.actorEmail ?? 'System'}</td>
                      <td>{row.tenant?.name ?? 'Platform'}</td>
                      <td>{row.entityType} · {row.entityId.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel spaced">
            <h3>Tenant status distribution</h3>
            <div className="tag-row">
              {Object.entries(data.tenants.byStatus ?? {}).map(([status, count]) => (
                <span className="tag" key={status}>
                  <StatusPill value={status} /> {String(count)}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
