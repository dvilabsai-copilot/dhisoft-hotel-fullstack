import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Prisma, TenantStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { PlatformAuditService, PlatformActor } from '../platform-common/platform-audit.service';
import {
  ChangeTenantStatusDto,
  CreatePlatformTenantDto,
  UpdatePlatformTenantDto,
} from './dto/platform-tenant.dto';

@Injectable()
export class PlatformTenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: PlatformAuditService,
  ) {}

  async list() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            properties: true,
            users: true,
            reservations: true,
          },
        },
        subscriptions: {
          where: { status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        domains: {
          where: { primary: true },
          take: 1,
        },
      },
    });
  }

  async get(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        properties: {
          select: { id: true, name: true, slug: true, active: true },
        },
        themes: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        features: {
          include: { feature: true },
          orderBy: { feature: { name: 'asc' } },
        },
        domains: { orderBy: [{ primary: 'desc' }, { createdAt: 'asc' }] },
        integrationCredentials: {
          select: {
            id: true,
            enabled: true,
            health: true,
            lastTestedAt: true,
            lastError: true,
            provider: {
              select: { id: true, key: true, name: true, category: true },
            },
          },
        },
        _count: {
          select: {
            reservations: true,
            payments: true,
            enquiries: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return {
      ...tenant,
      onboardingChecks: await this.onboardingChecks(id),
    };
  }

  async create(
    dto: CreatePlatformTenantDto,
    actor: PlatformActor,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const slug = dto.slug.trim().toLowerCase();
    const email = dto.adminEmail.trim().toLowerCase();
    const exists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Tenant slug is already in use');

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const baseDomain =
      this.config.get<string>('PLATFORM_BASE_DOMAIN') ?? 'dhisoft-hotels.com';

    const tenant = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.tenant.create({
        data: {
          name: dto.name.trim(),
          legalName: dto.legalName?.trim(),
          slug,
          companyEmail: dto.companyEmail?.trim().toLowerCase(),
          companyPhone: dto.companyPhone?.trim(),
          status: 'ONBOARDING',
          createdByPlatformUserId: actor.sub,
          onboardingState: {
            startedAt: new Date().toISOString(),
            source: 'PLATFORM_ADMIN',
          } as Prisma.InputJsonValue,
        },
      });

      await tx.user.create({
        data: {
          tenantId: created.id,
          name: dto.adminName.trim(),
          email,
          passwordHash,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
        },
      });

      const featureDefinitions = await tx.featureDefinition.findMany();
      if (featureDefinitions.length) {
        await tx.tenantFeature.createMany({
          data: featureDefinitions.map((feature: { id: string; defaultEnabled: boolean }) => ({
            tenantId: created.id,
            featureId: feature.id,
            enabled: feature.defaultEnabled,
          })),
          skipDuplicates: true,
        });
      }

      await tx.tenantDomain.create({
        data: {
          tenantId: created.id,
          domain: `${slug}.${baseDomain}`.toLowerCase(),
          type: 'SUBDOMAIN',
          status: 'ACTIVE',
          verificationToken: randomUUID(),
          verifiedAt: new Date(),
          sslStatus: 'MANAGED',
          primary: true,
        },
      });

      if (dto.planId) {
        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: dto.planId },
        });
        if (!plan || !plan.active) {
          throw new BadRequestException('Selected subscription plan is unavailable');
        }
        await tx.tenantSubscription.create({
          data: {
            tenantId: created.id,
            planId: plan.id,
            status: 'TRIAL',
            startsAt: new Date(),
            trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
            currentPeriodEndsAt: new Date(Date.now() + 14 * 86_400_000),
          },
        });
      }

      if (dto.themeCatalogueId) {
        const catalogue = await tx.themeCatalogue.findUnique({
          where: { id: dto.themeCatalogueId },
        });
        if (!catalogue || catalogue.status !== 'PUBLISHED') {
          throw new BadRequestException('Selected theme is not published');
        }
        await tx.siteTheme.create({
          data: {
            tenantId: created.id,
            catalogueThemeId: catalogue.id,
            name: catalogue.name,
            key: `${catalogue.key}-v${catalogue.version}`,
            config: catalogue.config,
            active: true,
          },
        });
      }

      return created;
    });

    await this.audit.record({
      actor,
      action: 'TENANT_CREATED',
      entityType: 'Tenant',
      entityId: tenant.id,
      tenantId: tenant.id,
      metadata: { slug: tenant.slug, name: tenant.name },
      ...meta,
    });

    return this.get(tenant.id);
  }

  async update(
    id: string,
    dto: UpdatePlatformTenantDto,
    actor: PlatformActor,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    await this.assertTenant(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        legalName: dto.legalName?.trim(),
        companyEmail: dto.companyEmail?.trim().toLowerCase(),
        companyPhone: dto.companyPhone?.trim(),
        timezone: dto.timezone,
        currency: dto.currency?.toUpperCase(),
      },
    });
    await this.audit.record({
      actor,
      action: 'TENANT_UPDATED',
      entityType: 'Tenant',
      entityId: id,
      tenantId: id,
      metadata: dto as Record<string, unknown>,
      ...meta,
    });
    return tenant;
  }

  async changeStatus(
    id: string,
    dto: ChangeTenantStatusDto,
    actor: PlatformActor,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const current = await this.assertTenant(id);
    if (current.status === 'ARCHIVED') {
      throw new BadRequestException('Archived tenants cannot be reactivated');
    }

    if (dto.status === 'ACTIVE') {
      const checks = await this.onboardingChecks(id);
      const blockers = Object.entries(checks)
        .filter(([, value]) => value === false)
        .map(([key]) => key);
      if (blockers.length) {
        throw new BadRequestException(
          `Tenant cannot be activated until these checks pass: ${blockers.join(', ')}`,
        );
      }
    }

    if (dto.status === 'ARCHIVED') {
      const activeFutureReservation = await this.prisma.reservation.findFirst({
        where: {
          tenantId: id,
          status: { in: ['HOLD', 'PENDING_PAYMENT', 'CONFIRMED'] },
          rooms: { some: { checkOut: { gt: new Date() } } },
        },
        select: { id: true },
      });
      if (activeFutureReservation) {
        throw new BadRequestException(
          'Tenant has active or future reservations and cannot be archived',
        );
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        status: dto.status,
        archivedAt: dto.status === 'ARCHIVED' ? new Date() : null,
      },
    });

    await this.audit.record({
      actor,
      action: 'TENANT_STATUS_CHANGED',
      entityType: 'Tenant',
      entityId: id,
      tenantId: id,
      metadata: {
        previousStatus: current.status,
        newStatus: dto.status,
        reason: dto.reason,
      },
      ...meta,
    });
    return tenant;
  }

  async onboardingChecks(tenantId: string) {
    const [adminCount, subscriptionCount, themeCount, domainCount] =
      await Promise.all([
        this.prisma.user.count({
          where: { tenantId, role: 'TENANT_ADMIN', status: 'ACTIVE' },
        }),
        this.prisma.tenantSubscription.count({
          where: {
            tenantId,
            status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] },
          },
        }),
        this.prisma.siteTheme.count({
          where: { tenantId, active: true },
        }),
        this.prisma.tenantDomain.count({
          where: {
            tenantId,
            primary: true,
            status: { in: ['VERIFIED', 'ACTIVE'] },
          },
        }),
      ]);

    return {
      activeTenantAdmin: adminCount > 0,
      activeSubscription: subscriptionCount > 0,
      activeTheme: themeCount > 0,
      primaryDomain: domainCount > 0,
    };
  }

  private async assertTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
