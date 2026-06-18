import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { BuildingType } from '@arborisis/shared';
import { AppModule } from '../src/app.module';

/**
 * Test e2e du parcours principal : inscription → session → planète → construction.
 * Nécessite PostgreSQL et Redis accessibles (voir docker-compose / CI).
 */
describe('Arborisis API (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let planetId: string;

  const email = `e2e_${Date.now()}@arborisis.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('inscrit un nouveau joueur et pose les cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, username: `e2e${Date.now() % 100000}`, password: 'motdepasse-e2e' })
      .expect(201);

    expect(res.body.user.email).toBe(email);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const access = setCookie.find((c) => c.startsWith('access_token='));
    expect(access).toBeDefined();
    cookie = access!.split(';')[0]!;
  });

  it('retourne le joueur courant via /auth/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.user.email).toBe(email);
  });

  it('possède un Noyau-Monde', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/planets')
      .set('Cookie', cookie)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const home = res.body.find((p: { isHomeworld: boolean }) => p.isHomeworld);
    expect(home).toBeDefined();
    planetId = home.id;
  });

  it('lance la construction d’une Canopée Photosynthétique', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/buildings')
      .set('Cookie', cookie)
      .send({ planetId, type: BuildingType.PHOTOSYNTHETIC_CANOPY })
      .expect(201);
    expect(res.body.targetLevel).toBe(1);
    expect(res.body.finishesAt).toBeDefined();
  });

  it('refuse une seconde construction simultanée (409)', async () => {
    await request(app.getHttpServer())
      .post('/api/buildings')
      .set('Cookie', cookie)
      .send({ planetId, type: BuildingType.BIOMASS_SYNTHESIZER })
      .expect(409);
  });

  it('rejette une requête non authentifiée (401)', async () => {
    await request(app.getHttpServer()).get('/api/planets').expect(401);
  });
});
