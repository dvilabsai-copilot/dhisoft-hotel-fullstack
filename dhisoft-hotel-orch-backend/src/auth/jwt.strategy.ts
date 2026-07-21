import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma.service';

type TenantJwtPayload = {
  kind?: 'TENANT';
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
};

type SupportJwtPayload = {
  kind: 'SUPPORT';
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
  platformUserId: string;
  supportSessionId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('TENANT_JWT_SECRET'),
      issuer: 'dhisoft-hotel-os',
      audience: 'dhisoft-tenant-admin',
    });
  }

  async validate(payload: TenantJwtPayload | SupportJwtPayload) {
    if (payload.kind === 'SUPPORT') {
      const session = await this.prisma.supportSession.findUnique({
        where: { id: payload.supportSessionId },
        include: {
          tenant: { select: { status: true } },
          requestedBy: { select: { status: true, email: true } },
        },
      });
      if (
        !session ||
        session.tenantId !== payload.tenantId ||
        session.requestedById !== payload.platformUserId ||
        !['APPROVED', 'ACTIVE'].includes(session.status) ||
        session.expiresAt <= new Date() ||
        session.revokedAt ||
        session.tenant.status !== 'ACTIVE' ||
        session.requestedBy.status !== 'ACTIVE'
      ) {
        throw new UnauthorizedException('Support session is no longer valid');
      }
      return {
        kind: 'SUPPORT' as const,
        sub: payload.sub,
        tenantId: session.tenantId,
        role: UserRole.TENANT_ADMIN,
        email: session.requestedBy.email,
        platformUserId: session.requestedById,
        supportSessionId: session.id,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: { select: { status: true } } },
    });
    if (
      !user ||
      user.tenantId !== payload.tenantId ||
      user.status !== 'ACTIVE' ||
      user.tenant.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Tenant account is inactive');
    }

    return {
      kind: 'TENANT' as const,
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };
  }
}
