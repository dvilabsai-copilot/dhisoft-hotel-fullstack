import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { FEATURE_KEY } from './feature.decorator';

const LEGACY_DEFAULTS: Record<string, boolean> = {
  HOTEL_CORE: true,
  WEBSITE_BUILDER: true,
  BOOKING_ENGINE: true,
  PAYMENTS: true,
  MANUAL_RESERVATIONS: true,
  REPORTS: true,
  AXISROOMS: true,
};

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId as string | undefined;
    if (!tenantId) return true;

    const definition = await this.prisma.featureDefinition.findUnique({
      where: { key: featureKey },
      include: {
        tenantFeatures: {
          where: { tenantId },
          take: 1,
        },
      },
    });

    const enabled =
      definition?.tenantFeatures[0]?.enabled ??
      definition?.defaultEnabled ??
      LEGACY_DEFAULTS[featureKey] ??
      false;

    if (!enabled) {
      throw new ForbiddenException(`Feature ${featureKey} is not enabled for this tenant`);
    }
    return true;
  }
}
