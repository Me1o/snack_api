import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { preferences } from './entities/preferences.entity';
import { env } from 'node:process';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreference(userId: number) {
    const preferences = await this.prisma.preferences.findFirst({
      where: { userId: userId },
    });
    return preferences;
  }

  async createOrUpdatePreference(dto: preferences, userId: number) {
    const preferences = await this.getPreference(userId);
    if (preferences) {
      await this.prisma.preferences.update({
        where: { id: preferences.id },
        data: {
          politics: JSON.stringify(dto.politics),
          sports: JSON.stringify(dto.sports),
          economics: JSON.stringify(dto.economics),
          entertainment: JSON.stringify(dto.entertainment),
          legal: JSON.stringify(dto.legal),
          culture: JSON.stringify(dto.culture),
          business: JSON.stringify(dto.business),
          science: JSON.stringify(dto.science),
          technology: JSON.stringify(dto.technology),
          general: JSON.stringify(dto.general),
        },
      });
    } else {
      return await this.prisma.preferences.create({
        data: {
          userId: userId,
          politics: JSON.stringify(dto.politics),
          sports: JSON.stringify(dto.sports),
          economics: JSON.stringify(dto.economics),
          entertainment: JSON.stringify(dto.entertainment),
          legal: JSON.stringify(dto.legal),
          culture: JSON.stringify(dto.culture),
          business: JSON.stringify(dto.business),
          science: JSON.stringify(dto.science),
          technology: JSON.stringify(dto.technology),
          general: JSON.stringify(dto.general),
        },
      });
    }
  }
}
