import { Request } from 'express';

export function requestMeta(request: Request) {
  return {
    ipAddress:
      request.ip ??
      (typeof request.headers['x-forwarded-for'] === 'string'
        ? request.headers['x-forwarded-for'].split(',')[0].trim()
        : undefined),
    userAgent: request.headers['user-agent'],
  };
}
