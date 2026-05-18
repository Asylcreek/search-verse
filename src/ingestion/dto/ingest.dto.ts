import { IsNotEmpty, IsString } from 'class-validator';

export class IngestDto {
  @IsString()
  @IsNotEmpty()
  bibleId: string;
}
