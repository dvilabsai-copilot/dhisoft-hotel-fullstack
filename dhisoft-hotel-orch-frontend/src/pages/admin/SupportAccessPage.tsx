import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function SupportAccessPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try { setRows((await api.get('/support-access')).data); }
    catch (requestError: any) { setError(requestError.response?.data?.message ?? 'Unable to load support requests'); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: 'approve' | 'reject') {
    try {
      await api.post(`/support-access/${id}/${decision}`, {
        note: `${decision}d from tenant administration`,
      });
      await load();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? `Unable to ${decision}`);
    }
  }

  return (
    <section>
      <div className="admin-heading">
        <div><div className="kicker">Security</div><h2>DHISOFT Support Access</h2></div>
        <p>Approve only requests tied to a clear reason and short expiry. All sessions remain auditable and revocable.</p>
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Requester</th><th>Role</th><th>Reason</th><th>Status</th><th>Expiry</th><th>Decision</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}><td>{row.requestedBy.name}<br/><span className="small">{row.requestedBy.email}</span></td><td>{row.requestedBy.role}</td><td>{row.reason}</td><td>{row.status}</td><td>{new Date(row.expiresAt).toLocaleString()}</td><td>{row.status === 'PENDING_APPROVAL' && <div className="inline-actions"><button className="btn compact" onClick={() => decide(row.id, 'approve')}>Approve</button><button className="btn danger compact" onClick={() => decide(row.id, 'reject')}>Reject</button></div>}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
