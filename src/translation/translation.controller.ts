import { Controller, Get, Param } from '@nestjs/common';

import { TranslationResponseDto } from './dto/translation-response.dto';
import { TranslationService } from './translation.service';

@Controller('translations')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  findAll(): Promise<TranslationResponseDto[]> {
    return this.translationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TranslationResponseDto> {
    return this.translationService.findOne(id);
  }
}
