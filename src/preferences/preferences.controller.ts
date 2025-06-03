import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { preferences } from './entities/preferences.entity';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('')
  async get(@Req() req) {
    return this.preferencesService.getPreference(req.user.userId);
  }

  @Post('update')
  async update(@Req() req, @Body() dto: preferences) {
    return this.preferencesService.createOrUpdatePreference(
      dto,
      req.user.userId,
    );
  }
}
