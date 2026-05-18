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
      last_synced_at: new Date('2026-05-18T00:00:00.000Z'),
    },
  ];
  const service = {
    findAll: jest.fn().mockResolvedValue(translations),
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
});
