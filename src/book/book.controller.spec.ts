import { Test, TestingModule } from '@nestjs/testing';

import { BooksController } from './book.controller';
import { BooksService } from './book.service';

describe('BooksController', () => {
  const books = [
    {
      id: 'GEN',
      name: 'Genesis',
      testament: 'OT',
      position: 1,
      chapters: [{ number: 1, verses: 31 }],
    },
  ];
  const service = {
    get: jest.fn().mockReturnValue(books),
  };

  let controller: BooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: service }],
    }).compile();

    controller = module.get(BooksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates to BooksService.get', () => {
    expect(controller.get()).toBe(books);
    expect(service.get).toHaveBeenCalledTimes(1);
  });
});
