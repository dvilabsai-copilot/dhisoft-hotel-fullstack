import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  PlatformActor,
  PlatformAuditService,
} from '../platform-common/platform-audit.service';
import {
  AssignThemeDto,
  CreateCatalogueThemeDto,
  UpdateCatalogueThemeDto,
} from './dto/platform-theme.dto';

@Injectable()
export class PlatformThemesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  list() {
    return this.prisma.themeCatalogue.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
      include: {
        _count: { select: { tenantThemes: true } },
      },
    });
  }

  async create(
    dto: CreateCatalogueThemeDto,
    actor: PlatformActor,
  ) {
    const theme = await this.prisma.themeCatalogue.create({
      data: {
        key: dto.key.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        version: dto.version,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        config: dto.config as Prisma.InputJsonValue,
        sectionSchema: dto.sectionSchema as Prisma.InputJsonValue,
        previewUrl: dto.previewUrl,
        status: 'DRAFT',
      },
    });
    await this.audit.record({
      actor,
      action: 'CATALOGUE_THEME_CREATED',
      entityType: 'ThemeCatalogue',
      entityId: theme.id,
      metadata: { key: theme.key, version: theme.version },
    });
    return theme;
  }

  async update(
    id: string,
    dto: UpdateCatalogueThemeDto,
    actor: PlatformActor,
  ) {
    const existing = await this.prisma.themeCatalogue.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Theme not found');
    if (
      existing.status === 'PUBLISHED' &&
      (dto.config || dto.sectionSchema)
    ) {
      throw new BadRequestException(
        'Published theme versions are immutable. Create a new version instead.',
      );
    }

    const theme = await this.prisma.themeCatalogue.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        config: dto.config as Prisma.InputJsonValue | undefined,
        sectionSchema: dto.sectionSchema as
          | Prisma.InputJsonValue
          | undefined,
        previewUrl: dto.previewUrl,
        status: dto.status,
      },
    });
    await this.audit.record({
      actor,
      action: 'CATALOGUE_THEME_UPDATED',
      entityType: 'ThemeCatalogue',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return theme;
  }

  async publish(id: string, actor: PlatformActor) {
    const existing = await this.prisma.themeCatalogue.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Theme not found');
    if (
      !existing.config ||
      !existing.sectionSchema ||
      Object.keys(existing.config as object).length === 0
    ) {
      throw new BadRequestException('Theme configuration is incomplete');
    }
    const theme = await this.prisma.themeCatalogue.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
    await this.audit.record({
      actor,
      action: 'CATALOGUE_THEME_PUBLISHED',
      entityType: 'ThemeCatalogue',
      entityId: id,
      metadata: { key: theme.key, version: theme.version },
    });
    return theme;
  }

  async assign(dto: AssignThemeDto, actor: PlatformActor) {
    const [tenant, catalogue] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
      this.prisma.themeCatalogue.findUnique({
        where: { id: dto.catalogueThemeId },
      }),
    ]);
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!catalogue || catalogue.status !== 'PUBLISHED') {
      throw new BadRequestException('Theme must be published before assignment');
    }

    const tenantTheme = await this.prisma.$transaction(async (tx: any) => {
      await tx.siteTheme.updateMany({
        where: { tenantId: dto.tenantId },
        data: { active: false },
      });
      return tx.siteTheme.upsert({
        where: {
          tenantId_key: {
            tenantId: dto.tenantId,
            key: `${catalogue.key}-v${catalogue.version}`,
          },
        },
        create: {
          tenantId: dto.tenantId,
          catalogueThemeId: catalogue.id,
          key: `${catalogue.key}-v${catalogue.version}`,
          name: catalogue.name,
          config: catalogue.config,
          active: true,
        },
        update: {
          catalogueThemeId: catalogue.id,
          name: catalogue.name,
          config: catalogue.config,
          active: true,
        },
      });
    });

    await this.audit.record({
      actor,
      action: 'TENANT_THEME_ASSIGNED',
      entityType: 'SiteTheme',
      entityId: tenantTheme.id,
      tenantId: dto.tenantId,
      metadata: {
        catalogueThemeId: catalogue.id,
        key: catalogue.key,
        version: catalogue.version,
      },
    });
    return tenantTheme;
  }
}
