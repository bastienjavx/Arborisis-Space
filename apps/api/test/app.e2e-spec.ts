import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { BuildingType, ResearchType, ShipType } from '@arborisis/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ExpeditionsService } from '../src/modules/game/expeditions.service';

/**
 * Test e2e du parcours principal : inscription → session → planète → construction.
 * Nécessite PostgreSQL et Redis accessibles (voir docker-compose / CI).
 */
describe('Arborisis API (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let planetId: string;
  let prisma: PrismaService;

  const email = `e2e_${Date.now()}@arborisis.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
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
    const refresh = setCookie.find((c) => c.startsWith('refresh_token='));
    expect(access).toBeDefined();
    expect(refresh).toContain('Path=/api/auth/refresh');
    cookie = [access, refresh].map((value) => value!.split(';')[0]).join('; ');
  });

  it('fait tourner le refresh token et conserve la session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    cookie = setCookie.map((value) => value.split(';')[0]).join('; ');
    expect(res.body.user.email).toBe(email);
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

  it('n’accepte qu’une construction parmi deux requêtes concurrentes', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/api/buildings')
        .set('Cookie', cookie)
        .send({ planetId, type: BuildingType.PHOTOSYNTHETIC_CANOPY }),
      request(app.getHttpServer())
        .post('/api/buildings')
        .set('Cookie', cookie)
        .send({ planetId, type: BuildingType.BIOMASS_SYNTHESIZER }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const accepted = responses.find((response) => response.status === 201)!;
    expect(accepted.body.targetLevel).toBe(1);
    expect(accepted.body.finishesAt).toBeDefined();
  });

  it('rejette une requête non authentifiée (401)', async () => {
    await request(app.getHttpServer()).get('/api/planets').expect(401);
  });

  it('prépare un Berceau orbital et un essaim pour le parcours d’expédition', async () => {
    await prisma.planet.update({
      where: { id: planetId },
      data: { biomass: 50_000, sap: 50_000, minerals: 50_000, spores: 50_000 },
    });
    await prisma.planetBuilding.update({
      where: { planetId_type: { planetId, type: BuildingType.ORBITAL_NURSERY } },
      data: { level: 2 },
    });
    const planet = await prisma.planet.findUniqueOrThrow({ where: { id: planetId } });
    await prisma.researchLevel.update({
      where: { userId_type: { userId: planet.ownerId, type: ResearchType.SPORAL_PROPULSION } },
      data: { level: 1 },
    });
    for (const type of [ShipType.SPORAL_SCOUT, ShipType.SYMBIOTIC_HARVESTER]) {
      await prisma.planetShip.upsert({
        where: { planetId_type: { planetId, type } },
        update: { quantity: 5 },
        create: { planetId, type, quantity: 5 },
      });
    }
  });

  it('n’accepte qu’une production de bio-vaisseaux concurrente', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/api/ships').set('Cookie', cookie).send({
        planetId,
        type: ShipType.SPORAL_SCOUT,
        quantity: 1,
      }),
      request(app.getHttpServer()).post('/api/ships').set('Cookie', cookie).send({
        planetId,
        type: ShipType.SYMBIOTIC_HARVESTER,
        quantity: 1,
      }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it('lance une seule expédition et finalise son retour sans double crédit', async () => {
    const body = {
      planetId,
      target: { galaxy: 1, system: 2 },
      ships: { [ShipType.SPORAL_SCOUT]: 1, [ShipType.SYMBIOTIC_HARVESTER]: 1 },
    };
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/api/expeditions').set('Cookie', cookie).send(body),
      request(app.getHttpServer()).post('/api/expeditions').set('Cookie', cookie).send(body),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const missionId = responses.find((response) => response.status === 201)!.body.id;
    const expeditions = app.get(ExpeditionsService);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1_000);
    await expeditions.advanceMission(missionId, future);
    await expeditions.advanceMission(missionId, future);

    const mission = await prisma.expeditionMission.findUniqueOrThrow({ where: { id: missionId } });
    expect(mission.phase).toBe('COMPLETED');
    expect(await prisma.expeditionReport.count({ where: { missionId } })).toBe(1);
    const reports = await request(app.getHttpServer())
      .get('/api/expeditions/reports')
      .set('Cookie', cookie)
      .expect(200);
    expect(
      reports.body.some((report: { missionId: string }) => report.missionId === missionId),
    ).toBe(true);
  });

  it('révoque toutes les sessions', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout-all')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });
});
