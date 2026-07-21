import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../common/encryption.service';
import { PrismaService } from '../common/prisma.service';
import {
  PlatformActor,
  PlatformAuditService,
} from '../platform-common/platform-audit.service';
import {
  UpsertProviderDto,
  UpsertTenantCredentialDto,
} from './dto/platform-integration.dto';

@Injectable()
export class PlatformIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: PlatformAuditService,
  ) {}

  providers() {
    return this.prisma.platformIntegrationProvider.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { tenantCredentials: true } },
      },
    });
  }

  async upsertProvider(
    dto: UpsertProviderDto,
    actor: PlatformActor,
  ) {
    const key = dto.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const provider = await this.prisma.platformIntegrationProvider.upsert({
      where: { key },
      create: {
        key,
        name: dto.name.trim(),
        category: dto.category.trim().toUpperCase(),
        enabled: dto.enabled ?? false,
        publicConfig: dto.publicConfig as Prisma.InputJsonValue | undefined,
      },
      update: {
        name: dto.name.trim(),
        category: dto.category.trim().toUpperCase(),
        enabled: dto.enabled,
        publicConfig: dto.publicConfig as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.record({
      actor,
      action: 'INTEGRATION_PROVIDER_UPSERTED',
      entityType: 'PlatformIntegrationProvider',
      entityId: provider.id,
      metadata: { key: provider.key, enabled: provider.enabled },
    });
    return provider;
  }

  credentials(tenantId?: string) {
    return this.prisma.tenantIntegrationCredential.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        enabled: true,
        health: true,
        lastTestedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
        provider: {
          select: {
            id: true,
            key: true,
            name: true,
            category: true,
            enabled: true,
          },
        },
      },
    });
  }

  async upsertCredential(
    dto: UpsertTenantCredentialDto,
    actor: PlatformActor,
  ) {
    const [tenant, provider] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
      this.prisma.platformIntegrationProvider.findUnique({
        where: { id: dto.providerId },
      }),
    ]);
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!provider) throw new NotFoundException('Provider not found');
    if (Object.keys(dto.credentials).length === 0) {
      throw new BadRequestException('Credentials cannot be empty');
    }

    const encryptedConfig = this.encryption.encrypt(dto.credentials);
    const credential =
      await this.prisma.tenantIntegrationCredential.upsert({
        where: {
          tenantId_providerId: {
            tenantId: dto.tenantId,
            providerId: dto.providerId,
          },
        },
        create: {
          tenantId: dto.tenantId,
          providerId: dto.providerId,
          encryptedConfig,
          enabled: dto.enabled ?? true,
          health: 'UNKNOWN',
        },
        update: {
          encryptedConfig,
          enabled: dto.enabled,
          health: 'UNKNOWN',
          lastError: null,
        },
        select: {
          id: true,
          tenantId: true,
          enabled: true,
          health: true,
          updatedAt: true,
          provider: {
            select: { id: true, key: true, name: true },
          },
        },
      });

    await this.audit.record({
      actor,
      action: 'TENANT_INTEGRATION_CREDENTIALS_UPDATED',
      entityType: 'TenantIntegrationCredential',
      entityId: credential.id,
      tenantId: dto.tenantId,
      metadata: { providerKey: provider.key },
    });
    return credential;
  }

  async testCredential(id: string, actor: PlatformActor) {
    const credential =
      await this.prisma.tenantIntegrationCredential.findUnique({
        where: { id },
        include: {
          provider: true,
        },
      });
    if (!credential) throw new NotFoundException('Credential not found');

    try {
      const decrypted =
        this.encryption.decrypt<Record<string, unknown>>(
          credential.encryptedConfig,
        );
      if (Object.keys(decrypted).length === 0) {
        throw new Error('Decrypted credential payload is empty');
      }

      const updated =
        await this.prisma.tenantIntegrationCredential.update({
          where: { id },
          data: {
            health: 'HEALTHY',
            lastTestedAt: new Date(),
            lastError: null,
          },
          select: {
            id: true,
            tenantId: true,
            enabled: true,
            health: true,
            lastTestedAt: true,
            provider: {
              select: { id: true, key: true, name: true },
            },
          },
        });
      await this.audit.record({
        actor,
        action: 'TENANT_INTEGRATION_STORAGE_TESTED',
        entityType: 'TenantIntegrationCredential',
        entityId: id,
        tenantId: credential.tenantId,
        metadata: {
          providerKey: credential.provider.key,
          testBoundary:
            'Encryption/decryption and configuration presence only; provider network adapters must perform certification tests.',
        },
      });
      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Credential test failed';
      await this.prisma.tenantIntegrationCredential.update({
        where: { id },
        data: {
          health: 'DOWN',
          lastTestedAt: new Date(),
          lastError: message,
        },
      });
      throw new BadRequestException(message);
    }
  }
}
