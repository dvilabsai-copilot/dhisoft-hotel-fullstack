jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard';
import type { PrismaService } from './prisma.service';

function contextWithTenant(tenantId?: string): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ tenantId }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('FeatureGuard', () => {
  it('honours a tenant-specific disabled override', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('AXISROOMS'),
    } as unknown as Reflector;
    const prisma = {
      featureDefinition: {
        findUnique: jest.fn().mockResolvedValue({
          defaultEnabled: true,
          tenantFeatures: [{ enabled: false }],
        }),
      },
    } as unknown as PrismaService;
    const guard = new FeatureGuard(reflector, prisma);

    await expect(guard.canActivate(contextWithTenant('tenant-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('uses the definition default when no tenant override exists', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('REPORTS'),
    } as unknown as Reflector;
    const prisma = {
      featureDefinition: {
        findUnique: jest.fn().mockResolvedValue({
          defaultEnabled: true,
          tenantFeatures: [],
        }),
      },
    } as unknown as PrismaService;
    const guard = new FeatureGuard(reflector, prisma);

    await expect(guard.canActivate(contextWithTenant('tenant-1'))).resolves.toBe(true);
  });
});
