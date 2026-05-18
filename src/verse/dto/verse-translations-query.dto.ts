import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class VerseTranslationsQueryDto {
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }

    return String(value)
      .split(',')
      .map((abbreviation) => abbreviation.trim())
      .filter(Boolean);
  })
  @ArrayNotEmpty({ message: 'translations cannot be empty' })
  @IsArray({ message: 'translations must be a comma-separated list' })
  @IsString({ each: true, message: 'each translation must be a string' })
  @IsNotEmpty({ message: 'translations is required' })
  translations: string[];
}
