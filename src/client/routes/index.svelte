<script lang="ts">
	import { Workbook } from 'exceljs';
	import { type ChangeEventHandler } from 'svelte/elements';
	import DataTable from '../components/DataTable.svelte';
	import { getCells, getRows, isTableCell } from '../utils/utils';

	let tableNominees: Table[] | null = null,
		startingTable: Table | null = null,
		error: string | null = null;

	const readFile: ChangeEventHandler<HTMLInputElement> = (evt) => {
		const files = (evt.target as HTMLInputElement).files;

		const workbook = new Workbook();
		const file = files.item(0);

		file.arrayBuffer().then((buf) =>
			workbook.xlsx.load(buf).then((book) => {
				const sheets = book.worksheets;

				if (sheets.length === 1) {
					const [sheet] = sheets;
					const rows = getRows(sheet);

					const tables: Table[] = [];
					for (let i = 0; i < rows.length; i++) {
						if (rows[i]) {
							let explored = 0,
								maxLen = 0;

							while (explored < getCells(rows[i]).length) {
								let sx = -1,
									ex = -1;
								const row = getCells(rows[i]);

								for (let j = explored; j < row.length; j++) {
									if (row[j]) {
										if (sx === -1) {
											if (isTableCell(row[j])) sx = j;
										} else {
											if (!isTableCell(row[j])) {
												ex = j;
												break;
											}
										}
									} else {
										if (sx !== -1) {
											ex = j;
											break;
										}
									}
								}

								if (sx !== -1) {
									if (ex === -1) ex = row.length;
									explored = ex;

									const table: Table = { cols: {}, names: [], sr: i, sc: sx, length: 0 };

									for (let j = sx; j < ex; j++) {
										const val = row[j].value;
										const name = typeof val === 'string' ? val : val.toString();

										table.cols[name] = [];
										table.names.push(name);
									}

									for (let r = i + 1; rows[r] && isTableCell(getCells(rows[r])[sx]); r++) {
										const row = getCells(rows[r]);

										for (let c = sx; c < ex; c++) {
											const val = row[c].value;

											try {
												table.cols[table.names[c - sx]].push(typeof val === 'number' ? val : val.toString());
											} catch (e) {
												console.log(row);
												console.log('err with', val, 'at', r, c);
												console.error(e);
											}
										}

										table.length++;
									}

									tables.push(table);
									if (table.length > maxLen) maxLen = table.length + 1;
								} else {
									break;
								}
							}

							i += maxLen;
						}
					}

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
			tableNominees = null;
		} else {
			error = 'Select a starting table';
		}
	}
</script>

<input type="file" on:change={readFile} />

{#if startingTable}
	<DataTable table={startingTable} />
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
</style>
