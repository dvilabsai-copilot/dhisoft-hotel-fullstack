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
  CreateFeatureDto,
  SetTenantFeatureDto,
  UpdateFeatureDto,
} from './dto/platform-feature.dto';
import { PlatformFeaturesService } from './platform-features.service';

@ApiTags('platform-features')
@Controller('platform/features')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformFeaturesController {
  constructor(private readonly service: PlatformFeaturesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  create(@Req() request: Request, @Body() dto: CreateFeatureDto) {
    return this.service.create(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Patch(':id')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.service.update(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post('tenant')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  setTenantFeature(
    @Req() request: Request,
    @Body() dto: SetTenantFeatureDto,
  ) {
    return this.service.setTenantFeature(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }
}
