<script lang="ts">
	import { Search } from '@lucide/svelte';

	let {
		value = $bindable(''),
		oninput,
		onsubmit
	}: {
		value?: string;
		oninput?: CallableFunction;
		onsubmit: CallableFunction;
	} = $props();

	function submit(event: SubmitEvent) {
		event.preventDefault();
		onsubmit();
	}

	function updateValue(event: Event) {
		oninput?.((event.currentTarget as HTMLInputElement).value);
	}
</script>

<form
	class="mx-auto grid w-full max-w-2xl grid-cols-[1fr_auto] border-2 border-stone-950 bg-white dark:border-stone-50 dark:bg-stone-900"
	onsubmit={submit}
>
	<input
		type="search"
		name="q"
		bind:value
		oninput={updateValue}
		placeholder="Start typing..."
		minlength="1"
		maxlength="160"
		autocomplete="off"
		aria-label="Search verse text"
		spellcheck="false"
		class="min-w-0 bg-transparent px-5 py-4 font-serif text-lg text-stone-950 outline-none placeholder:text-stone-500 dark:text-stone-50"
	/>
	<button
		type="submit"
		class="border-l-2 border-stone-950 bg-stone-950 px-5 text-xs text-stone-50 uppercase dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
	>
		<Search />
	</button>
</form>
