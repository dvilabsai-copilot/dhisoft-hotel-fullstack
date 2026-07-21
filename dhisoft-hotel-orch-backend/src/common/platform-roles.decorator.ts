import { SetMetadata } from '@nestjs/common';
import { PlatformUserRole } from '@prisma/client';

export const PLATFORM_ROLES_KEY = 'platform_roles';
export const PlatformRoles = (...roles: PlatformUserRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);
