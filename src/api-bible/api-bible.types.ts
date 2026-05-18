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

export interface ApiBibleVerseContent {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
  content: ApiBibleContentNode[];
}

export interface ApiBibleContentTextItem {
  text: string;
  tail?: string;
  attrs?: Record<string, string | string[]>;
}

export interface ApiBibleContentNode {
  name: string;
  items?: (ApiBibleContentNode | ApiBibleContentTextItem | null)[];
  attrs?: Record<string, string>;
}

export interface ApiBibleChapterContent {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
  content: ApiBibleContentNode[];
  verseCount: number;
}

export interface ApiBiblePassageContent {
  id: string;
  bibleId: string;
  orgId: string;
  reference: string;
  content: ApiBibleContentNode[];
  verseCount: number;
}

export interface ApiBibleVerseText {
  verseId: string;
  text: string;
  number: string;
}
