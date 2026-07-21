import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client';
import { ErrorNotice, Metric, PlatformHeading, StatusPill } from '../../components/platform/PlatformUi';

export default function PlatformHealthPage() {
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  async function load() {
    try { setData((await platformApi.get('/platform/system-health')).data); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Unable to load health status'); }
  }
  useEffect(() => { load(); }, []);
  return (
    <section>
      <PlatformHeading eyebrow="Reliability" title="System Health" description="This endpoint reports application/database and internal workflow signals. Vendor API certification health remains the responsibility of each provider adapter." actions={<button className="btn secondary" onClick={load}>Refresh</button>} />
      <ErrorNotice error={error} />
      {data && <>
        <div className="admin-grid">
          <Metric label="Platform" value={<StatusPill value={data.status} />} />
          <Metric label="Database" value={<StatusPill value={data.database.status === 'UP' ? 'HEALTHY' : 'DOWN'} />} />
          <Metric label="Pending sync" value={data.queues.pendingSyncJobs} />
          <Metric label="Failed sync" value={data.queues.failedSyncJobs} />
        </div>
        <div className="admin-grid">
          <Metric label="Failed payments" value={data.payments.failedPayments} />
          <Metric label="Active support sessions" value={data.security.activeSupportSessions} />
          <Metric label="Response time" value={`${data.responseTimeMs} ms`} />
          <Metric label="Uptime" value={`${Math.floor(data.uptimeSeconds / 60)} min`} />
        </div>
        <div className="notice">{data.boundaries.providerNetworkHealth}</div>
      </>}
    </section>
  );
}
