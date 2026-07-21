import {
  BarChart3,
  Building2,
  CreditCard,
  FileImage,
  Globe2,
  Headphones,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  Users,
} from 'lucide-react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { clearTenantSession, tenantUser } from '../../auth/session';

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = tenantUser();
  if (!localStorage.getItem('hotel_os_token') || !user) {
    return <Navigate to="/login" replace />;
  }

  const supportSession = (() => {
    try {
      return JSON.parse(localStorage.getItem('hotel_os_support_session') ?? 'null');
    } catch {
      return null;
    }
  })();

  function logout() {
    clearTenantSession();
    navigate('/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          DHISOFT
          <br />
          <span>Hotel OS</span>
        </div>
        <nav>
          <NavLink end to="/admin"><LayoutDashboard />Dashboard</NavLink>
          <NavLink to="/admin/website"><Globe2 />Website Builder</NavLink>
          <NavLink to="/admin/reservations"><Building2 />Reservations</NavLink>
          <NavLink to="/admin/content"><FileImage />Content & Enquiries</NavLink>
          <NavLink to="/admin/payments"><CreditCard />Payments</NavLink>
          <NavLink to="/admin/reports"><BarChart3 />Reports</NavLink>
          <NavLink to="/admin/axisrooms"><RefreshCcw />AxisRooms</NavLink>
          {user.role === 'TENANT_ADMIN' && (
            <>
              <NavLink to="/admin/users"><Users />Users</NavLink>
              <NavLink to="/admin/support-access"><Headphones />Support Access</NavLink>
            </>
          )}
        </nav>
        <button className="sidebar-logout" onClick={logout}><LogOut />Logout</button>
      </aside>
      <main className="admin-content">
        {supportSession && (
          <div className="support-session-banner">
            <strong>DHISOFT support session active</strong>
            <span>
              Reason: {supportSession.reason} · Expires{' '}
              {new Date(supportSession.expiresAt).toLocaleString()}
            </span>
          </div>
        )}
        <div className="admin-top">
          <div>
            <strong>{user.tenant?.name ?? 'RainWood Hotels'}</strong>
            <span>{supportSession ? 'Audited support workspace' : 'Tenant workspace'} · {user.name} · {user.role}</span>
          </div>
          <a className="btn secondary" href="/" target="_blank" rel="noreferrer">View Website</a>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
