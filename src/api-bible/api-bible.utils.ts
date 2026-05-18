export function getVerseNumberFromId(verseId: string): number {
  const firstVerseId = verseId.split('-')[0];
  const verseParts = firstVerseId.split('.');
  const verseNumber = verseParts[verseParts.length - 1] ?? '0';
  return parseInt(verseNumber, 10);
}

export function hasCompositeVerseId(verseId: string): boolean {
  return hasRangeVerseId(verseId) || hasCommaVerseId(verseId);
}

export function hasRangeVerseId(verseId: string): boolean {
  return verseId.includes('-');
}

export function hasCommaVerseId(verseId: string): boolean {
  return verseId.includes(',');
}
