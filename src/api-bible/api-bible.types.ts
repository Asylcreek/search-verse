export interface ApiBibleBible {
  id: string;
  abbreviation: string;
  abbreviationLocal: string;
  name: string;
  nameLocal: string;
  copyright: string;
  language: {
    id: string;
    name: string;
    nameLocal: string;
    script: string;
    scriptCode: string;
  };
}

export interface ApiBibleBook {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

export interface ApiBibleChapterSummary {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

export interface ApiBibleVerseSummary {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

export interface ApiBibleVerse {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
  content: string;
}
