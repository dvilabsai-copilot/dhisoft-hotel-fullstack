import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export type PlatformActor = {
  sub: string;
  email: string;
};

@Injectable()
export class PlatformAuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: {
    actor?: PlatformActor;
    actorEmail?: string;
    action: string;
    entityType: string;
    entityId: string;
    tenantId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.platformAuditLog.create({
      data: {
        actorPlatformUserId: input.actor?.sub,
        actorEmail: input.actor?.email ?? input.actorEmail,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        tenantId: input.tenantId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
