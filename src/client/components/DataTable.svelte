<script lang="ts">
	export let table: Table;
</script>

<div class="table-wrapper">
	<table>
		<thead>
			<tr>
				{#each table.names as colName}
					<th scope="col">{colName}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each new Array(table.length) as _, i}
				<tr>
					{#each table.names as colName}
						<td>{table.cols[colName][i]}</td>
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
</style>
