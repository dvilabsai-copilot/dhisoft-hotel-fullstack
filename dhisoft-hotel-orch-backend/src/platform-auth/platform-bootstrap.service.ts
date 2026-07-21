import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';

const DEFAULT_FEATURES = [
  ['HOTEL_CORE', 'Hotel Core', true],
  ['WEBSITE_BUILDER', 'Website Builder', true],
  ['BOOKING_ENGINE', 'Direct Booking Engine', true],
  ['PAYMENTS', 'Payments', true],
  ['MANUAL_RESERVATIONS', 'Manual Reservations', true],
  ['REPORTS', 'Operational Reports', true],
  ['AXISROOMS', 'AxisRooms Integration', true],
] as const;

@Injectable()
export class PlatformBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureFeatureDefinitions();
    await this.ensureStarterPlan();
    await this.ensureIntegrationProviders();
    await this.ensureRainWoodTheme();
    await this.ensureInitialOwner();
  }

  private async ensureFeatureDefinitions() {
    for (const [key, name, defaultEnabled] of DEFAULT_FEATURES) {
      await this.prisma.featureDefinition.upsert({
        where: { key },
        create: { key, name, defaultEnabled },
        update: {},
      });
    }
  }

  private async ensureStarterPlan() {
    await this.prisma.subscriptionPlan.upsert({
      where: { code: 'STARTER' },
      create: {
        code: 'STARTER',
        name: 'Starter',
        description: 'Local and staging baseline for a single hotel group.',
        billingInterval: 'MONTHLY',
        monthlyPrice: 0,
        annualPrice: 0,
        limits: {
          properties: 5,
          users: 25,
          reservationsPerMonth: 1000,
          storageBytes: 1073741824,
        },
        features: DEFAULT_FEATURES.map(([key]) => key),
        active: true,
      },
      update: {},
    });
  }

  private async ensureIntegrationProviders() {
    const providers = [
      ['AXISROOMS', 'AxisRooms', 'CHANNEL_MANAGER'],
      ['PAYMENTS', 'Payment Gateway', 'PAYMENT'],
      ['EMAIL', 'Transactional Email', 'MESSAGING'],
    ] as const;
    for (const [key, name, category] of providers) {
      await this.prisma.platformIntegrationProvider.upsert({
        where: { key },
        create: {
          key,
          name,
          category,
          enabled: false,
          publicConfig: { mode: 'mock', configured: false },
        },
        update: {},
      });
    }
  }


  private async ensureRainWoodTheme() {
    const theme = await this.prisma.themeCatalogue.upsert({
      where: {
        key_version: {
          key: 'rainwood-heritage',
          version: 1,
        },
      },
      create: {
        key: 'rainwood-heritage',
        version: 1,
        name: 'RainWood Heritage',
        description:
          'Accepted RainWood visual baseline converted into safe, structured hotel website sections.',
        status: 'PUBLISHED',
        config: {
          primaryColor: '#0f3d5f',
          secondaryColor: '#184f78',
          accentColor: '#c99b42',
          headingFont: 'Inter',
          bodyFont: 'Inter',
          buttonStyle: 'pill',
          borderRadius: 'large',
          headerStyle: 'sticky-light',
          footerStyle: 'navy',
        },
        sectionSchema: {
          allowedSections: [
            'hero',
            'booking-search',
            'feature-grid',
            'featured-properties',
            'rooms',
            'offers',
            'gallery',
            'contact',
          ],
          unsafeHtmlAllowed: false,
          maxSectionsPerPage: 50,
          builderMode: 'SECTION_BASED',
        },
        previewUrl: '/?theme=rainwood-heritage',
      },
      update: {},
    });

    const rainwood = await this.prisma.tenant.findUnique({
      where: { slug: 'rainwood' },
      include: {
        themes: {
          where: { active: true },
          take: 1,
        },
      },
    });
    if (rainwood && rainwood.themes.length === 0) {
      await this.prisma.siteTheme.create({
        data: {
          tenantId: rainwood.id,
          catalogueThemeId: theme.id,
          key: 'rainwood-heritage-v1',
          name: theme.name,
          config: theme.config ?? {},
          active: true,
        },
      });
    }
  }

  private async ensureInitialOwner() {
    if ((await this.prisma.platformUser.count()) > 0) return;

    const email = this.config
      .get<string>('PLATFORM_BOOTSTRAP_EMAIL')
      ?.trim()
      .toLowerCase();
    const password = this.config.get<string>('PLATFORM_BOOTSTRAP_PASSWORD');
    const name =
      this.config.get<string>('PLATFORM_BOOTSTRAP_NAME') ??
      'DHISOFT Platform Owner';

    if (!email || !password) {
      this.logger.warn(
        'No platform users exist. Set PLATFORM_BOOTSTRAP_EMAIL and PLATFORM_BOOTSTRAP_PASSWORD to create the initial owner.',
      );
      return;
    }
    if (password.length < 12) {
      this.logger.error(
        'PLATFORM_BOOTSTRAP_PASSWORD must contain at least 12 characters.',
      );
      return;
    }

    await this.prisma.platformUser.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'PLATFORM_OWNER',
        status: 'ACTIVE',
        mfaRequired: true,
      },
    });
    this.logger.log(`Initial platform owner created for ${email}`);
  }
}
