import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = Express.TenantRequestUser>(
    err: unknown,
    user: Express.TenantRequestUser | undefined,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException(info?.message ?? 'Unauthorized');
    }
    const request = context.switchToHttp().getRequest();
    if (request.tenantId && user.tenantId !== request.tenantId) {
      throw new UnauthorizedException('Token does not belong to this tenant');
    }
    return user as TUser;
  }
}
