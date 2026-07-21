import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export function createDemoWebhookToken(paymentId: string, secret: string | undefined): string | undefined {
  if (!secret) return undefined;
  return createHmac('sha256', secret)
    .update(`demo-payment:${paymentId}`)
    .digest('hex');
}

export function assertDemoWebhookToken(
  actual: string | undefined,
  paymentId: string,
  secret: string | undefined,
  label: string,
): void {
  if (process.env.NODE_ENV !== 'production') return;
  const expected = createDemoWebhookToken(paymentId, secret);
  if (!actual || !expected) {
    throw new UnauthorizedException(`${label} demo token is missing`);
  }
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException(`Invalid ${label} demo token`);
  }
}

export function assertWebhookSecret(actual: string | undefined, expected: string | undefined, label: string): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!actual || !expected) throw new UnauthorizedException(`${label} webhook secret is missing`);
  const a=Buffer.from(actual), b=Buffer.from(expected);
  if(a.length!==b.length || !timingSafeEqual(a,b)) throw new UnauthorizedException(`Invalid ${label} webhook signature`);
}
