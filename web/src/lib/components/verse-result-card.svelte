<script lang="ts">
	import CopyrightModal from '$lib/components/copyright-modal.svelte';
	import type { VerseResult } from '$lib/mock-data';

	let {
		result,
		showReference = true
	}: {
		result: VerseResult;
		showReference?: boolean;
	} = $props();

	let copyrightOpen = $state(false);
</script>

<article
	class="grid gap-4 border border-stone-300 bg-white/85 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/85"
>
	{#if showReference && result.displayReference}
		<div class="text-xs text-stone-500 uppercase dark:text-stone-400">
			{result.displayReference}
		</div>
	{/if}

	<p class="m-0 font-serif text-xl leading-relaxed text-stone-950 dark:text-stone-50">
		{result.text}
	</p>

	<footer
		class="flex items-center justify-between gap-4 border-t border-stone-200 pt-3 dark:border-stone-800"
	>
		<div class="flex flex-wrap gap-2 text-xs text-stone-500 dark:text-stone-400">
			<span>{result.translation}</span>
		</div>
		<button
			type="button"
			class="border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700 uppercase hover:border-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
			onclick={() => (copyrightOpen = true)}
		>
			Copyright
		</button>
	</footer>
</article>

<CopyrightModal bind:open={copyrightOpen} copyright={result.copyright} />
