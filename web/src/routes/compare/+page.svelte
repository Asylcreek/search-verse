<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { ApiError } from '$lib/api/searchverse';
	import TranslationPills from '$lib/components/translation-pills.svelte';
	import VersePicker from '$lib/components/verse-picker.svelte';
	import VerseResultCard from '$lib/components/verse-result-card.svelte';
	import { createCompareQuery } from '$lib/queries/searchverse';

	let selectedTranslations = $state<string[]>([]);
	let reference = $state('');
	let warnedForReference = '';

	const compareQuery = createCompareQuery({
		reference: () => reference,
		abbreviations: () => selectedTranslations
	});

	$effect(() => {
		warnForMissingTranslations();
	});

	function updateSelectedTranslations(selection: string[]) {
		selectedTranslations = selection;
		warnForMissingTranslations();
	}

	function warnForMissingTranslations() {
		if (!reference || selectedTranslations.length > 0) {
			return;
		}

		if (warnedForReference === reference) {
			return;
		}

		warnedForReference = reference;
		toast.error('Select at least one translation.');
	}

	function compareErrorMessage(error: Error) {
		if (error instanceof ApiError && error.status === 404) {
			return 'Verse not found.';
		}

		return 'Compare failed.';
	}
</script>

<section class="grid gap-6 pt-10">
	<div class="mx-auto max-w-2xl text-center">
		<h1
			class="m-0 font-serif text-4xl leading-tight font-semibold tracking-normal text-stone-950 dark:text-stone-50"
		>
			Compare one verse across various translations.
		</h1>
	</div>

	<VersePicker bind:value={reference} />
	<TranslationPills onChange={updateSelectedTranslations} />

	{#if !reference}
		<div
			class="flex h-80 w-full flex-col justify-center text-center text-sm text-stone-500 dark:text-stone-400"
		>
			Choose a verse to compare.
		</div>
	{:else if selectedTranslations.length === 0}
		<div
			class="flex h-80 w-full flex-col justify-center text-center text-sm text-stone-500 dark:text-stone-400"
		>
			Select at least one translation.
		</div>
	{:else if compareQuery.isLoading}
		<div class="text-center text-sm text-stone-500 dark:text-stone-400">Comparing...</div>
	{:else if compareQuery.isError}
		<div
			class="grid justify-items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-300"
		>
			<div>{compareErrorMessage(compareQuery.error)}</div>
			<button
				type="button"
				class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
				onclick={() => compareQuery.refetch()}
			>
				Retry
			</button>
		</div>
	{:else if compareQuery.data}
		<div class="text-center text-xs text-stone-500 uppercase dark:text-stone-400">
			{compareQuery.data.displayReference}
		</div>

		{#if compareQuery.data.translations.length === 0}
			<div class="text-center text-sm text-stone-500 dark:text-stone-400">
				No selected translations have this verse.
			</div>
		{:else}
			<div class="grid gap-4">
				{#each compareQuery.data.translations as translation (translation.abbreviation)}
					{@const result = {
						text: translation.text,
						translation: translation.abbreviation,
						copyright: translation.copyright
					}}
					<VerseResultCard {result} showReference={false} />
				{/each}
			</div>
		{/if}
	{/if}
</section>
