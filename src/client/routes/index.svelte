<script lang="ts">
	import { Workbook } from 'exceljs';
	import { type ChangeEventHandler } from 'svelte/elements';
	import DataTable from '../components/DataTable.svelte';
	import FDInput from '../components/FDInput.svelte';
	import SetInput from '../components/SetInput.svelte';
	import { normalize } from '../utils/normalizations';
	import { readSheet } from '../utils/utils';

	let tableNominees: NF0Table[] | null = null,
		startingTable: NF0Table | null = null,
		error: string | null = null,
		fds: FD[] = [];

	const readFile: ChangeEventHandler<HTMLInputElement> = (evt) => {
		const files = (evt.target as HTMLInputElement).files;

		const workbook = new Workbook();
		const file = files.item(0);

		file.arrayBuffer().then((buf) =>
			workbook.xlsx.load(buf).then((book) => {
				const sheets = book.worksheets;

				if (sheets.length === 1) {
					const tables: NF0Table[] = readSheet(sheets[0]);

					if (tables.length > 1) {
						tableNominees = tables;
					} else {
						[startingTable] = tables;
					}
				} else {
					console.log(sheets);
				}
			})
		);
	};

	function selectTable(): void {
		if (tableNominees && startingTable) {
			if (startingTable.pkey.length > 0) {
				tableNominees = null;
			} else {
				error = 'Primary key must have at least 1 attribute';
			}
		} else {
			error = 'Select a starting table';
		}
	}
</script>

<input type="file" on:change={readFile} />

{#if startingTable}
	<DataTable table={startingTable} />

	<div class="fds">
		<h2>Input FDs</h2>
		{#each fds as fd}
			<FDInput bind:fd />
		{/each}
		<button on:click={() => (fds = [...fds, { dependent: [], determinant: [] }])}>Add FD</button>
	</div>

	<button on:click={() => console.log(normalize([startingTable], [], '1NF'))}>1NF Normalization</button>
{/if}

<dialog open={tableNominees !== null}>
	<article>
		<header>
			<h1>Select Starting Table</h1>
		</header>
		{#if tableNominees !== null}
			{#each tableNominees as table}
				<label class="table-choice">
					<div class="row">
						<input type="radio" bind:group={startingTable} value={table} />
						<DataTable {table} />
					</div>
				</label>
			{/each}
		{/if}

		{#if startingTable}
			Primary Key: <SetInput bind:value={startingTable.pkey} />
		{/if}

		{#if error !== null}
			<p class="error">{error}</p>
		{/if}
		<button on:click={selectTable}>Select</button>
	</article>
</dialog>

<style>
	.table-choice {
		width: 100%;
		padding: 0.1em 0.2em;
	}

	.table-choice input {
		flex-shrink: 0;
	}

	.table-choice .row {
		align-items: center;
	}

	.fds {
		margin-bottom: 0.5rem;
	}
</style>
