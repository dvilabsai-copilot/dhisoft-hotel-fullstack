import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformBootstrapService } from './platform-bootstrap.service';
import { PlatformJwtGuard } from './platform-jwt.guard';
import { PlatformJwtStrategy } from './platform-jwt.strategy';
import { PlatformRolesGuard } from './platform-roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('PLATFORM_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('PLATFORM_JWT_EXPIRES_IN') ?? '2h',
          issuer: 'dhisoft-hotel-os',
          audience: 'dhisoft-platform-admin',
        },
      }),
    }),
  ],
  controllers: [PlatformAuthController],
  providers: [
    PlatformAuthService,
    PlatformBootstrapService,
    PlatformJwtStrategy,
    PlatformJwtGuard,
    PlatformRolesGuard,
  ],
  exports: [PlatformJwtGuard, PlatformRolesGuard],
})
export class PlatformAuthModule {}
