import { Test, TestingModule } from '@nestjs/testing';

import { VerseTranslationsQueryDto } from './dto/verse-translations-query.dto';
import { VerseController } from './verse.controller';
import { VerseService } from './verse.service';

describe('VerseController', () => {
  const response = {
    reference: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    verse: 16,
    translations: [],
  };
  const service = {
    findByReference: jest.fn().mockResolvedValue(response),
  };

  let controller: VerseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerseController],
      providers: [{ provide: VerseService, useValue: service }],
    }).compile();

    controller = module.get(VerseController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates raw reference and parsed translations to VerseService', async () => {
    const query: VerseTranslationsQueryDto = {
      translations: ['KJV', 'NLT'],
    };

    await expect(controller.findByReference('JHN.3.16', query)).resolves.toBe(
      response
    );
    expect(service.findByReference).toHaveBeenCalledWith('JHN.3.16', [
      'KJV',
      'NLT',
    ]);
  });
});
