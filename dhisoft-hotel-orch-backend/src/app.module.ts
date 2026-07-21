import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { FeatureGuard } from './common/feature.guard';
import { PrismaModule } from './common/prisma.module';
import { TenantMiddleware } from './common/tenant.middleware';
import { HealthModule } from './health/health.module';
import { PropertiesModule } from './properties/properties.module';
import { WebsiteModule } from './website/website.module';
import { AvailabilityModule } from './availability/availability.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { AxisRoomsModule } from './axisrooms/axisrooms.module';
import { MediaModule } from './media/media.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { OffersModule } from './offers/offers.module';
import { UsersModule } from './users/users.module';
import { SupportAccessModule } from './support-access/support-access.module';
import { PlatformAuthModule } from './platform-auth/platform-auth.module';
import { PlatformCommonModule } from './platform-common/platform-common.module';
import { PlatformTenantsModule } from './platform-tenants/platform-tenants.module';
import { PlatformPlansModule } from './platform-plans/platform-plans.module';
import { PlatformFeaturesModule } from './platform-features/platform-features.module';
import { PlatformDomainsModule } from './platform-domains/platform-domains.module';
import { PlatformThemesModule } from './platform-themes/platform-themes.module';
import { PlatformUsersModule } from './platform-users/platform-users.module';
import { PlatformIntegrationsModule } from './platform-integrations/platform-integrations.module';
import { PlatformAuditModule } from './platform-audit/platform-audit.module';
import { PlatformDashboardModule } from './platform-dashboard/platform-dashboard.module';
import { PlatformHealthModule } from './platform-health/platform-health.module';
import { validateEnvironment } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    PlatformCommonModule,
    AuthModule,
    PlatformAuthModule,
    HealthModule,
    PropertiesModule,
    WebsiteModule,
    AvailabilityModule,
    ReservationsModule,
    PaymentsModule,
    ReportsModule,
    AxisRoomsModule,
    MediaModule,
    EnquiriesModule,
    OffersModule,
    UsersModule,
    SupportAccessModule,
    PlatformTenantsModule,
    PlatformPlansModule,
    PlatformFeaturesModule,
    PlatformDomainsModule,
    PlatformThemesModule,
    PlatformUsersModule,
    PlatformIntegrationsModule,
    PlatformAuditModule,
    PlatformDashboardModule,
    PlatformHealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/(.*)', method: RequestMethod.ALL },
        { path: 'platform-auth', method: RequestMethod.ALL },
        { path: 'platform-auth/(.*)', method: RequestMethod.ALL },
        { path: 'platform', method: RequestMethod.ALL },
        { path: 'platform/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
