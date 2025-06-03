import { Module } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PreferencesController],
  providers: [PreferencesService, PrismaService],
})
export class PreferencesModule {}
