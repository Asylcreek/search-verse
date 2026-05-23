<script lang="ts">
	import { createSearchParamsSchema, useSearchParams } from 'runed/kit';

	import { Select, SelectItem } from '$lib/components/ui/select';
	import { createBooksQuery } from '$lib/queries/searchverse';

	let {
		value = $bindable('')
	}: {
		value?: string;
	} = $props();

	const searchParams = useSearchParams(
		createSearchParamsSchema({
			book: { type: 'string', default: '' },
			chapter: { type: 'number', default: 0 },
			verse: { type: 'number', default: 0 }
		}),
		{ noScroll: true, pushHistory: false }
	);
	const booksQuery = createBooksQuery();

	let bookSearch = $state('');
	let chapterSearch = $state('');
	let verseSearch = $state('');

	const books = $derived(booksQuery.data ?? []);
	const selectedBook = $derived(books.find((option) => option.name === searchParams.book));
	const selectedChapter = $derived(
		selectedBook?.chapters.find((option) => option.number === searchParams.chapter)
	);
	const bookItems = $derived(books.map((option) => ({ value: option.name, label: option.name })));
	const chapterOptions = $derived(
		selectedBook?.chapters.map((option) => String(option.number)) ?? []
	);
	const verseOptions = $derived(
		selectedChapter
			? Array.from({ length: selectedChapter.verses }, (_, index) => String(index + 1))
			: []
	);
	const chapterItems = $derived(chapterOptions.map((option) => ({ value: option, label: option })));
	const verseItems = $derived(verseOptions.map((option) => ({ value: option, label: option })));
	const filteredBooks = $derived(
		filterOptions(
			books.map((option) => option.name),
			bookSearch
		)
	);
	const filteredChapters = $derived(filterOptions(chapterOptions, chapterSearch));
	const filteredVerses = $derived(filterOptions(verseOptions, verseSearch));
	const chapterValue = $derived(searchParams.chapter > 0 ? String(searchParams.chapter) : '');
	const verseValue = $derived(searchParams.verse > 0 ? String(searchParams.verse) : '');
	const reference = $derived(
		selectedBook &&
			selectedChapter &&
			searchParams.verse > 0 &&
			searchParams.verse <= selectedChapter.verses
			? `${selectedBook.id}.${selectedChapter.number}.${searchParams.verse}`
			: ''
	);

	$effect(() => {
		if (value !== reference) {
			value = reference;
		}
	});

	function filterOptions(options: string[], search: string) {
		const query = search.trim().toLowerCase();

		if (!query) {
			return options;
		}

		return options.filter((option) => option.toLowerCase().includes(query));
	}

	function selectBook(value: string) {
		searchParams.update({ book: value, chapter: 0, verse: 0 });
		bookSearch = '';
		chapterSearch = '';
		verseSearch = '';
	}

	function selectChapter(value: string) {
		searchParams.update({
			book: searchParams.book,
			chapter: Number(value),
			verse: 0
		});
		chapterSearch = '';
		verseSearch = '';
	}

	function selectVerse(value: string) {
		searchParams.update({
			book: searchParams.book,
			chapter: searchParams.chapter,
			verse: Number(value)
		});
		verseSearch = '';
	}
</script>

{#if booksQuery.isLoading}
	<div class="text-center text-sm text-stone-500 dark:text-stone-400">Loading books...</div>
{:else if booksQuery.isError}
	<div
		class="grid justify-items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-300"
	>
		<div>Books failed to load.</div>
		<button
			type="button"
			class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
			onclick={() => booksQuery.refetch()}
		>
			Retry
		</button>
	</div>
{:else}
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
				value={searchParams.book}
				inputValue={bookSearch || searchParams.book}
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
						itemClass={option === searchParams.book ? 'font-semibold' : ''}
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
				value={chapterValue}
				inputValue={chapterSearch || chapterValue}
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
						disabled={!selectedBook}
						class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 disabled:opacity-50 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
					/>
				{/snippet}
				{#each filteredChapters as option (option)}
					<SelectItem
						value={option}
						label={option}
						itemClass={option === chapterValue ? 'font-semibold' : ''}
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
				value={verseValue}
				inputValue={verseSearch || verseValue}
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
						disabled={!selectedChapter}
						class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 disabled:opacity-50 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
					/>
				{/snippet}
				{#each filteredVerses as option (option)}
					<SelectItem
						value={option}
						label={option}
						itemClass={option === verseValue ? 'font-semibold' : ''}
					/>
				{/each}
			</Select>
		</div>
	</div>

	<span class="sr-only">Choose a verse</span>
{/if}
