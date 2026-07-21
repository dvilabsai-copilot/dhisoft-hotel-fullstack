import { applyDecorators, UseGuards } from '@nestjs/common';
import { PlatformUserRole } from '@prisma/client';
import { Public } from './public.decorator';
import { PlatformRoles } from './platform-roles.decorator';
import { PlatformJwtGuard } from '../platform-auth/platform-jwt.guard';
import { PlatformRolesGuard } from '../platform-auth/platform-roles.guard';

export const PlatformProtected = (...roles: PlatformUserRole[]) =>
  applyDecorators(
    Public(),
    PlatformRoles(...roles),
    UseGuards(PlatformJwtGuard, PlatformRolesGuard),
  );
