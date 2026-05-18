export class TranslationResponseDto {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  copyright: string;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
