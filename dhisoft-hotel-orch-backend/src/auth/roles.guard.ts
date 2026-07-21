import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../common/roles.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector:Reflector){}
  canActivate(ctx:ExecutionContext){ const roles=this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY,[ctx.getHandler(),ctx.getClass()]); if(!roles?.length)return true; const req=ctx.switchToHttp().getRequest(); if(!req.user || !roles.includes(req.user.role)) throw new ForbiddenException('Insufficient role'); return true; }
}
