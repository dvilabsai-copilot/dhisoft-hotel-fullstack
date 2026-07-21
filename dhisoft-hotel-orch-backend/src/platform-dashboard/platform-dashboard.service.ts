import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const [
      tenantGroups,
      propertyCount,
      activeUserCount,
      reservationAggregate,
      failedSyncCount,
      failedPaymentCount,
      subscriptions,
      recentAudits,
    ] = await Promise.all([
      this.prisma.tenant.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.property.count({ where: { active: true } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.reservation.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.syncJob.count({
        where: {
          status: { in: ['FAILED', 'RETRYING'] },
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.payment.count({
        where: {
          status: 'FAILED',
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.tenantSubscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      this.prisma.platformAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          actor: {
            select: { name: true, email: true, role: true },
          },
          tenant: {
            select: { name: true, slug: true },
          },
        },
      }),
    ]);

    const tenantStatus = Object.fromEntries(
      tenantGroups.map((group: any) => [group.status, group._count._all]),
    );
    const estimatedMrr = subscriptions.reduce((sum: number, subscription: any) => {
      const plan = subscription.plan;
      if (plan.monthlyPrice) return sum + Number(plan.monthlyPrice);
      if (plan.annualPrice) return sum + Number(plan.annualPrice) / 12;
      return sum;
    }, 0);

    return {
      generatedAt: now,
      tenants: {
        total: tenantGroups.reduce(
          (sum: number, group: any) => sum + group._count._all,
          0,
        ),
        byStatus: tenantStatus,
      },
      activeProperties: propertyCount,
      activeTenantUsers: activeUserCount,
      last30Days: {
        reservations: reservationAggregate._count._all,
        bookingValue: Number(reservationAggregate._sum.grandTotal ?? 0),
        failedSyncJobs: failedSyncCount,
        failedPayments: failedPaymentCount,
      },
      commercial: {
        activeSubscriptions: subscriptions.length,
        estimatedMrr,
        currency: 'INR',
      },
      recentAudits,
    };
  }
}
