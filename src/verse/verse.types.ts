export interface VerseTranslationResult {
  id: string;
  abbreviation: string;
  text: string;
  copyright: string;
}

export interface VerseComparisonResponse {
  reference: string;
  displayReference: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  translations: VerseTranslationResult[];
}
