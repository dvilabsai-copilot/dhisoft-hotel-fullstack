import { Module } from '@nestjs/common';
import { PlatformFeaturesController } from './platform-features.controller';
import { PlatformFeaturesService } from './platform-features.service';

@Module({
  controllers: [PlatformFeaturesController],
  providers: [PlatformFeaturesService],
})
export class PlatformFeaturesModule {}
