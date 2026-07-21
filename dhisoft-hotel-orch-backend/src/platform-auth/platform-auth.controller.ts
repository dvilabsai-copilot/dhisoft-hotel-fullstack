import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformAuthService } from './platform-auth.service';

@ApiTags('platform-auth')
@Controller('platform-auth')
export class PlatformAuthController {
  constructor(private readonly service: PlatformAuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.service.login(dto.email, dto.password);
  }
}
