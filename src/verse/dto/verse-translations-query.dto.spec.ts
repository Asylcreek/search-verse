import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { VerseTranslationsQueryDto } from './verse-translations-query.dto';

describe('VerseTranslationsQueryDto', () => {
  it('parses comma-separated translation abbreviations', async () => {
    const dto = plainToInstance(VerseTranslationsQueryDto, {
      translations: 'KJV, NLT,AMP',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.translations).toEqual(['KJV', 'NLT', 'AMP']);
  });

  it('rejects a missing translations query', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform({}, { type: 'query', metatype: VerseTranslationsQueryDto })
    ).rejects.toMatchObject({
      response: {
        message: expect.arrayContaining(['translations is required']),
      },
    });
  });

  it('rejects an empty translations query', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform(
        { translations: ' , ' },
        { type: 'query', metatype: VerseTranslationsQueryDto }
      )
    ).rejects.toMatchObject({
      response: {
        message: ['translations cannot be empty'],
      },
    });
  });
});
