export interface VerseResult {
	reference?: string;
	text: string;
	translation: string;
	testament?: string;
	copyright: string;
	displayReference?: string;
}

export const compareResults: VerseResult[] = [
	{
		text: 'For God so loved the world, that he gave his only begotten Son...',
		translation: 'KJV',
		copyright: 'King James Version. Public Domain.'
	},
	{
		text: 'For this is how God loved the world: He gave his one and only Son...',
		translation: 'NLT',
		copyright: 'New Living Translation copyright notice appears here.'
	},
	{
		text: 'For God so greatly loved and dearly prized the world, that He gave His only begotten Son...',
		translation: 'AMP',
		copyright: 'Amplified Bible copyright notice appears here.'
	}
];

export const books = ['Genesis', 'Exodus', 'Psalms', 'Matthew', 'John', 'Romans'];
export const chapters = ['1', '2', '3', '4', '5'];
export const verses = ['1', '2', '3', '16', '17'];
