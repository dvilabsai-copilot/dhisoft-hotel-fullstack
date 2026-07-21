import type { PlatformUserRole, UserRole } from '@prisma/client';

declare global {
  namespace Express {
    type TenantRequestUser = {
      kind: 'TENANT' | 'SUPPORT';
      sub: string;
      tenantId: string;
      role: UserRole;
      email: string;
      platformUserId?: string;
      supportSessionId?: string;
    };

    type PlatformRequestUser = {
      kind: 'PLATFORM';
      sub: string;
      role: PlatformUserRole;
      email: string;
    };

    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      user?: TenantRequestUser | PlatformRequestUser;
    }
  }
}
export {};
