<script lang="ts">
	let {
		open = $bindable(false),
		copyright
	}: {
		open?: boolean;
		copyright: string;
	} = $props();

	function close() {
		open = false;
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 px-4"
		role="presentation"
		onclick={close}
		onkeydown={closeOnEscape}
	>
		<div
			class="w-full max-w-lg border border-stone-300 bg-stone-50 p-6 text-stone-950 shadow-xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
			role="dialog"
			aria-modal="true"
			aria-label="Copyright"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="m-0 font-serif text-2xl">Copyright</h2>
				</div>
				<button
					type="button"
					class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
					onclick={close}
				>
					Close
				</button>
			</div>

			<p class="mt-6 text-sm leading-6 text-stone-700 dark:text-stone-300">{copyright}</p>
		</div>
	</div>
{/if}
