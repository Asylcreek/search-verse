import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  type Testament,
  testamentEnum,
} from '../../database/schema/books.schema';

export class SearchQueryDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString({ message: 'q must be a string' })
  @IsNotEmpty({ message: 'q is required' })
  q: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .split(',')
      .map((abbreviation) => abbreviation.trim())
      .filter(Boolean)
  )
  @IsArray({ message: 'abbreviations must be a comma-separated list' })
  @ArrayNotEmpty({ message: 'abbreviations cannot be empty' })
  @IsString({ each: true, message: 'each abbreviation must be a string' })
  @IsNotEmpty({ message: 'abbreviations is required' })
  abbreviations: string[];

  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit: number = 20;

  @IsOptional()
  @IsEnum(testamentEnum.enumValues, {
    message: 'testament must be one of: OT, NT',
  })
  testament?: Testament;

  @IsOptional()
  @IsString({ message: 'book must be a string' })
  book?: string;
}
