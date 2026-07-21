-- PostgreSQL requires new enum values to be committed before they are
-- referenced by a column default in a later migration transaction.
ALTER TYPE "TenantStatus" ADD VALUE 'ONBOARDING';
ALTER TYPE "TenantStatus" ADD VALUE 'ARCHIVED';
