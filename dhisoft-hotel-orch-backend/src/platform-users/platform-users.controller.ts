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
  CreatePlatformUserDto,
  ResetPlatformPasswordDto,
  UpdatePlatformUserDto,
} from './dto/platform-user.dto';
import { PlatformUsersService } from './platform-users.service';

@ApiTags('platform-users')
@Controller('platform/users')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformUsersController {
  constructor(private readonly service: PlatformUsersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @PlatformProtected(PlatformUserRole.PLATFORM_OWNER)
  create(
    @Req() request: Request,
    @Body() dto: CreatePlatformUserDto,
  ) {
    return this.service.create(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Patch(':id')
  @PlatformProtected(PlatformUserRole.PLATFORM_OWNER)
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformUserDto,
  ) {
    return this.service.update(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/reset-password')
  @PlatformProtected(PlatformUserRole.PLATFORM_OWNER)
  resetPassword(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ResetPlatformPasswordDto,
  ) {
    return this.service.resetPassword(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }
}
