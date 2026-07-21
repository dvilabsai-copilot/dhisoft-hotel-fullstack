import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
@Module({
  imports:[PassportModule, JwtModule.registerAsync({ imports:[ConfigModule], inject:[ConfigService], useFactory:(c:ConfigService)=>({ secret:c.get<string>('JWT_SECRET') ?? 'dev-secret-change-me', signOptions:{ expiresIn:c.get<string>('JWT_EXPIRES_IN') ?? '8h' } }) })],
  controllers:[AuthController], providers:[AuthService,JwtStrategy], exports:[AuthService]
}) export class AuthModule {}
