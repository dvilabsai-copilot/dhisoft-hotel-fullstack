import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { platformApi } from '../api/client';

export default function PlatformLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function login(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await platformApi.post('/platform-auth/login', {
        email,
        password,
      });
      localStorage.setItem(
        'hotel_os_platform_token',
        response.data.accessToken,
      );
      localStorage.setItem(
        'hotel_os_platform_user',
        JSON.stringify(response.data.user),
      );
      navigate('/platform-admin');
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ??
          'Platform login failed',
      );
    }
  }

  return (
    <main className="login-page platform-login">
      <form className="login-card" onSubmit={login}>
        <div className="kicker">DHISOFT Control Plane</div>
        <h2>Platform Administration</h2>
        <p>
          Onboard hotel groups, control subscriptions, themes, domains,
          integrations and audited support access.
        </p>
        {error && <div className="notice">{error}</div>}
        <label>
          Platform email
          <input
            required
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>
        <button className="btn full">Sign in to Control Plane</button>
        <p className="small">
          Platform identities are separate from hotel-tenant accounts.
        </p>
        <Link to="/login" className="text-link">
          Go to hotel administration
        </Link>
      </form>
    </main>
  );
}
