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
  AssignSubscriptionDto,
  CreatePlanDto,
  UpdatePlanDto,
} from './dto/platform-plan.dto';

@Injectable()
export class PlatformPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { subscriptions: true } },
      },
    });
  }

  async createPlan(
    dto: CreatePlanDto,
    actor: PlatformActor,
  ) {
    const code = dto.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        billingInterval: dto.billingInterval,
        monthlyPrice: dto.monthlyPrice,
        annualPrice: dto.annualPrice,
        setupFee: dto.setupFee ?? 0,
        currency: dto.currency?.toUpperCase() ?? 'INR',
        limits: dto.limits as Prisma.InputJsonValue,
        features: dto.features as Prisma.InputJsonValue,
        active: dto.active ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: 'PLAN_CREATED',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      metadata: { code: plan.code, name: plan.name },
    });
    return plan;
  }

  async updatePlan(
    id: string,
    dto: UpdatePlanDto,
    actor: PlatformActor,
  ) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Plan not found');

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        billingInterval: dto.billingInterval,
        monthlyPrice: dto.monthlyPrice,
        annualPrice: dto.annualPrice,
        setupFee: dto.setupFee,
        limits: dto.limits as Prisma.InputJsonValue | undefined,
        features: dto.features as Prisma.InputJsonValue | undefined,
        active: dto.active,
      },
    });
    await this.audit.record({
      actor,
      action: 'PLAN_UPDATED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return plan;
  }

  listSubscriptions() {
    return this.prisma.tenantSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
        plan: true,
      },
    });
  }

  async assign(
    dto: AssignSubscriptionDto,
    actor: PlatformActor,
  ) {
    const [tenant, plan] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
      this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } }),
    ]);
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!plan || !plan.active) {
      throw new BadRequestException('Subscription plan is unavailable');
    }

    const now = new Date();
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : now;
    const trialEndsAt = dto.trialEndsAt
      ? new Date(dto.trialEndsAt)
      : undefined;
    const currentPeriodEndsAt = dto.currentPeriodEndsAt
      ? new Date(dto.currentPeriodEndsAt)
      : undefined;

    if (
      [startsAt, trialEndsAt, currentPeriodEndsAt]
        .filter(Boolean)
        .some(value => Number.isNaN((value as Date).getTime()))
    ) {
      throw new BadRequestException('Subscription dates are invalid');
    }

    const subscription = await this.prisma.$transaction(async (tx: any) => {
      await tx.tenantSubscription.updateMany({
        where: {
          tenantId: dto.tenantId,
          status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          autoRenew: false,
        },
      });

      return tx.tenantSubscription.create({
        data: {
          tenantId: dto.tenantId,
          planId: dto.planId,
          status: dto.status,
          startsAt,
          trialEndsAt,
          currentPeriodEndsAt,
          autoRenew: dto.autoRenew ?? true,
          commercialTerms: dto.commercialTerms as
            | Prisma.InputJsonValue
            | undefined,
        },
        include: { plan: true, tenant: true },
      });
    });

    await this.audit.record({
      actor,
      action: 'SUBSCRIPTION_ASSIGNED',
      entityType: 'TenantSubscription',
      entityId: subscription.id,
      tenantId: dto.tenantId,
      metadata: {
        planId: dto.planId,
        status: dto.status,
      },
    });
    return subscription;
  }
}
