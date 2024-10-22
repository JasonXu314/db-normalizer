<script lang="ts">
	import SetInput from './SetInput.svelte';

	export let fd: FD,
		mvd: boolean = false;
</script>

<div class="row main">
	<SetInput bind:value={fd.determinant} />
	{#if mvd}
		<span>&twoheadrightarrow;</span>
	{:else}
		<span>&rightarrow;</span>
	{/if}
	<SetInput bind:value={fd.dependent} />
</div>

<style>
	.main {
		width: fit-content;
		align-items: center;
		gap: 0.4rem;
	}

	.main span {
		margin: 0;
	}
</style>
