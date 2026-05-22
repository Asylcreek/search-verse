<script lang="ts">
	import { Combobox } from 'bits-ui';

	import { cn } from '$lib/utils/cn';

	type Props = Combobox.ItemProps & {
		itemClass?: string;
	};

	let { itemClass, ...props }: Props = $props();
</script>

<Combobox.Item
	class={cn(
		'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 transition-colors outline-none hover:bg-stone-100 data-[highlighted]:bg-stone-100 data-[highlighted]:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-800 dark:data-[highlighted]:bg-stone-800 dark:data-[highlighted]:text-stone-50',
		itemClass
	)}
	{...props}
>
	{#snippet children({ selected })}
		<span class="flex size-3 items-center justify-center">{selected ? '✓' : ''}</span>
		<span>{props.label ?? props.value}</span>
	{/snippet}
</Combobox.Item>
