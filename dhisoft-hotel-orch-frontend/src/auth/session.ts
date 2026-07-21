export type StoredTenantUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant?: { id: string; slug: string; name: string };
};

export type StoredPlatformUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function tenantUser(): StoredTenantUser | null {
  try {
    return JSON.parse(localStorage.getItem('hotel_os_user') ?? 'null');
  } catch {
    return null;
  }
}

export function platformUser(): StoredPlatformUser | null {
  try {
    return JSON.parse(localStorage.getItem('hotel_os_platform_user') ?? 'null');
  } catch {
    return null;
  }
}

export function clearTenantSession() {
  localStorage.removeItem('hotel_os_token');
  localStorage.removeItem('hotel_os_user');
  localStorage.removeItem('hotel_os_tenant_slug');
  localStorage.removeItem('hotel_os_support_session');
}

export function clearPlatformSession() {
  localStorage.removeItem('hotel_os_platform_token');
  localStorage.removeItem('hotel_os_platform_user');
}
