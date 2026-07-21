import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PlatformHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const started = Date.now();
    let database: 'UP' | 'DOWN' = 'UP';
    let databaseError: string | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = 'DOWN';
      databaseError =
        error instanceof Error ? error.message : 'Database check failed';
    }

    const [failedSyncJobs, pendingSyncJobs, failedPayments, activeSupport] =
      await Promise.all([
        this.prisma.syncJob.count({ where: { status: 'FAILED' } }),
        this.prisma.syncJob.count({
          where: { status: { in: ['PENDING', 'RETRYING'] } },
        }),
        this.prisma.payment.count({ where: { status: 'FAILED' } }),
        this.prisma.supportSession.count({
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
          },
        }),
      ]);

    return {
      status:
        database === 'UP' && failedSyncJobs < 100
          ? 'OPERATIONAL'
          : 'DEGRADED',
      checkedAt: new Date(),
      responseTimeMs: Date.now() - started,
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: database,
        error: databaseError,
      },
      queues: {
        failedSyncJobs,
        pendingSyncJobs,
      },
      payments: {
        failedPayments,
      },
      security: {
        activeSupportSessions: activeSupport,
      },
      boundaries: {
        providerNetworkHealth:
          'Provider-specific adapters must report their own certified health checks.',
      },
    };
  }
}
