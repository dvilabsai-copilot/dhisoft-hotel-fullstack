import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Public } from '../common/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  get() {
    return this.live();
  }

  @Public()
  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'dhisoft-hotel-os',
      time: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'dhisoft-hotel-os',
        database: 'ok',
        time: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'dhisoft-hotel-os',
        database: 'unavailable',
      });
    }
  }
}
