<script lang="ts">
	import SubtleInput from './SubtleInput.svelte';

	export let value: string[];
</script>

<div class="row main">
	&lbrace;
	{#if value.length > 0}
		<span>
			<SubtleInput bind:value={value[0]} />
		</span>
		{#each new Array(value.length - 1) as _, i}
			<span>
				,<SubtleInput bind:value={value[i + 1]} />
			</span>
		{/each}
	{/if}
	<button class="subtle-button" on:click={() => (value = value.concat(''))}>+</button>
	&rbrace;
</div>

<style>
	.main {
		width: fit-content;
		line-height: 1rem;
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}

	.subtle-button {
		display: none;
		height: 0.8rem;
		padding: 0.1rem 0.2rem;
		font-size: 0.8rem;
		box-sizing: content-box;
		margin: 0;
		line-height: 0.8rem;
	}

	.main:hover .subtle-button {
		display: block;
	}
</style>
