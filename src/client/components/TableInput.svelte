<script lang="ts">
	import SetInput from './SetInput.svelte';
	import SubtleInput from './SubtleInput.svelte';

	export let table: ITable<string>;

	let _: boolean = false;

	function forceRerender(fn: () => void): () => void {
		return () => {
			fn();
			_ = !_;
		};
	}

	function patchCols(): void {
		const from = Object.keys(table.cols).find((col) => !table.names.includes(col));
		const to = table.names.find((col) => !(col in table.cols));

		if (table.names.reduce((count, col) => (col === to ? count + 1 : count), 0) === 1 && from !== undefined && to !== undefined) {
			console.log('from', from, 'to', to, table.names, table.cols);
			table.cols[to] = table.cols[from];
			delete table.cols[from];
		}
	}

	function listenRerender<T>(val: T, _: any): T {
		return val;
	}

	function getNewCol(): string {
		let i = 0;
		while (true) {
			let col = '';

			let n = i;
			do {
				const c = String.fromCharCode(65 + (n % 26));

				col = c + col;
				n %= 26;
			} while (n > 20);

			if (table.names.includes(col)) {
				i++;
			} else {
				return col;
			}
		}
	}
</script>

<div class="table-wrapper">
	<table>
		<thead>
			<tr>
				{#each listenRerender(new Array(table.names.length), _) as __, i}
					<th scope="col" class:pkey={table.pkey.includes(table.names[i])}>
						<SubtleInput bind:value={table.names[i]} on:input={patchCols} />
					</th>
				{/each}
				<th scope="col">
					<button on:click={forceRerender(() => table.addCol(getNewCol(), new Array(table.length).fill('')))}>+</button>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each listenRerender(new Array(table.length), _) as __, i}
				<tr>
					{#each listenRerender(table.names, _) as colName}
						<td>
							<SubtleInput bind:value={table.cols[colName][i]} />
						</td>
					{/each}
				</tr>
			{/each}
			<tr>
				<td>
					<button on:click={forceRerender(() => table.insert([Object.fromEntries(table.names.map((col) => [col, '']))]))}>+</button>
				</td>
			</tr>
		</tbody>
	</table>
</div>
<div>
	<h3>PKey:</h3>
	<SetInput bind:value={table.pkey} />
</div>

<style>
	.table-wrapper {
		overflow: auto;
	}

	td {
		white-space: nowrap;
	}

	th.pkey {
		text-decoration: underline;
	}
</style>
