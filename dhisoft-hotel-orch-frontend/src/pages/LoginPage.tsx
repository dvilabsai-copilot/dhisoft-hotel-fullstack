import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@rainwood.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  async function login(e: FormEvent) {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('hotel_os_token', response.data.accessToken);
      localStorage.setItem('hotel_os_user', JSON.stringify(response.data.user));
      nav('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login failed');
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={login}>
        <div className="kicker">Hotel Administration</div>
        <h2>RainWood Hotel OS</h2>
        <p>Reservations, website builder, payments, reports and AxisRooms sync.</p>
        {error && <div className="notice">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <button className="btn full">Sign In</button>
        <p className="small">Use the administrator credentials configured for this environment.</p>
      </form>
    </main>
  );
}
