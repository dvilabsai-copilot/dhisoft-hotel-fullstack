jest.mock('@prisma/client', () => ({
  PlatformUserRole: {
    PLATFORM_OWNER: 'PLATFORM_OWNER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    SUPPORT_ADMIN: 'SUPPORT_ADMIN',
    BILLING_ADMIN: 'BILLING_ADMIN',
    READ_ONLY_AUDITOR: 'READ_ONLY_AUDITOR',
  },
  PrismaClient: class PrismaClient {},
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformUserRole } from '@prisma/client';
import { PlatformRolesGuard } from './platform-roles.guard';

function contextWith(user?: Partial<Express.PlatformRequestUser>): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('PlatformRolesGuard', () => {
  it('allows an explicitly authorized platform role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([PlatformUserRole.PLATFORM_OWNER]),
    } as unknown as Reflector;
    const guard = new PlatformRolesGuard(reflector);

    expect(
      guard.canActivate(
        contextWith({
          kind: 'PLATFORM',
          sub: 'platform-user-1',
          email: 'owner@dhisoft.test',
          role: PlatformUserRole.PLATFORM_OWNER,
        }),
      ),
    ).toBe(true);
  });

  it('rejects tenant-shaped or insufficient platform identities', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([PlatformUserRole.PLATFORM_OWNER]),
    } as unknown as Reflector;
    const guard = new PlatformRolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        contextWith({
          kind: 'PLATFORM',
          sub: 'platform-user-2',
          email: 'auditor@dhisoft.test',
          role: PlatformUserRole.READ_ONLY_AUDITOR,
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
