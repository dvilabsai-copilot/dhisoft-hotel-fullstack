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
  AssignThemeDto,
  CreateCatalogueThemeDto,
  UpdateCatalogueThemeDto,
} from './dto/platform-theme.dto';
import { PlatformThemesService } from './platform-themes.service';

@ApiTags('platform-themes')
@Controller('platform/themes')
@PlatformProtected(
  PlatformUserRole.PLATFORM_OWNER,
  PlatformUserRole.SUPER_ADMIN,
  PlatformUserRole.SUPPORT_ADMIN,
  PlatformUserRole.READ_ONLY_AUDITOR,
)
export class PlatformThemesController {
  constructor(private readonly service: PlatformThemesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  create(
    @Req() request: Request,
    @Body() dto: CreateCatalogueThemeDto,
  ) {
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
    @Body() dto: UpdateCatalogueThemeDto,
  ) {
    return this.service.update(
      id,
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post(':id/publish')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  publish(@Req() request: Request, @Param('id') id: string) {
    return this.service.publish(
      id,
      request.user as Express.PlatformRequestUser,
    );
  }

  @Post('assign')
  @PlatformProtected(
    PlatformUserRole.PLATFORM_OWNER,
    PlatformUserRole.SUPER_ADMIN,
  )
  assign(@Req() request: Request, @Body() dto: AssignThemeDto) {
    return this.service.assign(
      dto,
      request.user as Express.PlatformRequestUser,
    );
  }
}
