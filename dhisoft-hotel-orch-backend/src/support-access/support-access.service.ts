import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformUserRole, UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  PlatformActor,
  PlatformAuditService,
} from '../platform-common/platform-audit.service';
import {
  CreateSupportSessionDto,
  SupportDecisionDto,
} from './dto/support-access.dto';

@Injectable()
export class SupportAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantJwt: JwtService,
    private readonly audit: PlatformAuditService,
  ) {}

  listPlatform(tenantId?: string) {
    return this.prisma.supportSession.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedByTenantUser: {
          select: { id: true, name: true, email: true },
        },
      },
      take: 200,
    });
  }

  async request(
    dto: CreateSupportSessionDto,
    actor: Express.PlatformRequestUser,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new BadRequestException('Support access requires an active tenant');
    }

    const requiresApproval = dto.requiresTenantApproval ?? true;
    if (
      !requiresApproval &&
      !new Set<PlatformUserRole>([
        PlatformUserRole.PLATFORM_OWNER,
        PlatformUserRole.SUPER_ADMIN,
      ]).has(actor.role)
    ) {
      throw new ForbiddenException(
        'Only platform owners or super admins may request emergency access',
      );
    }

    const session = await this.prisma.supportSession.create({
      data: {
        tenantId: dto.tenantId,
        requestedById: actor.sub,
        reason: dto.reason.trim(),
        requiresTenantApproval: requiresApproval,
        status: requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
        approvedAt: requiresApproval ? undefined : new Date(),
        expiresAt: new Date(Date.now() + dto.durationMinutes * 60_000),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    await this.audit.record({
      actor,
      action: requiresApproval
        ? 'SUPPORT_ACCESS_REQUESTED'
        : 'EMERGENCY_SUPPORT_ACCESS_APPROVED',
      entityType: 'SupportSession',
      entityId: session.id,
      tenantId: session.tenantId,
      metadata: {
        reason: session.reason,
        expiresAt: session.expiresAt.toISOString(),
        requiresTenantApproval: requiresApproval,
      },
    });
    return session;
  }

  listTenant(tenantId: string) {
    return this.prisma.supportSession.findMany({
      where: {
        tenantId,
        status: {
          in: ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'],
        },
        expiresAt: { gt: new Date() },
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedByTenantUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(
    tenantId: string,
    sessionId: string,
    tenantUserId: string,
    dto: SupportDecisionDto,
  ) {
    const session = await this.get(sessionId);
    if (session.tenantId !== tenantId) {
      throw new NotFoundException('Support session not found');
    }
    if (session.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Support session is not awaiting approval');
    }
    if (session.expiresAt <= new Date()) {
      await this.expire(session.id);
      throw new BadRequestException('Support request has expired');
    }

    const updated = await this.prisma.supportSession.update({
      where: { id: sessionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByTenantUserId: tenantUserId,
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await this.audit.record({
      actorEmail: `tenant-user:${tenantUserId}`,
      action: 'SUPPORT_ACCESS_APPROVED_BY_TENANT',
      entityType: 'SupportSession',
      entityId: sessionId,
      tenantId,
      metadata: {
        approvedByTenantUserId: tenantUserId,
        note: dto.note,
      },
    });
    return updated;
  }

  async reject(
    tenantId: string,
    sessionId: string,
    tenantUserId: string,
    dto: SupportDecisionDto,
  ) {
    const session = await this.get(sessionId);
    if (session.tenantId !== tenantId) {
      throw new NotFoundException('Support session not found');
    }
    if (session.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Support session is not awaiting approval');
    }
    const updated = await this.prisma.supportSession.update({
      where: { id: sessionId },
      data: {
        status: 'REJECTED',
        approvedByTenantUserId: tenantUserId,
      },
    });
    await this.audit.record({
      action: 'SUPPORT_ACCESS_REJECTED_BY_TENANT',
      entityType: 'SupportSession',
      entityId: sessionId,
      tenantId,
      metadata: {
        rejectedByTenantUserId: tenantUserId,
        note: dto.note,
      },
    });
    return updated;
  }

  async exchange(
    sessionId: string,
    actor: Express.PlatformRequestUser,
  ) {
    const session = await this.prisma.supportSession.findUnique({
      where: { id: sessionId },
      include: {
        tenant: {
          select: { id: true, slug: true, name: true, status: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Support session not found');
    if (session.requestedById !== actor.sub) {
      throw new ForbiddenException(
        'Only the requesting platform user may start this support session',
      );
    }
    if (!['APPROVED', 'ACTIVE'].includes(session.status)) {
      throw new BadRequestException('Support session is not approved');
    }
    if (session.expiresAt <= new Date()) {
      await this.expire(session.id);
      throw new BadRequestException('Support session has expired');
    }
    if (session.tenant.status !== 'ACTIVE') {
      throw new BadRequestException('Tenant is not active');
    }

    await this.prisma.supportSession.update({
      where: { id: session.id },
      data: {
        status: 'ACTIVE',
        activatedAt: session.activatedAt ?? new Date(),
      },
    });

    const expiresInSeconds = Math.max(
      1,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );
    const accessToken = await this.tenantJwt.signAsync(
      {
        kind: 'SUPPORT',
        sub: actor.sub,
        tenantId: session.tenantId,
        role: UserRole.TENANT_ADMIN,
        email: actor.email,
        platformUserId: actor.sub,
        supportSessionId: session.id,
      },
      { expiresIn: expiresInSeconds },
    );

    await this.audit.record({
      actor,
      action: 'SUPPORT_SESSION_STARTED',
      entityType: 'SupportSession',
      entityId: session.id,
      tenantId: session.tenantId,
      metadata: { expiresAt: session.expiresAt.toISOString() },
    });

    return {
      accessToken,
      tenant: session.tenant,
      session: {
        id: session.id,
        reason: session.reason,
        expiresAt: session.expiresAt,
      },
    };
  }

  async revoke(
    sessionId: string,
    actor: PlatformActor,
  ) {
    const session = await this.get(sessionId);
    const updated = await this.prisma.supportSession.update({
      where: { id: sessionId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
    await this.audit.record({
      actor,
      action: 'SUPPORT_SESSION_REVOKED',
      entityType: 'SupportSession',
      entityId: sessionId,
      tenantId: session.tenantId,
    });
    return updated;
  }

  private async get(id: string) {
    const session = await this.prisma.supportSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Support session not found');
    return session;
  }

  private expire(id: string) {
    return this.prisma.supportSession.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });
  }
}
