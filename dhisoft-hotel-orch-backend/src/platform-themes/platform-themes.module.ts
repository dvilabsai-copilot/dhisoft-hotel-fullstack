import { Module } from '@nestjs/common';
import { PlatformThemesController } from './platform-themes.controller';
import { PlatformThemesService } from './platform-themes.service';

@Module({
  controllers: [PlatformThemesController],
  providers: [PlatformThemesService],
})
export class PlatformThemesModule {}
