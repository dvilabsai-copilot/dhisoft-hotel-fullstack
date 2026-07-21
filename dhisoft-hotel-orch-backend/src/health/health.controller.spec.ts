import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports a live process without touching the database', () => {
    const controller = new HealthController({} as any);
    expect(controller.live()).toMatchObject({
      status: 'ok',
      service: 'dhisoft-hotel-os',
    });
  });

  it('reports database readiness after SELECT 1 succeeds', async () => {
    const controller = new HealthController({
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as any);

    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ok',
      database: 'ok',
    });
  });

  it('returns a service-unavailable error when the database is down', async () => {
    const controller = new HealthController({
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as any);

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
