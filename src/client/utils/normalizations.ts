import { Table } from './Table';
import { comb, filterRedundant, join, partition, resolveTransitive } from './utils';

export type NF = '1NF' | '2NF' | '3NF' | 'BCNF' | '4NF' | '5NF';

export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: '1NF'): NF1Table[];
export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: '2NF'): NF2Table[];
export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: '3NF'): NF3Table[];
export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: 'BCNF'): BCNFTable[];
export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: '4NF'): NF4Table[];
export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: '5NF'): NF5Table[];
export function normalize(tables: ITable<any>[], fds: FD[], mvds: FD[], to: NF): ITable<any>[] {
	switch (to) {
		case '1NF':
			return normalize1NF(tables, fds, mvds);
		case '2NF':
			return normalize2NF(normalize(tables, fds, mvds, '1NF'), fds, mvds);
		case '3NF':
			return normalize3NF(normalize(tables, fds, mvds, '2NF'), fds, mvds);
		case 'BCNF':
			return normalizeBCNF(normalize(tables, fds, mvds, '2NF'), fds, mvds);
		case '4NF':
			return normalize4NF(normalize(tables, fds, mvds, 'BCNF'), fds, mvds);
		case '5NF':
			return normalize5NF(normalize(tables, fds, mvds, '4NF'), fds, mvds);
	}
}

export function normalize1NF(tables: NF0Table[], _: FD[], __: FD[]): NF1Table[] {
	const out = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		table.names.forEach((colName) => {
			if (Array.isArray(table.cols[colName][0]) && !table.pkey.includes(colName)) {
				const newCols = table.pkey.concat(colName);

				const newTable = new Table(newCols, Object.fromEntries(newCols.map((k) => [k, []])), 0, -1, -1, newCols.slice());

				for (let i = 0; i < table.length; i++) {
					const tuple = table.get(i);
					const vals = tuple[colName] as DBPrimitive[];

					const newTuples = vals.map((val) => Object.fromEntries(table.pkey.map((key) => [key, tuple[key]]).concat([[colName, val]])));

					newTable.insert(newTuples);
				}

				newTable.crunch();
				out.push(newTable);
				table.removeCol(colName);
			}
		});
	});

	return out;
}

export function normalize2NF(tables: NF1Table[], fds: FD[], _: FD[]): NF2Table[] {
	const out = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		fds.forEach((fd) => {
			const resolvedFD = resolveTransitive(fd, fds, table.names);

			if (resolvedFD.determinant.every((col) => table.names.includes(col)) && !table.pkey.every((key) => resolvedFD.determinant.includes(key))) {
				const newCols = resolvedFD.determinant.concat(resolvedFD.dependent.filter((col) => table.names.includes(col)));

				const seen: string[] = [];
				const newTable = new Table(newCols, Object.fromEntries(newCols.map((k) => [k, []])), 0, -1, -1, resolvedFD.determinant.slice());

				for (let i = 0; i < table.length; i++) {
					const tuple = table.get(i);
					const determinant = JSON.stringify(resolvedFD.determinant.map((col) => tuple[col]));

					if (!seen.includes(determinant)) {
						const newTuple = Object.fromEntries(newCols.map((key) => [key, tuple[key]]));

						newTable.insert([newTuple]);
						seen.push(determinant);
					}
				}

				newTable.crunch();
				out.push(newTable);
				resolvedFD.dependent.filter((col) => table.names.includes(col)).forEach((col) => table.removeCol(col));
			}
		});
	});

	return filterRedundant(out);
}

export function normalize3NF(tables: NF2Table[], fds: FD[], _: FD[]): NF3Table[] {
	const out: NF3Table[] = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		fds.forEach((fd) => {
			if (
				fd.determinant.every((col) => table.names.includes(col)) &&
				fd.determinant.some((col) => !table.pkey.includes(col)) &&
				fd.dependent.some((col) => table.names.includes(col) && !table.pkey.includes(col))
			) {
				const toRemove = fd.dependent.filter((col) => table.names.includes(col) && !table.pkey.includes(col));
				const newCols = fd.determinant.concat(toRemove);

				const seen: string[] = [];
				const newTable: NF3Table = new Table(newCols, Object.fromEntries(newCols.map((k) => [k, []])), 0, -1, -1, fd.determinant.slice());

				for (let i = 0; i < table.length; i++) {
					const tuple = table.get(i);
					const determinant = JSON.stringify(fd.determinant.map((col) => tuple[col]));

					if (!seen.includes(determinant)) {
						const newTuple = Object.fromEntries(newCols.map((key) => [key, tuple[key]]));

						newTable.insert([newTuple]);
						seen.push(determinant);
					}
				}

				newTable.crunch();
				toRemove.forEach((col) => table.removeCol(col));
				out.push(newTable);
			}
		});
	});

	return out;
}

