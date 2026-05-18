import { Test, TestingModule } from '@nestjs/testing';

import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

describe('TranslationController', () => {
  const translations = [
    {
      id: 'de4e12af7f28f599-02',
      abbreviation: 'WEB',
      name: 'World English Bible',
      language: 'English',
      copyright: 'Public Domain',
      last_synced_at: new Date('2026-05-18T00:00:00.000Z'),
      created_at: new Date('2026-05-18T00:00:00.000Z'),
      updated_at: new Date('2026-05-18T00:10:00.000Z'),
    },
  ];
  const service = {
    findAll: jest.fn().mockResolvedValue(translations),
    findOne: jest.fn(),
  };

  let controller: TranslationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationController],
      providers: [{ provide: TranslationService, useValue: service }],
    }).compile();

    controller = module.get(TranslationController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates to TranslationService.findAll', async () => {
    await expect(controller.findAll()).resolves.toBe(translations);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('delegates to TranslationService.findOne', async () => {
    const translation = translations[0];
    service.findOne.mockResolvedValueOnce(translation);

    await expect(controller.findOne('de4e12af7f28f599-02')).resolves.toBe(
      translation
    );
    expect(service.findOne).toHaveBeenCalledWith('de4e12af7f28f599-02');
  });
});
