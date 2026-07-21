# Architecture decisions

1. **RainWood is tenant 1, not hardcoded business logic.** Every business record is tenant-scoped.
2. **Builder is section-based.** Administrators edit validated section JSON; arbitrary HTML/JavaScript is not stored or executed.
3. **Inventory is date + rate-plan based.** Search checks complete date coverage, room count, stop-sell, CTA, CTD, MLOS and occupancy.
4. **Reservation holds decrement inventory transactionally.** Serializable transactions and version predicates reduce oversell risk. Production should also use a hold-expiry worker and monitoring.
5. **Payments are idempotent.** Checkout uses an idempotency key; webhook events have unique provider IDs.
6. **Channel manager is asynchronous.** AxisRooms pushes become retryable SyncJobs instead of blocking customer confirmation indefinitely.
7. **Approved demo traceability.** Public website, hotels, hotel detail, booking, reservation, payments, reports, admin and AxisRooms are represented as modules/routes.
