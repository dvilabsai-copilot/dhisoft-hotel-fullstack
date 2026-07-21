import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from './prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    // Depending on the adapter/proxy, Express may expose the route through
    // `path`, `url`, or `originalUrl`. Use all available forms so public
    // control-plane endpoints can never fall through to tenant resolution.
    const routePath = [request.path, request.url, request.originalUrl]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (
      routePath.includes('/health') ||
      routePath.includes('/docs') ||
      routePath.includes('/platform-auth') ||
      routePath.includes('/platform/')
    ) {
      return next();
    }

    const fromHeader = request.header('x-tenant-slug');
    const fromQuery =
      typeof request.query.tenant === 'string'
        ? request.query.tenant
        : undefined;
    const host = request.hostname.split('.')[0];
    const slug =
      fromHeader ??
      fromQuery ??
      (host !== 'localhost' && host !== '127' ? host : undefined) ??
      this.config.get<string>('DEFAULT_TENANT_SLUG') ??
      'rainwood';

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Tenant not found or inactive');
    }

    request.tenantId = tenant.id;
    request.tenantSlug = tenant.slug;
    next();
  }
}
