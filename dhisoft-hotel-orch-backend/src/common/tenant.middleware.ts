import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from './prisma.service';
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async use(req: Request, _res: Response, next: NextFunction) {
    if (req.path.includes('/health') || req.path.startsWith('/docs')) return next();
    const fromHeader = req.header('x-tenant-slug');
    const fromQuery = typeof req.query.tenant === 'string' ? req.query.tenant : undefined;
    const host = req.hostname.split('.')[0];
    const slug = fromHeader ?? fromQuery ?? (host !== 'localhost' && host !== '127' ? host : undefined) ?? this.config.get<string>('DEFAULT_TENANT_SLUG') ?? 'rainwood';
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id:true, slug:true, status:true } });
    if (!tenant || tenant.status !== 'ACTIVE') throw new NotFoundException('Tenant not found or inactive');
    req.tenantId = tenant.id; req.tenantSlug = tenant.slug;
    next();
  }
}
