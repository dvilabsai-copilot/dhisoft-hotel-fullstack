import {
  Activity,
  Blocks,
  Building2,
  CreditCard,
  FileClock,
  Globe2,
  Headphones,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { clearPlatformSession, platformUser } from '../../auth/session';

const links = [
  ['/platform-admin', 'Dashboard', LayoutDashboard, true],
  ['/platform-admin/tenants', 'Tenants', Building2],
  ['/platform-admin/plans', 'Plans', CreditCard],
  ['/platform-admin/subscriptions', 'Subscriptions', FileClock],
  ['/platform-admin/themes', 'Themes', Palette],
  ['/platform-admin/domains', 'Domains', Globe2],
  ['/platform-admin/features', 'Feature Flags', SlidersHorizontal],
  ['/platform-admin/integrations', 'Integrations', Blocks],
  ['/platform-admin/support', 'Support Access', Headphones],
  ['/platform-admin/users', 'Platform Users', Users],
  ['/platform-admin/audit', 'Audit Logs', ShieldCheck],
  ['/platform-admin/health', 'System Health', Activity],
] as const;

export default function PlatformLayout() {
  const navigate = useNavigate();
  const user = platformUser();
  if (!localStorage.getItem('hotel_os_platform_token') || !user) {
    return <Navigate to="/platform-login" replace />;
  }

  function logout() {
    clearPlatformSession();
    navigate('/platform-login');
  }

  return (
    <div className="admin-shell platform-shell">
      <aside className="admin-sidebar platform-sidebar">
        <div className="admin-brand">
          DHISOFT
          <br />
          <span>Hotel Commerce Control Plane</span>
        </div>
        <div className="platform-identity">
          <KeyRound />
          <div>
            <strong>{user.name}</strong>
            <span>{user.role.replaceAll('_', ' ')}</span>
          </div>
        </div>
        <nav>
          {links.map(([to, label, Icon, end]) => (
            <NavLink key={to} end={Boolean(end)} to={to}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout}>
          <LogOut />
          Logout
        </button>
      </aside>
      <main className="admin-content platform-content">
        <div className="admin-top">
          <div>
            <strong>DHISOFT Hotel OS</strong>
            <span>Platform-wide administration — never a tenant workspace</span>
          </div>
          <a className="btn secondary" href="/" target="_blank" rel="noreferrer">
            View RainWood
          </a>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
