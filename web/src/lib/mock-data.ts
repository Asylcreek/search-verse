export interface TranslationOption {
	abbreviation: string;
	name: string;
}

export interface VerseResult {
	reference?: string;
	text: string;
	translation: string;
	testament?: string;
	copyright: string;
}

export const translations: TranslationOption[] = [
	{ abbreviation: 'KJV', name: 'King James Version' },
	{ abbreviation: 'NLT', name: 'New Living Translation' },
	{ abbreviation: 'AMP', name: 'Amplified Bible' },
	{ abbreviation: 'ESV', name: 'English Standard Version' },
	{ abbreviation: 'NIV', name: 'New International Version' },
	{ abbreviation: 'ASV', name: 'American Standard Version' }
];

export const searchResults: VerseResult[] = [
	{
		reference: '1 Corinthians 13:4',
		text: 'Love is patient and kind. Love is not jealous or boastful or proud.',
		translation: 'NLT',
		testament: 'New Testament',
		copyright: 'New Living Translation copyright notice appears here.'
	},
	{
		reference: '1 Corinthians 13:4',
		text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself.',
		translation: 'KJV',
		testament: 'New Testament',
		copyright: 'King James Version. Public Domain.'
	},
	{
		reference: 'Colossians 3:14',
		text: 'Beyond all these things put on love, which is the perfect bond of unity.',
		translation: 'AMP',
		testament: 'New Testament',
		copyright: 'Amplified Bible copyright notice appears here.'
	}
];

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
