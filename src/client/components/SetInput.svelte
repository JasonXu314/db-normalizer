<script lang="ts">
	import SubtleInput from './SubtleInput.svelte';

	export let value: string[];

	const checkComma: (idx: number) => (evt: InputEvent) => void = (idx: number) => {
		return (evt: InputEvent) => {
			if (evt.data === ',') {
				evt.preventDefault();
				value = value.concat('');
				value[idx] = value[idx].slice(0, -1);
			}
		};
	};
</script>

<div class="row main">
	&lbrace;
	{#if value.length > 0}
		<span>
			<SubtleInput bind:value={value[0]} on:input={checkComma(0)} on:paste />
		</span>
		{#each new Array(value.length - 1) as _, i}
			<span>
				,<SubtleInput bind:value={value[i + 1]} on:input={checkComma(i + 1)} />
			</span>
		{/each}
		<span class="plus-comma">,</span>
	{/if}
	<button class="subtle-button" on:click={() => (value = value.concat(''))}>+</button>
	&rbrace;
</div>

<style>
	.main {
		width: fit-content;
		font-size: 1.2rem;
	}

	.main + :global(*) {
		margin-top: 0.5rem;
	}

	.subtle-button {
		display: none;
		height: 0.8rem;
		padding: 0.1rem 0.2rem;
		font-size: 0.8rem;
		box-sizing: content-box;
		margin: 0;
		line-height: 0.8rem;
		margin-top: 0.5rem;
	}

	.plus-comma {
		display: none;
	}

	.main:hover :is(.subtle-button, .plus-comma) {
		display: block;
	}
</style>
