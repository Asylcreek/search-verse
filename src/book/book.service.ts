import { Injectable } from '@nestjs/common';

import { BIBLE_BOOKS } from './book.metadata';
import { BookMetadata } from './book.types';

@Injectable()
export class BooksService {
  get(): BookMetadata[] {
    return BIBLE_BOOKS;
  }
}
