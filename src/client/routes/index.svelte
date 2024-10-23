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
		fds: FD[] = [],
		mvds: FD[] = [],
		normalizedTables: NF1Table[] | null = null,
		viewIdx: number = 0;

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
		error = null;

		if (tableNominees && startingTable) {
			startingTable.names = startingTable.names.filter((col) => !!col);
			startingTable.pkey = startingTable.pkey.filter((key) => !!key);

			if (startingTable.pkey.length > 0) {
				if (startingTable.pkey.every((key) => startingTable.names.includes(key))) {
					tableNominees = null;
				} else {
					error = 'One or more primary keys do not exist in the table';
				}
			} else {
				error = 'Primary key must have at least 1 attribute';
			}
		} else {
			error = 'Select a starting table';
		}
	}

	function pasteFDs(evt: ClipboardEvent, mvds: boolean): FD[] {
		const raw = evt.clipboardData.getData('text');

		return raw
			.split('\n')
			.map((ln) => ln.trim())
			.filter((ln) => !!ln)
			.flatMap((line) => {
				const [determinant, dependent] = line.split(mvds ? /\-+>>/ : /\-+>/).map((part) => part.trim());

				if (dependent === undefined && line.search(mvds ? /\-+>/ : /\-+>>/) !== -1) {
					error = `Looks like you tried to paste in a ${mvds ? 'FD' : 'MVD'} in the ${mvds ? 'MVD' : 'FD'}s section`;
					return [];
				}

				const fd: FD = { dependent: [], determinant: [] };

				if (determinant.startsWith('{') && determinant.endsWith('}')) {
					fd.determinant = determinant
						.slice(1, -1)
						.split(',')
						.map((col) => col.trim());
				} else {
					fd.determinant.push(determinant);
				}

				if (dependent.startsWith('{')) {
					if (dependent.endsWith('}')) {
						fd.dependent = dependent
							.slice(1, -1)
							.split(',')
							.map((col) => col.trim());
					} else {
						let idx = 1,
							col = '';

						while (dependent[idx] !== '}') {
							// not going to consider edge cases because if u put {, ,}, you're really stupid
							if (dependent[idx] === ',') {
								fd.dependent.push(col.trim());
								col = '';
								idx++;
							} else {
								col += dependent[idx];
								idx++;
							}
						}

						if (col.trim() !== '') {
							fd.dependent.push(col.trim());
						}
					}
				} else {
					if (!mvds) {
						let idx = 0,
							col = '';

						while (dependent[idx].trim() !== '') {
							col += dependent[idx];
							idx++;
						}

						fd.dependent.push(col);
					} else {
						let idx = 0,
							col = '';

						while (dependent[idx].match(/[a-zA-Z\s|]/)) {
							// not going to consider edge cases because if u put {, ,}, you're really stupid
							if (dependent[idx] === '|') {
								fd.dependent.push(col.trim());
								col = '';
								idx++;
							} else {
								col += dependent[idx];
								idx++;
							}
						}

						if (col.trim() !== '') {
							fd.dependent.push(col.trim());
						}
					}
				}

				return [fd];
			});
	}

	$: console.log(normalizedTables);
</script>

<svelte:head>
	<title>DB Normalizer</title>
</svelte:head>

<input type="file" on:change={readFile} />

{#if startingTable}
	<DataTable table={startingTable} />

	<div class="fds">
		<h2>Input FDs</h2>
		{#each fds as fd, i}
			<FDInput bind:fd on:paste={(evt) => (fds = [...fds.slice(0, i), ...pasteFDs(evt, false), ...fds.slice(i + 1)])} />
		{/each}
		<button on:click={() => (fds = [...fds, { dependent: [''], determinant: [''] }])}>Add FD</button>
	</div>
	<div class="mvds">
		<h2>Input MVDs</h2>
		{#each mvds as fd, i}
			<FDInput bind:fd on:paste={(evt) => (mvds = [...mvds.slice(0, i), ...pasteFDs(evt, true), ...mvds.slice(i + 1)])} mvd />
		{/each}
		<button on:click={() => (mvds = [...mvds, { dependent: [''], determinant: [''] }])}>Add MVD</button>
	</div>
	{#if error !== null}
		<p class="error">{error}</p>
	{/if}

	<div class="btns row">
		{#if normalizedTables !== null}
			<button on:click={() => ((normalizedTables = null), (viewIdx = 0))}>Clear</button>
		{:else}
			<button on:click={() => (normalizedTables = normalize([startingTable], fds, mvds, '1NF'))}>1NF</button>
			<button on:click={() => (normalizedTables = normalize([startingTable], fds, mvds, '2NF'))}>2NF</button>
			<button on:click={() => (normalizedTables = normalize([startingTable], fds, mvds, '3NF'))}>3NF</button>
			<button on:click={() => (normalizedTables = normalize([startingTable], fds, mvds, 'BCNF'))}>BCNF</button>
			<button on:click={() => (normalizedTables = normalize([startingTable], fds, mvds, '4NF'))}>4NF</button>
			<button on:click={() => (normalizedTables = normalize([startingTable], fds, mvds, '5NF'))}>5NF</button>
		{/if}
	</div>
	{#if normalizedTables !== null}
		<div class="controls row">
			{#each normalizedTables as _, i}
				<button on:click={() => (viewIdx = i)} class:active={viewIdx === i}>Table {i + 1}</button>
			{/each}
		</div>
		<DataTable table={normalizedTables[viewIdx]} />
	{/if}
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
	dialog article {
		max-width: 80%;
	}

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

	.fds,
	.mvds {
		margin-bottom: 1em;
	}

	.btns {
		gap: 1em;
	}

	.controls button:not(:first-child):not(:last-child) {
		border-radius: 0;
	}

	.controls button:first-child {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-top-right-radius: 0;
	}

	.controls button:last-child {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-top-left-radius: 0;
	}

	button.active {
		background-color: var(--primary-hover-background);
	}
</style>
