import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import {
  CreateTenantUserDto,
  UpdateTenantUserDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        propertyAccess: {
          select: {
            property: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
  }

  async create(tenantId: string, dto: CreateTenantUserDto) {
    this.assertTenantRole(dto.role);
    const email = dto.email.trim().toLowerCase();
    if (
      await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
      })
    ) {
      throw new ConflictException('Email is already in use for this tenant');
    }
    await this.assertProperties(tenantId, dto.propertyIds ?? []);

    return this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          email,
          passwordHash: await bcrypt.hash(dto.password, 12),
          role: dto.role,
          status: 'ACTIVE',
        },
      });
      if (dto.propertyIds?.length) {
        await tx.userPropertyAccess.createMany({
          data: dto.propertyIds.map(propertyId => ({
            userId: user.id,
            propertyId,
          })),
        });
      }
      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          propertyAccess: {
            select: {
              property: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTenantUserDto,
    actorUserId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) throw new NotFoundException('Tenant user not found');
    if (dto.role) this.assertTenantRole(dto.role);
    if (dto.propertyIds) {
      await this.assertProperties(tenantId, dto.propertyIds);
    }
    if (id === actorUserId && dto.status === 'DISABLED') {
      throw new BadRequestException('You cannot disable your own account');
    }
    if (
      user.role === 'TENANT_ADMIN' &&
      ((dto.role && dto.role !== 'TENANT_ADMIN') ||
        dto.status === 'DISABLED')
    ) {
      const activeAdmins = await this.prisma.user.count({
        where: {
          tenantId,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
        },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException(
          'At least one active tenant administrator is required',
        );
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          role: dto.role,
          status: dto.status,
        },
      });
      if (dto.propertyIds) {
        await tx.userPropertyAccess.deleteMany({ where: { userId: id } });
        if (dto.propertyIds.length) {
          await tx.userPropertyAccess.createMany({
            data: dto.propertyIds.map(propertyId => ({
              userId: id,
              propertyId,
            })),
          });
        }
      }
      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          propertyAccess: {
            select: {
              property: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });
    });
  }

  private assertTenantRole(role: UserRole) {
    if (role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'SUPER_ADMIN is a platform role and cannot be assigned inside a tenant',
      );
    }
  }

  private async assertProperties(tenantId: string, propertyIds: string[]) {
    if (!propertyIds.length) return;
    const count = await this.prisma.property.count({
      where: {
        tenantId,
        id: { in: [...new Set(propertyIds)] },
      },
    });
    if (count !== new Set(propertyIds).size) {
      throw new BadRequestException(
        'One or more selected properties do not belong to this tenant',
      );
    }
  }
}
