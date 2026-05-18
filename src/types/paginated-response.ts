export interface PaginatedResponse<T> {
  totalDocuments: number;
  totalPages: number;
  currentPage: number;
  numOfResults: number;
  data: T[];
}
