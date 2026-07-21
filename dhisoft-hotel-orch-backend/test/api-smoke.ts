type JsonObject = Record<string, unknown>;

const baseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:6006/api/v1').replace(/\/$/, '');
const tenantSlug = process.env.SMOKE_TENANT_SLUG ?? process.env.DEFAULT_TENANT_SLUG ?? 'rainwood';
const tenantEmail = process.env.SMOKE_TENANT_EMAIL ?? process.env.SEED_ADMIN_EMAIL;
const tenantPassword = process.env.SMOKE_TENANT_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
const platformEmail = process.env.SMOKE_PLATFORM_EMAIL ?? process.env.PLATFORM_BOOTSTRAP_EMAIL;
const platformPassword = process.env.SMOKE_PLATFORM_PASSWORD ?? process.env.PLATFORM_BOOTSTRAP_PASSWORD;

if (!tenantEmail || !tenantPassword || !platformEmail || !platformPassword) {
  throw new Error(
    'Set tenant and platform smoke credentials through environment variables; values are never printed.',
  );
}

type RequestOptions = {
  method?: string;
  body?: JsonObject;
  token?: string;
  tenant?: string;
};

async function request(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body) {
    headers['content-type'] = 'application/json';
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  if (options.tenant) {
    headers['x-tenant-slug'] = options.tenant;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown = undefined;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }
  return { status: response.status, data };
}

function expectStatus(name: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, received ${actual}`);
  }
}

function accessToken(data: unknown, name: string) {
  const token = (data as { accessToken?: unknown } | undefined)?.accessToken;
  if (typeof token !== 'string' || token.length < 20) {
    throw new Error(`${name}: response did not contain an access token`);
  }
  return token;
}

async function main() {
  const checks: string[] = [];
  const health = await request('/health');
  expectStatus('health', health.status, 200);
  checks.push('health');

  const publicSite = await request('/website/public', { tenant: tenantSlug });
  expectStatus('public website', publicSite.status, 200);
  checks.push('public website');

  const tenantLogin = await request('/auth/login', {
    method: 'POST',
    tenant: tenantSlug,
    body: { email: tenantEmail, password: tenantPassword },
  });
  expectStatus('tenant login', tenantLogin.status, 201);
  const tenantToken = accessToken(tenantLogin.data, 'tenant login');
  checks.push('tenant login');

  const platformLogin = await request('/platform-auth/login', {
    method: 'POST',
    body: { email: platformEmail, password: platformPassword },
  });
  expectStatus('platform login', platformLogin.status, 201);
  const platformToken = accessToken(platformLogin.data, 'platform login');
  checks.push('platform login');

  const tenantDashboard = await request('/reports/dashboard', {
    tenant: tenantSlug,
    token: tenantToken,
  });
  expectStatus('tenant dashboard', tenantDashboard.status, 200);

  const platformDashboard = await request('/platform/dashboard', { token: platformToken });
  expectStatus('platform dashboard', platformDashboard.status, 200);
  checks.push('authenticated dashboards');

  const tenantOnPlatform = await request('/platform/dashboard', { token: tenantToken });
  expectStatus('tenant token on platform route', tenantOnPlatform.status, 401);

  const platformOnTenant = await request('/reports/dashboard', {
    tenant: tenantSlug,
    token: platformToken,
  });
  expectStatus('platform token on tenant route', platformOnTenant.status, 401);
  checks.push('token boundary isolation');

  const invalidPassword = await request('/platform-auth/login', {
    method: 'POST',
    body: { email: platformEmail, password: `${platformPassword}-invalid` },
  });
  expectStatus('invalid platform password', invalidPassword.status, 401);

  const invalidRoute = await request('/route-that-does-not-exist');
  expectStatus('invalid route', invalidRoute.status, 404);
  checks.push('negative authentication and routing');

  console.log(`API smoke passed: ${checks.join(', ')}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'API smoke failed');
  process.exitCode = 1;
});
