<script lang="ts">
	export let value: string;

	let width: number = 24;

	$: {
		if (typeof window !== 'undefined') {
			const span = document.createElement('span');
			span.style.fontFamily = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial';
			span.style.fontSize = '0.8rem';
			span.textContent = value;

			document.body.appendChild(span);
			width = Math.max(span.getBoundingClientRect().width + 2, 24);
			span.remove();
		}
	}
</script>

<input type="text" bind:value style="width: {width}px;" on:input on:paste|preventDefault />

<style>
	input {
		height: 0.8rem;
		padding: 0.1rem 0.2rem;
		font-size: 0.8rem;
		box-sizing: content-box;
		margin: 0;
		line-height: 0.8rem;
	}
</style>
