import { Controller, Get } from '@nestjs/common';

import { BooksService } from './book.service';
import { BookMetadata } from './book.types';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  get(): BookMetadata[] {
    return this.booksService.get();
  }
}
