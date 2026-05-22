<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { Combobox, type WithoutChild } from 'bits-ui';
	import type { Snippet } from 'svelte';

	import { cn } from '$lib/utils/cn';

	type Props = Combobox.RootProps & {
		input: Snippet<[{ props: Record<string, unknown> }]>;
		search?: string;
		contentProps?: WithoutChild<Combobox.ContentProps>;
		contentClass?: string;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		search = $bindable(''),
		inputValue = '',
		input,
		contentProps,
		contentClass = '',
		children,
		...restProps
	}: Props = $props();

	function updateSearch(event: Event) {
		search = (event.currentTarget as HTMLInputElement).value;
	}
</script>

<Combobox.Root bind:open inputValue={search || inputValue} {...restProps}>
	<div class="relative">
		<Combobox.Input onfocus={() => (open = true)} oninput={updateSearch}>
			{#snippet child({ props })}
				{@render input({ props })}
			{/snippet}
		</Combobox.Input>

		<Combobox.Trigger
			class="absolute top-1/2 right-3 grid size-5 -translate-y-1/2 place-items-center text-stone-500 dark:text-stone-400"
		>
			<ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
		</Combobox.Trigger>
	</div>

	<Combobox.Portal>
		<Combobox.Content {...contentProps}>
			{#snippet child({ props, wrapperProps })}
				<div {...wrapperProps}>
					<div
						{...props}
						class={cn(
							'z-50 max-h-72 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-auto border border-stone-300 bg-stone-50 shadow-lg outline-none dark:border-stone-700 dark:bg-stone-900',
							contentClass
						)}
					>
						{@render children?.()}
					</div>
				</div>
			{/snippet}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
