import { Module } from '@nestjs/common';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { PlatformIntegrationsService } from './platform-integrations.service';

@Module({
  controllers: [PlatformIntegrationsController],
  providers: [PlatformIntegrationsService],
})
export class PlatformIntegrationsModule {}
