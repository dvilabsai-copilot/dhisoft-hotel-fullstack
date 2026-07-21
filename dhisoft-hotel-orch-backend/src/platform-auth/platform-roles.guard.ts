import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PlatformUserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ROLES_KEY } from '../common/platform-roles.decorator';

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<PlatformUserRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest().user as
      | Express.PlatformRequestUser
      | undefined;
    if (!user || user.kind !== 'PLATFORM' || !roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient platform role');
    }
    return true;
  }
}
