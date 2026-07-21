import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { AxisRoomsService } from '../axisrooms/axisrooms.service';
import { PrismaService } from '../common/prisma.service';
import {
  CreateHoldDto,
  ManualReservationDto,
} from './dto/reservation.dto';

const dayMs = 86_400_000;
const asDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
const cancellableStatuses: ReservationStatus[] = [
  ReservationStatus.HOLD,
  ReservationStatus.PENDING_PAYMENT,
  ReservationStatus.CONFIRMED,
];
const terminalStatuses: ReservationStatus[] = [
  ReservationStatus.CANCELLED,
  ReservationStatus.EXPIRED,
  ReservationStatus.FAILED,
];

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly axisRooms: AxisRoomsService,
  ) {}

  async createHold(tenantId: string, dto: CreateHoldDto, createdById?: string) {
    const checkIn = asDate(dto.checkIn);
    const checkOut = asDate(dto.checkOut);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / dayMs);
    if (nights < 1) throw new BadRequestException('Invalid stay');

    return this.prisma.$transaction(
      async tx => {
        const property = await tx.property.findFirst({
          where: { id: dto.propertyId, tenantId, active: true },
        });
        if (!property) throw new NotFoundException('Property not found');

        const plan = await tx.ratePlan.findFirst({
          where: {
            id: dto.ratePlanId,
            tenantId,
            propertyId: dto.propertyId,
            roomTypeId: dto.roomTypeId,
            active: true,
          },
          include: { roomType: true },
        });
        if (!plan) throw new NotFoundException('Rate plan not found');
        if (
          dto.adults > plan.roomType.maxAdults ||
          dto.children > plan.roomType.maxChildren ||
          dto.adults + dto.children > plan.roomType.maxOccupancy
        ) {
          throw new BadRequestException('Occupancy exceeds room limits');
        }

        const days = await tx.inventoryDay.findMany({
          where: {
            tenantId,
            ratePlanId: dto.ratePlanId,
            date: { gte: checkIn, lt: checkOut },
          },
          orderBy: { date: 'asc' },
        });
        if (days.length !== nights) {
          throw new ConflictException('Inventory incomplete');
        }
        if (
          days[0].closedToArrival ||
          days[days.length - 1].closedToDeparture ||
          days.some(
            day =>
              day.stopSell ||
              day.minLengthOfStay > nights ||
              day.availableRooms < dto.quantity,
          )
        ) {
          throw new ConflictException('Room is no longer available');
        }

        for (const day of days) {
          const updated = await tx.inventoryDay.updateMany({
            where: {
              id: day.id,
              availableRooms: { gte: dto.quantity },
              version: day.version,
            },
            data: {
              availableRooms: { decrement: dto.quantity },
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new ConflictException('Inventory changed; search again');
          }
        }

        const subtotal = days.reduce(
          (sum, day) => sum + Number(day.rate) * dto.quantity,
          0,
        );
        const tax = Number(
          new Prisma.Decimal(subtotal)
            .mul(property.taxPercentage)
            .div(100)
            .toFixed(2),
        );
        const total = subtotal + tax;
        const guest = await tx.guest.create({
          data: {
            tenantId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email.toLowerCase(),
            mobile: dto.mobile,
          },
        });
        const bookingRef = `RW-${new Date()
          .toISOString()
          .slice(0, 10)
          .replaceAll('-', '')}-${Math.random()
          .toString(36)
          .slice(2, 7)
          .toUpperCase()}`;

        return tx.reservation.create({
          data: {
            tenantId,
            propertyId: dto.propertyId,
            guestId: guest.id,
            bookingRef,
            status: ReservationStatus.HOLD,
            source: dto.source,
            roomSubtotal: subtotal,
            taxTotal: tax,
            grandTotal: total,
            balanceTotal: total,
            holdExpiresAt: new Date(Date.now() + 15 * 60_000),
            specialRequest: dto.specialRequest,
            createdById,
            rooms: {
              create: {
                propertyId: dto.propertyId,
                roomTypeId: dto.roomTypeId,
                ratePlanId: dto.ratePlanId,
                checkIn,
                checkOut,
                quantity: dto.quantity,
                adults: dto.adults,
                children: dto.children,
                nightlyBreakdown: days.map(day => ({
                  date: day.date,
                  rate: Number(day.rate),
                })),
                subtotal,
              },
            },
          },
          include: {
            guest: true,
            rooms: { include: { roomType: true, ratePlan: true } },
            property: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async manual(
    tenantId: string,
    dto: ManualReservationDto,
    userId: string,
  ) {
    const reservation = await this.createHold(tenantId, dto, userId);
    const confirmed = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
        holdExpiresAt: null,
        internalNotes: dto.internalNotes,
        externalSourceRef: dto.externalSourceRef,
      },
    });
    await this.axisRooms.enqueueBooking(tenantId, reservation.id);
    return confirmed;
  }

  list(tenantId: string) {
    return this.prisma.reservation.findMany({
      where: { tenantId },
      include: {
        guest: true,
        property: true,
        rooms: { include: { roomType: true, ratePlan: true } },
        payments: true,
        syncJobs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async get(tenantId: string, id: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { tenantId, id },
      include: {
        guest: true,
        property: true,
        rooms: { include: { roomType: true, ratePlan: true } },
        payments: true,
        syncJobs: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async confirmPaid(tenantId: string, id: string, paid: number) {
    try {
      return await this.prisma.$transaction(
        tx => this.confirmPaidInTransaction(tx, tenantId, id, paid),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.isSerializationConflict(error)) {
        throw new ConflictException('Payment changed concurrently; retry');
      }
      throw error;
    }
  }

  async confirmPaidInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    paid: number,
  ) {
    const reservation = await tx.reservation.findFirst({
      where: { tenantId, id },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (
      terminalStatuses.includes(reservation.status)
    ) {
      throw new BadRequestException('Reservation is not payable');
    }
    if (
      reservation.holdExpiresAt &&
      new Date(reservation.holdExpiresAt) < new Date() &&
      reservation.status === ReservationStatus.HOLD
    ) {
      throw new BadRequestException('Reservation hold expired');
    }

    const newPaid = new Prisma.Decimal(reservation.paidTotal).add(paid);
    if (newPaid.gt(reservation.grandTotal)) {
      throw new BadRequestException('Payment amount exceeds outstanding balance');
    }
    const fullyPaid = newPaid.gte(reservation.grandTotal);
    const updated = await tx.reservation.updateMany({
      where: {
        id,
        tenantId,
        status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.EXPIRED, ReservationStatus.FAILED] },
        paidTotal: reservation.paidTotal,
      },
      data: {
        paidTotal: newPaid,
        balanceTotal: new Prisma.Decimal(reservation.grandTotal).sub(newPaid),
        status: fullyPaid
          ? ReservationStatus.CONFIRMED
          : ReservationStatus.PENDING_PAYMENT,
        confirmedAt: fullyPaid ? new Date() : undefined,
        holdExpiresAt: fullyPaid ? null : undefined,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Payment changed concurrently; retry');
    }
    return tx.reservation.findUniqueOrThrow({ where: { id } });
  }

  async expireHolds(tenantId: string) {
    const expired = await this.prisma.reservation.findMany({
      where: { tenantId, status: ReservationStatus.HOLD, holdExpiresAt: { lt: new Date() } },
      include: { rooms: true },
      take: 100,
    });
    let released = 0;
    for (const reservation of expired) {
      await this.prisma.$transaction(async tx => {
        const claimed = await tx.reservation.updateMany({
          where: { id: reservation.id, tenantId, status: ReservationStatus.HOLD },
          data: { status: ReservationStatus.EXPIRED },
        });
        if (claimed.count !== 1) return;
        for (const room of reservation.rooms) {
          for (
            let timestamp = new Date(room.checkIn).getTime();
            timestamp < new Date(room.checkOut).getTime();
            timestamp += dayMs
          ) {
            await tx.inventoryDay.updateMany({
              where: {
                tenantId,
                ratePlanId: room.ratePlanId,
                date: new Date(timestamp),
              },
              data: { availableRooms: { increment: room.quantity }, version: { increment: 1 } },
            });
          }
        }
        released++;
      });
    }
    return { examined: expired.length, released };
  }

  async cancel(tenantId: string, id: string, reason: string) {
    try {
      return await this.prisma.$transaction(
        async tx => {
          const reservation = await tx.reservation.findFirst({
            where: { tenantId, id },
            include: { rooms: true },
          });
          if (!reservation) throw new NotFoundException('Reservation not found');
          if (
            terminalStatuses.includes(reservation.status)
          ) {
            return reservation;
          }

          const claimed = await tx.reservation.updateMany({
            where: { id, tenantId, status: { in: cancellableStatuses } },
            data: {
              status: ReservationStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellationReason: reason,
            },
          });
          if (claimed.count !== 1) {
            throw new ConflictException('Reservation changed concurrently; retry');
          }

          for (const room of reservation.rooms) {
            for (
              let timestamp = new Date(room.checkIn).getTime();
              timestamp < new Date(room.checkOut).getTime();
              timestamp += dayMs
            ) {
              await tx.inventoryDay.updateMany({
                where: {
                  tenantId,
                  ratePlanId: room.ratePlanId,
                  date: new Date(timestamp),
                },
                data: { availableRooms: { increment: room.quantity }, version: { increment: 1 } },
              });
            }
          }

          return tx.reservation.findUniqueOrThrow({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.isSerializationConflict(error)) {
        throw new ConflictException('Reservation changed concurrently; retry');
      }
      throw error;
    }
  }

  private isSerializationConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }
}
