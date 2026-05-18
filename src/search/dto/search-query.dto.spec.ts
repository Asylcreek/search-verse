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
    expect(dto.limit).toBe(10);
  });
});