export function normalizeBCNF(tables: NF2Table[] | NF3Table[], fds: FD[], _: FD[]): NF3Table[] {
	const out: BCNFTable[] = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		fds.forEach((fd) => {
			if (
				fd.determinant.every((col) => table.names.includes(col)) &&
				fd.determinant.some((col) => !table.pkey.includes(col)) &&
				fd.dependent.some((col) => table.names.includes(col))
			) {
				const toRemove = fd.dependent.filter((col) => table.names.includes(col));
				const newCols = fd.determinant.concat(toRemove);

				const seen: string[] = [];
				const newTable: BCNFTable = new Table(newCols, Object.fromEntries(newCols.map((k) => [k, []])), 0, -1, -1, fd.determinant.slice());

				for (let i = 0; i < table.length; i++) {
					const tuple = table.get(i);
					const determinant = JSON.stringify(fd.determinant.map((col) => tuple[col]));

					if (!seen.includes(determinant)) {
						const newTuple = Object.fromEntries(newCols.map((key) => [key, tuple[key]]));

						newTable.insert([newTuple]);
						seen.push(determinant);
					}
				}

				newTable.crunch();
				toRemove.forEach((col) => table.removeCol(col));
				out.push(newTable);
			}
		});
	});

	return out;
}

export function normalize4NF(tables: BCNFTable[], _: FD[], mvds: FD[]): NF4Table[] {
	const out: BCNFTable[] = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		mvds.forEach((mvd) => {
			if (
				// MVD exists in the relation
				mvd.determinant.every((col) => table.names.includes(col)) &&
				mvd.dependent.reduce((count, col) => (table.names.includes(col) ? count + 1 : count), 0) >= 2 &&
				// and is non-trivial
				!mvd.determinant.every((col) => table.pkey.includes(col)) &&
				table.names.some((col) => !mvd.dependent.includes(col) && !mvd.determinant.includes(col))
			) {
				const toRemove = mvd.dependent.filter((col) => table.names.includes(col));
				const newCols = mvd.determinant.concat(toRemove);

				const seen: string[] = [];
				const newTable: NF4Table = new Table(newCols, Object.fromEntries(newCols.map((k) => [k, []])), 0, -1, -1, mvd.determinant.slice());

				for (let i = 0; i < table.length; i++) {
					const tuple = table.get(i);
					const determinant = JSON.stringify(mvd.determinant.map((col) => tuple[col]));

					if (!seen.includes(determinant)) {
						const newTuple = Object.fromEntries(newCols.map((key) => [key, tuple[key]]));

						newTable.insert([newTuple]);
						seen.push(determinant);
					}
				}

				newTable.crunch();
				toRemove.forEach((col) => table.removeCol(col));
				out.push(newTable);
			}
		});
	});

	return out;
}

export function normalize5NF(tables: BCNFTable[], _: FD[], __: FD[]): NF4Table[] {
	const out: BCNFTable[] = [];

	tables.forEach((t) => {
		const table = t.clone();

		let bestPartition = null,
			bestSize = Infinity;

		for (const common of comb(table.names)) {
			if (table.names.length - common.length >= 2) {
				const remaining = table.names.filter((col) => !common.includes(col));

				for (const [a, b] of partition(remaining)) {
					if (a.length > 0 && b.length > 0) {
						const aKeys = common.concat(a);
						const bKeys = common.concat(b);

						const aTable = new Table(aKeys, Object.fromEntries(aKeys.map((col) => [col, []])), 0, -1, -1, aKeys.slice());
						const bTable = new Table(bKeys, Object.fromEntries(bKeys.map((col) => [col, []])), 0, -1, -1, bKeys.slice());

						for (let i = 0; i < table.length; i++) {
							const tuple = table.get(i);

							const aTuple = Object.fromEntries(aKeys.map((col) => [col, tuple[col]]));
							const bTuple = Object.fromEntries(bKeys.map((col) => [col, tuple[col]]));

							aTable.insert([aTuple]);
							bTable.insert([bTuple]);
						}

						aTable.crunch();
						bTable.crunch();

						// console.log('partition:', common, a, b);
						// console.log('tables:', aTable, bTable);

						const joined = join(aTable, bTable);
						// console.log(joined);

						if (joined.length === table.length) {
							let match = true;

							for (let i = 0; i < joined.length; i++) {
								const joinedTuple = joined.get(i);
								let found = false;

								for (let j = 0; j < joined.length; j++) {
									const originalTuple = table.get(j);

									if (table.names.every((col) => joinedTuple[col] === originalTuple[col])) {
										found = true;
										break;
									}
								}

								if (!found) {
									match = false;
									// console.log('no match for tuple', joinedTuple);
									break;
								}
							}

							if (match) {
								// console.log('matched for', common, a, b);
								const size = aTable.length * aTable.names.length + bTable.length * bTable.names.length;

								if (size < bestSize) {
									bestPartition = [aTable, bTable];
									bestSize = size;
								}
							}
						}
					}
				}
			}
		}

		if (bestPartition !== null && bestSize <= table.length * table.names.length) {
			// console.log('best', bestPartition);
			out.push(...bestPartition);
		} else {
			out.push(table);
		}
	});

	return out;
}

