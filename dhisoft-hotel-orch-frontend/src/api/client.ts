import axios from 'axios';
import { clearPlatformSession, clearTenantSession } from '../auth/session';

const baseURL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:6006/api';

const tenantApi = axios.create({ baseURL });
export const platformApi = axios.create({ baseURL });

tenantApi.interceptors.request.use(config => {
  config.headers['x-tenant-slug'] =
    localStorage.getItem('hotel_os_tenant_slug') ??
    import.meta.env.VITE_TENANT_SLUG ??
    'rainwood';
  const token = localStorage.getItem('hotel_os_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

platformApi.interceptors.request.use(config => {
  const token = localStorage.getItem('hotel_os_platform_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

tenantApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) clearTenantSession();
    return Promise.reject(error);
  },
);

platformApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) clearPlatformSession();
    return Promise.reject(error);
  },
);

export default tenantApi;
