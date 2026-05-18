import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

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

  @Transform(({ value }) => (value === undefined ? 10 : Number(value)))
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit: number = 10;
}
