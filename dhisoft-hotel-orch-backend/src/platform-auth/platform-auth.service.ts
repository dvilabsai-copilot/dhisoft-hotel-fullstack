import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.platformUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid platform credentials');
    }

    await this.prisma.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.jwt.signAsync({
        kind: 'PLATFORM',
        sub: user.id,
        role: user.role,
        email: user.email,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaRequired: user.mfaRequired,
      },
    };
  }
}
