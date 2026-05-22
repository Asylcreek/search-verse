<script lang="ts">
	import { Select, SelectItem } from '$lib/components/ui/select';
	import { books, chapters, verses } from '$lib/mock-data';

	type VerseSelection = {
		book: string;
		chapter: string;
		verse: string;
	};

	let { onChange }: { onChange?: CallableFunction } = $props();

	let book = $state('John');
	let chapter = $state('3');
	let verse = $state('16');
	let bookSearch = $state('');
	let chapterSearch = $state('');
	let verseSearch = $state('');

	const displayReference = $derived(book && chapter && verse ? `${book} ${chapter}:${verse}` : '');
	const bookItems = $derived(books.map((option) => ({ value: option, label: option })));
	const chapterItems = $derived(chapters.map((option) => ({ value: option, label: option })));
	const verseItems = $derived(verses.map((option) => ({ value: option, label: option })));
	const filteredBooks = $derived(filterOptions(books, bookSearch));
	const filteredChapters = $derived(filterOptions(chapters, chapterSearch));
	const filteredVerses = $derived(filterOptions(verses, verseSearch));

	function filterOptions(options: string[], search: string) {
		const query = search.trim().toLowerCase();

		if (!query) {
			return options;
		}

		return options.filter((option) => option.toLowerCase().includes(query));
	}

	function isValidSelection(selection: VerseSelection) {
		return Boolean(selection.book && selection.chapter && selection.verse);
	}

	function emitChange(selection: VerseSelection) {
		if (isValidSelection(selection)) {
			onChange?.(selection);
		}
	}

	function selectBook(value: string) {
		book = value;
		chapter = '';
		verse = '';
		bookSearch = '';
		chapterSearch = '';
		verseSearch = '';
	}

	function selectChapter(value: string) {
		chapter = value;
		verse = '';
		chapterSearch = '';
		verseSearch = '';
	}

	function selectVerse(value: string) {
		verse = value;
		verseSearch = '';
		emitChange({ book, chapter, verse: value });
	}
</script>

<div class="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_8rem]">
	<div class="grid gap-2">
		<label
			for="book-combobox"
			class="cursor-pointer text-xs text-stone-500 uppercase dark:text-stone-400"
		>
			Book
		</label>
		<Select
			type="single"
			value={book}
			inputValue={bookSearch || book}
			allowDeselect={false}
			items={bookItems}
			bind:search={bookSearch}
			onValueChange={(value) => selectBook(value)}
			onOpenChangeComplete={(open) => {
				if (!open) bookSearch = '';
			}}
		>
			{#snippet input({ props })}
				<input
					{...props}
					id="book-combobox"
					placeholder="Book"
					class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
				/>
			{/snippet}
			{#each filteredBooks as option (option)}
				<SelectItem
					value={option}
					label={option}
					itemClass={option === book ? 'font-semibold' : ''}
				/>
			{/each}
		</Select>
	</div>

	<div class="grid gap-2">
		<label
			for="chapter-combobox"
			class="cursor-pointer text-xs text-stone-500 uppercase dark:text-stone-400"
		>
			Chapter
		</label>
		<Select
			type="single"
			value={chapter}
			inputValue={chapterSearch || chapter}
			allowDeselect={false}
			items={chapterItems}
			bind:search={chapterSearch}
			onValueChange={(value) => selectChapter(value)}
			onOpenChangeComplete={(open) => {
				if (!open) chapterSearch = '';
			}}
		>
			{#snippet input({ props })}
				<input
					{...props}
					id="chapter-combobox"
					placeholder="Chapter"
					class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
				/>
			{/snippet}
			{#each filteredChapters as option (option)}
				<SelectItem
					value={option}
					label={option}
					itemClass={option === chapter ? 'font-semibold' : ''}
				/>
			{/each}
		</Select>
	</div>

	<div class="grid gap-2">
		<label
			for="verse-combobox"
			class="cursor-pointer text-xs text-stone-500 uppercase dark:text-stone-400"
		>
			Verse
		</label>
		<Select
			type="single"
			value={verse}
			inputValue={verseSearch || verse}
			allowDeselect={false}
			items={verseItems}
			bind:search={verseSearch}
			onValueChange={(value) => selectVerse(value)}
			onOpenChangeComplete={(open) => {
				if (!open) verseSearch = '';
			}}
		>
			{#snippet input({ props })}
				<input
					{...props}
					id="verse-combobox"
					placeholder="Verse"
					class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
				/>
			{/snippet}
			{#each filteredVerses as option (option)}
				<SelectItem
					value={option}
					label={option}
					itemClass={option === verse ? 'font-semibold' : ''}
				/>
			{/each}
		</Select>
	</div>
</div>

<span class="sr-only">{displayReference || 'Choose a verse'}</span>
