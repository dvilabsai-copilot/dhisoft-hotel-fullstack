import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformUserRole } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma.service';

type PlatformJwtPayload = {
  kind: 'PLATFORM';
  sub: string;
  role: PlatformUserRole;
  email: string;
};

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('PLATFORM_JWT_SECRET'),
      issuer: 'dhisoft-hotel-os',
      audience: 'dhisoft-platform-admin',
    });
  }

  async validate(payload: PlatformJwtPayload) {
    if (payload.kind !== 'PLATFORM') throw new UnauthorizedException('Invalid platform token');
    const user = await this.prisma.platformUser.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Platform account is inactive');
    }
    return {
      kind: 'PLATFORM' as const,
      sub: user.id,
      role: user.role,
      email: user.email,
    };
  }
}
