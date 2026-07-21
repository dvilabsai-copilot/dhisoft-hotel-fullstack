import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { AxisRoomsService } from '../axisrooms/axisrooms.service';
import { PrismaService } from '../common/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import {
  CheckoutDto,
  ManualPaymentDto,
  MockWebhookDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: ReservationsService,
    private readonly axisRooms: AxisRoomsService,
  ) {}

  async checkout(tenantId: string, dto: CheckoutDto) {
    const reservation = await this.reservations.get(tenantId, dto.reservationId);
    if (reservation.status === 'CANCELLED') {
      throw new BadRequestException('Reservation cancelled');
    }
    if (
      dto.amount <= 0 ||
      dto.amount > Number(reservation.balanceTotal)
    ) {
      throw new BadRequestException('Payment amount exceeds outstanding balance');
    }

    const existing = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });
    if (existing) return this.reuseExistingPayment(existing, reservation, dto);

    try {
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          reservationId: reservation.id,
          amount: dto.amount,
          currency: reservation.currency,
          method: PaymentMethod.GATEWAY,
          status: PaymentStatus.PENDING,
          provider: 'MOCK',
          idempotencyKey: dto.idempotencyKey,
        },
      });
      return { ...payment, checkoutUrl: `/demo-payment/${payment.id}` };
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const raced = await this.prisma.payment.findUniqueOrThrow({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      return this.reuseExistingPayment(raced, reservation, dto);
    }
  }

  async webhook(tenantId: string, dto: MockWebhookDto) {
    let shouldEnqueue = false;
    let result: { duplicate?: boolean; ok?: boolean; reservationStatus?: string };
    try {
      result = await this.prisma.$transaction(
        async tx => {
        const payment = await tx.payment.findFirst({
          where: { id: dto.paymentId, tenantId },
        });
        if (!payment) throw new NotFoundException('Payment not found');

        const duplicate = await tx.paymentEvent.findUnique({
          where: { providerEventId: dto.providerEventId },
        });
        if (duplicate) return { duplicate: true };

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            providerEventId: dto.providerEventId,
            payload: { ...dto },
          },
        });

        const applyPaidAmount =
          dto.status === 'PAID' && payment.status !== PaymentStatus.PAID;
        let reservationStatus: string | undefined;
        if (applyPaidAmount) {
          const reservation = await this.reservations.confirmPaidInTransaction(
            tx,
            tenantId,
            payment.reservationId,
            Number(payment.amount),
          );
          reservationStatus = reservation.status;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status:
              payment.status === PaymentStatus.PAID || dto.status === 'PAID'
                ? PaymentStatus.PAID
                : PaymentStatus.FAILED,
            providerReference: dto.providerEventId,
          },
        });

        return { ok: true, reservationStatus };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.isSerializationConflict(error)) {
        throw new ConflictException('Payment changed concurrently; retry');
      }
      throw error;
    }

    shouldEnqueue = result.reservationStatus === 'CONFIRMED';
    if (shouldEnqueue) {
      const payment = await this.prisma.payment.findUnique({
        where: { id: dto.paymentId },
        select: { reservationId: true },
      });
      if (payment) await this.axisRooms.enqueueBooking(tenantId, payment.reservationId);
    }
    return result;
  }

  async manual(tenantId: string, dto: ManualPaymentDto, userId: string) {
    let reservationId: string | undefined;
    const result = await this.prisma.$transaction(
      async tx => {
        const reservation = await tx.reservation.findFirst({
          where: { id: dto.reservationId, tenantId },
        });
        if (!reservation) throw new NotFoundException('Reservation not found');
        if (
          dto.amount <= 0 ||
          dto.amount > Number(reservation.balanceTotal)
        ) {
          throw new BadRequestException('Payment amount exceeds outstanding balance');
        }

        const payment = await tx.payment.create({
          data: {
            tenantId,
            reservationId: reservation.id,
            amount: dto.amount,
            currency: reservation.currency,
            method: dto.method,
            status: PaymentStatus.VERIFIED,
            provider: 'MANUAL',
            providerReference: dto.reference,
            idempotencyKey: `manual:${tenantId}:${dto.reference}`,
            proofUrl: dto.proofUrl,
            notes: dto.notes,
            verifiedById: userId,
            verifiedAt: new Date(),
          },
        });
        const updatedReservation =
          await this.reservations.confirmPaidInTransaction(
            tx,
            tenantId,
            reservation.id,
            dto.amount,
          );
        reservationId = reservation.id;
        return { payment, reservation: updatedReservation };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.reservation.status === 'CONFIRMED' && reservationId) {
      await this.axisRooms.enqueueBooking(tenantId, reservationId);
    }
    return result.payment;
  }

  list(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      include: { reservation: { include: { guest: true, property: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private reuseExistingPayment(
    payment: {
      reservationId: string;
      amount: Prisma.Decimal;
      currency: string;
      id: string;
      [key: string]: unknown;
    },
    reservation: { id: string; currency: string },
    dto: CheckoutDto,
  ) {
    if (
      payment.reservationId !== reservation.id ||
      Number(payment.amount) !== dto.amount ||
      payment.currency !== reservation.currency
    ) {
      throw new ConflictException(
        'Idempotency key is already used for different payment data',
      );
    }
    return { ...payment, checkoutUrl: `/demo-payment/${payment.id}` };
  }

  private isUniqueConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private isSerializationConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }
}
