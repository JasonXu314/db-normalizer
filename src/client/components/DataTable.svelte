<script lang="ts">
	export let table: NF0Table;
</script>

<div class="table-wrapper">
	<table>
		<thead>
			<tr>
				{#each table.names as colName}
					<th scope="col" class:pkey={table.pkey.includes(colName)}>{colName}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each new Array(table.length) as _, i}
				<tr>
					{#each table.names as colName}
						<td>
							{#if Array.isArray(table.cols[colName][i])}
								{#if table.cols[colName][i].length > 0}
									{table.cols[colName][i][0]}
									{#each table.cols[colName][i].slice(1) as val}
										<br />
										{val}
									{/each}
								{:else}
									&lbrace;&rbrace;
								{/if}
							{:else}
								{table.cols[colName][i]}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
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
