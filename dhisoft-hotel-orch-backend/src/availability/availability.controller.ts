import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequiresFeature } from '../common/feature.decorator';
import { Public } from '../common/public.decorator';
import { tenantIdFrom } from '../common/tenant';
import { AvailabilitySearchDto } from './dto/search.dto';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('availability')
@RequiresFeature('BOOKING_ENGINE')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Public()
  @Get('search')
  search(@Req() request: Request, @Query() dto: AvailabilitySearchDto) {
    return this.service.search(tenantIdFrom(request), dto);
  }
}
