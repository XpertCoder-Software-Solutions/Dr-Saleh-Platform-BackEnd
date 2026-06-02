import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from './../src/database/prisma.service';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';
import type { AppModule } from './../src/app.module';

type HealthResponseBody = {
  success: boolean;
  data: {
    status: string;
  };
};

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;
  let appModule: typeof AppModule;

  beforeAll(() => {
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/dr_saleh_platform';
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-chars';

    appModule = jest.requireActual<typeof import('./../src/app.module')>(
      './../src/app.module',
    ).AppModule;
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue(1),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as HealthResponseBody;

        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
      });
  });

  afterEach(async () => {
    await app?.close();
  });
});
