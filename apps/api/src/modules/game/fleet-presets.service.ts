import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShipType } from '@arborisis/shared';
import type { CreateFleetPresetDto, FleetPresetView } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAX_PRESETS = 10;

@Injectable()
export class FleetPresetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<FleetPresetView[]> {
    const presets = await this.prisma.fleetPreset.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return presets.map((p) => ({
      id: p.id,
      name: p.name,
      ships: p.ships as Partial<Record<ShipType, number>>,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async create(userId: string, dto: CreateFleetPresetDto): Promise<FleetPresetView> {
    const count = await this.prisma.fleetPreset.count({ where: { userId } });
    if (count >= MAX_PRESETS) {
      throw new BadRequestException(`Maximum ${MAX_PRESETS} presets autorisés.`);
    }

    const validShips: Partial<Record<ShipType, number>> = {};
    for (const [key, qty] of Object.entries(dto.ships)) {
      if (Object.values(ShipType).includes(key as ShipType) && typeof qty === 'number' && qty > 0) {
        validShips[key as ShipType] = qty;
      }
    }
    if (Object.keys(validShips).length === 0) {
      throw new BadRequestException('Le preset doit contenir au moins un type de vaisseau.');
    }

    const preset = await this.prisma.fleetPreset.create({
      data: { userId, name: dto.name, ships: validShips },
    });
    return {
      id: preset.id,
      name: preset.name,
      ships: preset.ships as Partial<Record<ShipType, number>>,
      createdAt: preset.createdAt.toISOString(),
    };
  }

  async update(
    userId: string,
    id: string,
    dto: Partial<CreateFleetPresetDto>,
  ): Promise<FleetPresetView> {
    const preset = await this.prisma.fleetPreset.findUnique({ where: { id } });
    if (!preset || preset.userId !== userId) throw new NotFoundException('Preset introuvable.');

    const data: { name?: string; ships?: Partial<Record<ShipType, number>> } = {};
    if (dto.name) data.name = dto.name;
    if (dto.ships) {
      const validShips: Partial<Record<ShipType, number>> = {};
      for (const [key, qty] of Object.entries(dto.ships)) {
        if (
          Object.values(ShipType).includes(key as ShipType) &&
          typeof qty === 'number' &&
          qty > 0
        ) {
          validShips[key as ShipType] = qty;
        }
      }
      data.ships = validShips;
    }

    const updated = await this.prisma.fleetPreset.update({ where: { id }, data });
    return {
      id: updated.id,
      name: updated.name,
      ships: updated.ships as Partial<Record<ShipType, number>>,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async delete(userId: string, id: string): Promise<void> {
    const preset = await this.prisma.fleetPreset.findUnique({ where: { id } });
    if (!preset || preset.userId !== userId) throw new NotFoundException('Preset introuvable.');
    await this.prisma.fleetPreset.delete({ where: { id } });
  }
}
