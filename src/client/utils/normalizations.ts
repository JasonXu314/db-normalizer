import { Table } from './Table';
import { resolveTransitive } from './utils';

export type NF = '1NF' | '2NF' | '3NF' | 'BCNF' | '4NF';

export function normalize(tables: ITable<any>[], fds: FD[], to: '1NF'): NF1Table[];
export function normalize(tables: ITable<any>[], fds: FD[], to: '2NF'): NF2Table[];
export function normalize(tables: ITable<any>[], fds: FD[], to: '3NF'): NF3Table[];
export function normalize(tables: ITable<any>[], fds: FD[], to: 'BCNF'): BCNFTable[];
export function normalize(tables: ITable<any>[], fds: FD[], to: '4NF'): NF4Table[];
export function normalize(tables: ITable<any>[], fds: FD[], to: NF): ITable<any>[] {
	switch (to) {
		case '1NF':
			return normalize1NF(tables, fds);
		case '2NF':
			return normalize2NF(normalize(tables, fds, '1NF'), fds);
		case '3NF':
			return normalize3NF(normalize(tables, fds, '2NF'), fds);
		case 'BCNF':
			return normalizeBCNF(normalize(tables, fds, '2NF'), fds);
	}
}

export function normalize1NF(tables: NF0Table[], _: FD[]): NF1Table[] {
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

export function normalize2NF(tables: NF1Table[], fds: FD[]): NF2Table[] {
	const out = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		fds.forEach((fd) => {
			const resolvedFD = resolveTransitive(fd, fds, table.pkey);

			if (resolvedFD.determinant.every((col) => table.names.includes(col)) && !table.pkey.every((key) => resolvedFD.determinant.includes(key))) {
				const newCols = resolvedFD.determinant.concat(resolvedFD.dependent);

				const seen: string[] = [];
				const newTable = new Table(newCols, {}, 0, -1, -1, resolvedFD.determinant.slice());

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
				resolvedFD.dependent.forEach((col) => table.removeCol(col));
			}
		});
	});

	return out;
}

export function normalize3NF(tables: NF2Table[], fds: FD[]): NF3Table[] {
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
				const newTable: NF3Table = new Table(newCols, {}, 0, -1, -1, fd.determinant.slice());

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
				tables.push(newTable);
			}
		});
	});

	return out;
}

export function normalizeBCNF(tables: NF2Table[] | NF3Table[], fds: FD[]): NF3Table[] {
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
				const newTable: BCNFTable = new Table(newCols, {}, 0, -1, -1, fd.determinant.slice());

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
				tables.push(newTable);
			}
		});
	});

	return out;
}

