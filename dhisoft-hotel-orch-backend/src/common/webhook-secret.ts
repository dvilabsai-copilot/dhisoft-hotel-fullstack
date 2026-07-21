import { UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
export function assertWebhookSecret(actual: string | undefined, expected: string | undefined, label: string): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!actual || !expected) throw new UnauthorizedException(`${label} webhook secret is missing`);
  const a=Buffer.from(actual), b=Buffer.from(expected);
  if(a.length!==b.length || !timingSafeEqual(a,b)) throw new UnauthorizedException(`Invalid ${label} webhook signature`);
}
