import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(tenantId: string, email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: email.trim().toLowerCase(),
        },
      },
      include: {
        tenant: {
          select: { status: true, slug: true, name: true },
        },
      },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.tenant.status !== 'ACTIVE' ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: await this.jwt.signAsync({
        kind: 'TENANT',
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenantId,
          slug: user.tenant.slug,
          name: user.tenant.name,
        },
      },
    };
  }
}
