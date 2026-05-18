import { Test, TestingModule } from '@nestjs/testing';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  const response = {
    totalDocuments: 0,
    totalPages: 1,
    currentPage: 1,
    numOfResults: 0,
    data: [],
  };
  const service = {
    search: jest.fn().mockResolvedValue(response),
  };

  let controller: SearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: service }],
    }).compile();

    controller = module.get(SearchController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates search queries to SearchService', async () => {
    const query = {
      q: 'patience',
      abbreviations: ['engKJV'],
      page: 1,
      limit: 10,
    };

    await expect(controller.search(query)).resolves.toBe(response);
    expect(service.search).toHaveBeenCalledWith(query);
  });
});
