import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SearchQueryDto } from './search-query.dto';

describe('SearchQueryDto', () => {
  it('defaults pagination when page and limit are omitted', async () => {
    const dto = plainToInstance(SearchQueryDto, {
      q: 'love is patient',
      abbreviations: 'NLT,engKJV',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.abbreviations).toEqual(['NLT', 'engKJV']);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('accepts optional book and valid testament filters', async () => {
    const dto = plainToInstance(SearchQueryDto, {
      q: 'love',
      abbreviations: 'engKJV',
      book: 'UNKNOWN',
      testament: 'NT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.book).toBe('UNKNOWN');
    expect(dto.testament).toBe('NT');
  });

  it('rejects invalid testament filters before querying', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform(
        {
          q: 'love',
          abbreviations: 'engKJV',
          testament: 'jk',
        },
        { type: 'query', metatype: SearchQueryDto }
      )
    ).rejects.toMatchObject({
      response: {
        message: ['testament must be one of: OT, NT'],
      },
    });
  });

  it('keeps book and testament filters through the global validation pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    const dto = await pipe.transform(
      {
        q: 'love',
        abbreviations: 'engKJV',
        book: 'JHN',
        testament: 'NT',
      },
      { type: 'query', metatype: SearchQueryDto }
    );

    expect(dto).toMatchObject({
      book: 'JHN',
      testament: 'NT',
    });
  });
});
