type Environment = Record<string, unknown>;

const productionRequired = [
  'DATABASE_URL',
  'DIRECT_URL',
  'TENANT_JWT_SECRET',
  'PLATFORM_JWT_SECRET',
  'INTEGRATION_ENCRYPTION_KEY',
  'CORS_ORIGINS',
] as const;

export function validateEnvironment(environment: Environment) {
  if (environment.NODE_ENV !== 'production') return environment;

  const missing = productionRequired.filter(
    key => typeof environment[key] !== 'string' || !environment[key],
  );
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  const tenantSecret = String(environment.TENANT_JWT_SECRET);
  const platformSecret = String(environment.PLATFORM_JWT_SECRET);
  if (tenantSecret.length < 32 || platformSecret.length < 32) {
    throw new Error('Production JWT secrets must each contain at least 32 characters');
  }
  if (tenantSecret === platformSecret) {
    throw new Error('TENANT_JWT_SECRET and PLATFORM_JWT_SECRET must be different');
  }

  return environment;
}
