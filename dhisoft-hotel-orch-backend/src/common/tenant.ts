import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import type {} from '../types/express';

export function tenantIdFrom(req: Request): string {
  if (!req.tenantId) throw new BadRequestException('Tenant context missing');
  return req.tenantId;
}
