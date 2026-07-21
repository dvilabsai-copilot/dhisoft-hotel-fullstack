import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PlatformAuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: {
    tenantId?: string;
    action?: string;
    entityType?: string;
    take?: number;
  }) {
    return this.prisma.platformAuditLog.findMany({
      where: {
        tenantId: filters.tenantId,
        action: filters.action
          ? { contains: filters.action, mode: 'insensitive' }
          : undefined,
        entityType: filters.entityType,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(filters.take ?? 100, 1), 500),
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }
}
