import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest().user as
      | Express.TenantRequestUser
      | undefined;
    if (
      !user ||
      !['TENANT', 'SUPPORT'].includes(user.kind) ||
      !roles.includes(user.role)
    ) {
      throw new ForbiddenException('Insufficient tenant role');
    }
    return true;
  }
}
