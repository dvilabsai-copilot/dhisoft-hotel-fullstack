import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApi } from '../../api/client';
import {
  ErrorNotice,
  PlatformHeading,
  StatusPill,
} from '../../components/platform/PlatformUi';

export default function PlatformTenantsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setRows((await platformApi.get('/platform/tenants')).data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Unable to load tenants');
    }
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(id: string, status: string) {
    setError('');
    try {
      await platformApi.post(`/platform/tenants/${id}/status`, {
        status,
        reason: `Changed from platform tenant list`,
      });
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Status change failed');
    }
  }

  return (
    <section>
      <PlatformHeading
        eyebrow="Customer Portfolio"
        title="Hotel Tenants"
        description="Every hotel group remains isolated; platform operators manage lifecycle without becoming tenant users."
        actions={<Link className="btn" to="/platform-admin/tenants/new">Onboard Hotel Group</Link>}
      />
      <ErrorNotice error={error} />
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tenant</th><th>Status</th><th>Plan</th><th>Usage</th><th>Primary domain</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong><br/><span className="small">{row.slug}</span></td>
                  <td><StatusPill value={row.status} /></td>
                  <td>{row.subscriptions?.[0]?.plan?.name ?? 'Not assigned'}</td>
                  <td>{row._count.properties} properties · {row._count.users} users · {row._count.reservations} bookings</td>
                  <td>{row.domains?.[0]?.domain ?? 'Not configured'}</td>
                  <td>
                    <div className="inline-actions">
                      <Link className="btn secondary compact" to={`/platform-admin/tenants/${row.id}`}>Open</Link>
                      {row.status === 'ACTIVE' && <button className="btn danger compact" onClick={() => changeStatus(row.id, 'SUSPENDED')}>Suspend</button>}
                      {['ONBOARDING', 'SUSPENDED'].includes(row.status) && <button className="btn secondary compact" onClick={() => changeStatus(row.id, 'ACTIVE')}>Activate</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
