import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformUserRole } from '@prisma/client';
import { Request } from 'express';
import { PlatformProtected } from '../common/platform-protected.decorator';
import {
  AssignSubscriptionDto,
  CreatePlanDto,
  UpdatePlanDto,
} from './dto/platform-plan.dto';
import { PlatformPlansService } from './platform-plans.service';

@ApiTags('platform-plans')
@Controller('platform')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.BILLING_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformPlansController {
  constructor(private readonly service: PlatformPlansService) {}

  @Get('plans')
  listPlans() {
    return this.service.listPlans();
  }

  @Post('plans')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.BILLING_ADMIN,
  )
  createPlan(@Req() request: Request, @Body() dto: CreatePlanDto) {
    return this.service.createPlan(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Patch('plans/:id')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.BILLING_ADMIN,
  )
  updatePlan(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.service.updatePlan(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Get('subscriptions')
  subscriptions() {
    return this.service.listSubscriptions();
  }

  @Post('subscriptions')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
    PlatformUserRole.BILLING_ADMIN,
  )
  assign(
    @Req() request: Request,
    @Body() dto: AssignSubscriptionDto,
  ) {
    return this.service.assign(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }
}
