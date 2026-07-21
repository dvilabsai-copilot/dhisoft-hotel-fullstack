import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTxt } from 'dns/promises';
import { randomUUID } from 'crypto';
import { domainToASCII } from 'url';
import { PrismaService } from '../common/prisma.service';
import {
  PlatformActor,
  PlatformAuditService,
} from '../platform-common/platform-audit.service';
import {
  ActivateDomainDto,
  CreateDomainDto,
} from './dto/platform-domain.dto';

@Injectable()
export class PlatformDomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: PlatformAuditService,
  ) {}

  list(tenantId?: string) {
    return this.prisma.tenantDomain.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: [{ tenantId: 'asc' }, { primary: 'desc' }, { createdAt: 'asc' }],
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });
  }

  async create(dto: CreateDomainDto, actor: PlatformActor) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const domain = this.normalize(dto.domain);
    const existing = await this.prisma.tenantDomain.findUnique({
      where: { domain },
    });
    if (existing) throw new ConflictException('Domain is already assigned');

    const baseDomain =
      this.config.get<string>('PLATFORM_BASE_DOMAIN')?.toLowerCase();
    const isManagedSubdomain =
      dto.type === 'SUBDOMAIN' &&
      Boolean(baseDomain) &&
      domain.endsWith(`.${baseDomain}`);

    const created = await this.prisma.$transaction(async (tx: any) => {
      if (dto.primary) {
        await tx.tenantDomain.updateMany({
          where: { tenantId: dto.tenantId },
          data: { primary: false },
        });
      }
      return tx.tenantDomain.create({
        data: {
          tenantId: dto.tenantId,
          domain,
          type: dto.type,
          primary: dto.primary ?? false,
          verificationToken: randomUUID(),
          status: isManagedSubdomain ? 'ACTIVE' : 'PENDING_VERIFICATION',
          verifiedAt: isManagedSubdomain ? new Date() : undefined,
          sslStatus: isManagedSubdomain ? 'MANAGED' : 'PENDING',
        },
      });
    });

    await this.audit.record({
      actor,
      action: 'DOMAIN_CREATED',
      entityType: 'TenantDomain',
      entityId: created.id,
      tenantId: dto.tenantId,
      metadata: { domain, type: dto.type },
    });
    return created;
  }

  async verify(id: string, actor: PlatformActor) {
    const domain = await this.get(id);
    if (domain.status === 'ACTIVE' || domain.status === 'VERIFIED') return domain;

    const recordName = `_dhisoft-verification.${domain.domain}`;
    try {
      const records = await resolveTxt(recordName);
      const values = records.map(parts => parts.join(''));
      if (!values.includes(domain.verificationToken)) {
        throw new BadRequestException(
          `TXT record ${recordName} does not contain the verification token`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      await this.prisma.tenantDomain.update({
        where: { id },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'DNS lookup failed',
        },
      });
      throw new BadRequestException(
        `Unable to verify TXT record ${recordName}`,
      );
    }

    const verified = await this.prisma.tenantDomain.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        lastError: null,
      },
    });
    await this.audit.record({
      actor,
      action: 'DOMAIN_VERIFIED',
      entityType: 'TenantDomain',
      entityId: id,
      tenantId: domain.tenantId,
      metadata: { domain: domain.domain },
    });
    return verified;
  }

  async activate(
    id: string,
    dto: ActivateDomainDto,
    actor: PlatformActor,
  ) {
    const domain = await this.get(id);
    if (!['VERIFIED', 'ACTIVE'].includes(domain.status)) {
      throw new BadRequestException('Domain must be verified before activation');
    }
    const updated = await this.prisma.tenantDomain.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        sslStatus: dto.sslStatus ?? 'READY',
        lastError: null,
      },
    });
    await this.audit.record({
      actor,
      action: 'DOMAIN_ACTIVATED',
      entityType: 'TenantDomain',
      entityId: id,
      tenantId: domain.tenantId,
      metadata: { domain: domain.domain, sslStatus: updated.sslStatus },
    });
    return updated;
  }

  async makePrimary(id: string, actor: PlatformActor) {
    const domain = await this.get(id);
    if (domain.status !== 'ACTIVE') {
      throw new BadRequestException('Only an active domain can be primary');
    }
    const updated = await this.prisma.$transaction(async (tx: any) => {
      await tx.tenantDomain.updateMany({
        where: { tenantId: domain.tenantId },
        data: { primary: false },
      });
      return tx.tenantDomain.update({
        where: { id },
        data: { primary: true },
      });
    });
    await this.audit.record({
      actor,
      action: 'DOMAIN_PRIMARY_CHANGED',
      entityType: 'TenantDomain',
      entityId: id,
      tenantId: domain.tenantId,
      metadata: { domain: domain.domain },
    });
    return updated;
  }

  async disable(id: string, actor: PlatformActor) {
    const domain = await this.get(id);
    if (domain.primary) {
      throw new BadRequestException('Assign another primary domain first');
    }
    const updated = await this.prisma.tenantDomain.update({
      where: { id },
      data: { status: 'DISABLED' },
    });
    await this.audit.record({
      actor,
      action: 'DOMAIN_DISABLED',
      entityType: 'TenantDomain',
      entityId: id,
      tenantId: domain.tenantId,
      metadata: { domain: domain.domain },
    });
    return updated;
  }

  private async get(id: string) {
    const domain = await this.prisma.tenantDomain.findUnique({
      where: { id },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  private normalize(input: string) {
    const withoutProtocol = input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/\.$/, '');
    const ascii = domainToASCII(withoutProtocol);
    if (
      !ascii ||
      ascii === 'localhost' ||
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        ascii,
      )
    ) {
      throw new BadRequestException('Invalid domain name');
    }
    return ascii;
  }
}
