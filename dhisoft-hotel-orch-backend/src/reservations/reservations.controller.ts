import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { RequiresFeature } from '../common/feature.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { tenantIdFrom } from '../common/tenant';
import {
  CancelReservationDto,
  CreateHoldDto,
  ManualReservationDto,
} from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Public()
  @RequiresFeature('BOOKING_ENGINE')
  @Post('hold')
  hold(@Req() request: Request, @Body() dto: CreateHoldDto) {
    return this.service.createHold(tenantIdFrom(request), dto);
  }

  @Roles(
    UserRole.TENANT_ADMIN,
    UserRole.RESERVATION_MANAGER,
    UserRole.RESERVATION_AGENT,
  )
  @RequiresFeature('MANUAL_RESERVATIONS')
  @Post('manual')
  manual(@Req() request: Request, @Body() dto: ManualReservationDto) {
    return this.service.manual(
      tenantIdFrom(request),
      dto,
      (request.user as Express.TenantRequestUser).sub,
    );
  }

  @Roles(
    UserRole.TENANT_ADMIN,
    UserRole.RESERVATION_MANAGER,
    UserRole.RESERVATION_AGENT,
    UserRole.ACCOUNTS,
    UserRole.VIEWER,
  )
  @RequiresFeature('MANUAL_RESERVATIONS')
  @Get()
  list(@Req() request: Request) {
    return this.service.list(tenantIdFrom(request));
  }

  @Roles(UserRole.TENANT_ADMIN)
  @RequiresFeature('BOOKING_ENGINE')
  @Post('maintenance/expire-holds')
  expire(@Req() request: Request) {
    return this.service.expireHolds(tenantIdFrom(request));
  }

  @Roles(
    UserRole.TENANT_ADMIN,
    UserRole.RESERVATION_MANAGER,
    UserRole.RESERVATION_AGENT,
    UserRole.ACCOUNTS,
    UserRole.VIEWER,
  )
  @RequiresFeature('MANUAL_RESERVATIONS')
  @Get(':id')
  get(@Req() request: Request, @Param('id') id: string) {
    return this.service.get(tenantIdFrom(request), id);
  }

  @Roles(UserRole.TENANT_ADMIN, UserRole.RESERVATION_MANAGER)
  @RequiresFeature('MANUAL_RESERVATIONS')
  @Post(':id/cancel')
  cancel(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
  ) {
    return this.service.cancel(tenantIdFrom(request), id, dto.reason);
  }
}
