export class TranslationResponseDto {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  last_synced_at: Date | null;
}
