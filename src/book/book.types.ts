import type { Testament } from '../database/schema/books.schema';

export interface BookChapterMetadata {
  number: number;
  verses: number;
}

export interface BookMetadata {
  id: string;
  name: string;
  testament: Testament;
  position: number;
  chapters: BookChapterMetadata[];
}
