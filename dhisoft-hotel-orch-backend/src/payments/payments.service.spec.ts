import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService idempotency', () => {
  const reservation = {
    id: 'reservation-1',
    status: 'HOLD',
    balanceTotal: new Prisma.Decimal(1000),
    currency: 'INR',
  };

  function createService(existing?: any) {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue({
          id: 'payment-1',
          tenantId: 'tenant-1',
          reservationId: reservation.id,
          amount: new Prisma.Decimal(500),
          currency: 'INR',
          idempotencyKey: 'checkout-1',
        }),
      },
    } as any;
    const reservations = { get: jest.fn().mockResolvedValue(reservation) } as any;
    const axisRooms = { enqueueBooking: jest.fn() } as any;
    return {
      service: new PaymentsService(prisma, reservations, axisRooms),
      prisma,
    };
  }

  it('looks up idempotency within the tenant scope', async () => {
    const { service, prisma } = createService();
    await service.checkout('tenant-1', {
      reservationId: reservation.id,
      amount: 500,
      idempotencyKey: 'checkout-1',
    });

    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_idempotencyKey: {
          tenantId: 'tenant-1',
          idempotencyKey: 'checkout-1',
        },
      },
    });
  });

  it('rejects reusing a key for different payment data', async () => {
    const { service } = createService({
      id: 'payment-1',
      reservationId: 'different-reservation',
      amount: new Prisma.Decimal(500),
      currency: 'INR',
    });

    await expect(
      service.checkout('tenant-1', {
        reservationId: reservation.id,
        amount: 500,
        idempotencyKey: 'checkout-1',
      }),
    ).rejects.toThrow('Idempotency key is already used for different payment data');
  });
});
