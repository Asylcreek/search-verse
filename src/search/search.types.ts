import { PaginatedResponse } from '../types/paginated-response';

export interface SearchResult {
  reference: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  copyright: string;
}

export type SearchResponse = PaginatedResponse<SearchResult>;
