declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      user?: { sub: string; tenantId: string; role: string; email: string };
    }
  }
}
export {};
