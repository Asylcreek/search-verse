import { PaginatedResponse } from '../types/paginated-response';

export interface SearchResult {
  reference: string;
  displayReference: string;
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  copyright: string;
}

export type SearchResponse = PaginatedResponse<SearchResult>;
