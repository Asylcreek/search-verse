import { Controller, Get, Param, Query } from '@nestjs/common';

import { VerseTranslationsQueryDto } from './dto/verse-translations-query.dto';
import { VerseService } from './verse.service';
import { VerseComparisonResponse } from './verse.types';

@Controller('verses')
export class VerseController {
  constructor(private readonly verseService: VerseService) {}

  @Get(':reference')
  findByReference(
    @Param('reference') reference: string,
    @Query() query: VerseTranslationsQueryDto
  ): Promise<VerseComparisonResponse> {
    return this.verseService.findByReference(reference, query.translations);
  }
}
