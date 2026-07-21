-- Scope checkout idempotency to a tenant while retaining uniqueness within that tenant.
DROP INDEX "Payment_idempotencyKey_key";

CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key"
  ON "Payment"("tenantId", "idempotencyKey");
