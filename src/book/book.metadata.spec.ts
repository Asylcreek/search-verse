import {
  BIBLE_BOOKS,
  buildDisplayReference,
  getBookMetadata,
} from './book.metadata';

describe('books metadata', () => {
  it('keeps the Protestant canon in canonical order', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(BIBLE_BOOKS[0]).toMatchObject({
      id: 'GEN',
      name: 'Genesis',
      testament: 'OT',
      position: 1,
    });
    expect(BIBLE_BOOKS[65]).toMatchObject({
      id: 'REV',
      name: 'Revelation',
      testament: 'NT',
      position: 66,
    });
  });

  it('includes exact verse counts for representative chapters', () => {
    expect(getBookMetadata('GEN')?.chapters[0]).toEqual({
      number: 1,
      verses: 31,
    });
    expect(getBookMetadata('PSA')?.chapters[118]).toEqual({
      number: 119,
      verses: 176,
    });
    expect(getBookMetadata('JHN')?.chapters[2]).toEqual({
      number: 3,
      verses: 36,
    });
  });

  it('builds readable references from canonical verse fields', () => {
    expect(buildDisplayReference('GEN', 1, 1, 'GEN.1.1')).toBe('Genesis 1:1');
    expect(buildDisplayReference('1KI', 2, 3, '1KI.2.3')).toBe('1 Kings 2:3');
  });

  it('falls back to the canonical reference when metadata is missing', () => {
    expect(buildDisplayReference('UNKNOWN', 1, 1, 'UNKNOWN.1.1')).toBe(
      'UNKNOWN.1.1'
    );
  });
});
