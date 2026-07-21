import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import {
  PlatformActor,
  PlatformAuditService,
} from '../platform-common/platform-audit.service';
import {
  CreatePlatformUserDto,
  ResetPlatformPasswordDto,
  UpdatePlatformUserDto,
} from './dto/platform-user.dto';

@Injectable()
export class PlatformUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  list() {
    return this.prisma.platformUser.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        mfaRequired: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreatePlatformUserDto, actor: PlatformActor) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.platformUser.findUnique({ where: { email } })) {
      throw new ConflictException('Platform email is already in use');
    }
    const user = await this.prisma.platformUser.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: dto.role,
        status: 'ACTIVE',
        mfaRequired: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        mfaRequired: true,
        createdAt: true,
      },
    });
    await this.audit.record({
      actor,
      action: 'PLATFORM_USER_CREATED',
      entityType: 'PlatformUser',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    return user;
  }

  async update(
    id: string,
    dto: UpdatePlatformUserDto,
    actor: PlatformActor,
  ) {
    const existing = await this.get(id);
    if (id === actor.sub && dto.status === 'DISABLED') {
      throw new BadRequestException('You cannot disable your own platform account');
    }
    if (
      existing.role === 'PLATFORM_OWNER' &&
      (dto.role && dto.role !== 'PLATFORM_OWNER' ||
        dto.status === 'DISABLED')
    ) {
      const activeOwners = await this.prisma.platformUser.count({
        where: { role: 'PLATFORM_OWNER', status: 'ACTIVE' },
      });
      if (activeOwners <= 1) {
        throw new BadRequestException('At least one active platform owner is required');
      }
    }

    const user = await this.prisma.platformUser.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        role: dto.role,
        status: dto.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        mfaRequired: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });
    await this.audit.record({
      actor,
      action: 'PLATFORM_USER_UPDATED',
      entityType: 'PlatformUser',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return user;
  }

  async resetPassword(
    id: string,
    dto: ResetPlatformPasswordDto,
    actor: PlatformActor,
  ) {
    const existing = await this.get(id);
    await this.prisma.platformUser.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, 12),
      },
    });
    await this.audit.record({
      actor,
      action: 'PLATFORM_USER_PASSWORD_RESET',
      entityType: 'PlatformUser',
      entityId: id,
      metadata: { email: existing.email },
    });
    return { success: true };
  }

  private async get(id: string) {
    const user = await this.prisma.platformUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Platform user not found');
    return user;
  }
}
