import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  PlatformActor,
  PlatformAuditService,
} from '../platform-common/platform-audit.service';
import {
  CreateFeatureDto,
  SetTenantFeatureDto,
  UpdateFeatureDto,
} from './dto/platform-feature.dto';

@Injectable()
export class PlatformFeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  list() {
    return this.prisma.featureDefinition.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { tenantFeatures: true } },
      },
    });
  }

  async create(dto: CreateFeatureDto, actor: PlatformActor) {
    const feature = await this.prisma.featureDefinition.create({
      data: {
        key: dto.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        defaultEnabled: dto.defaultEnabled ?? false,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });
    if (tenants.length) {
      await this.prisma.tenantFeature.createMany({
        data: tenants.map((tenant: { id: string }) => ({
          tenantId: tenant.id,
          featureId: feature.id,
          enabled: feature.defaultEnabled,
        })),
        skipDuplicates: true,
      });
    }

    await this.audit.record({
      actor,
      action: 'FEATURE_CREATED',
      entityType: 'FeatureDefinition',
      entityId: feature.id,
      metadata: { key: feature.key },
    });
    return feature;
  }

  async update(
    id: string,
    dto: UpdateFeatureDto,
    actor: PlatformActor,
  ) {
    const existing = await this.prisma.featureDefinition.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Feature not found');
    const feature = await this.prisma.featureDefinition.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        defaultEnabled: dto.defaultEnabled,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.record({
      actor,
      action: 'FEATURE_UPDATED',
      entityType: 'FeatureDefinition',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return feature;
  }

  async setTenantFeature(
    dto: SetTenantFeatureDto,
    actor: PlatformActor,
  ) {
    const [tenant, feature] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
      this.prisma.featureDefinition.findUnique({
        where: { id: dto.featureId },
      }),
    ]);
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!feature) throw new NotFoundException('Feature not found');

    const tenantFeature = await this.prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId: dto.tenantId,
          featureId: dto.featureId,
        },
      },
      create: {
        tenantId: dto.tenantId,
        featureId: dto.featureId,
        enabled: dto.enabled,
        config: dto.config as Prisma.InputJsonValue | undefined,
      },
      update: {
        enabled: dto.enabled,
        config: dto.config as Prisma.InputJsonValue | undefined,
      },
      include: { feature: true, tenant: true },
    });

    await this.audit.record({
      actor,
      action: 'TENANT_FEATURE_CHANGED',
      entityType: 'TenantFeature',
      entityId: tenantFeature.id,
      tenantId: dto.tenantId,
      metadata: {
        featureKey: feature.key,
        enabled: dto.enabled,
      },
    });
    return tenantFeature;
  }
}
