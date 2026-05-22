import { BooksService } from './book.service';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(() => {
    service = new BooksService();
  });

  it('returns the canonical book catalog', () => {
    const books = service.get();

    expect(books).toHaveLength(66);
    expect(books[0]).toMatchObject({
      id: 'GEN',
      name: 'Genesis',
      testament: 'OT',
      position: 1,
    });
    expect(books[65]).toMatchObject({
      id: 'REV',
      name: 'Revelation',
      testament: 'NT',
      position: 66,
    });
  });

  it('returns chapter and verse metadata', () => {
    const genesis = service.get()[0];

    expect(genesis.chapters).toHaveLength(50);
    expect(genesis.chapters[0]).toEqual({ number: 1, verses: 31 });
    expect(genesis.chapters[49]).toEqual({ number: 50, verses: 26 });
  });
});
