import { Table } from './Table';

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
		case '3NF':
			return normalize3NF(tables, fds);
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

				const newTable = new Table(newCols, Object.fromEntries(newCols.map((k) => [k, []])), 0, -1, -1, table.pkey.slice());

				for (let i = 0; i < table.length; i++) {
					const tuple = table.get(i);
					const vals = tuple[colName] as DBPrimitive[];

					const newTuples = vals.map((val) => Object.fromEntries(table.pkey.map((key) => [key, tuple[key]]).concat([[colName, val]])));

					newTable.insert(newTuples);
				}

				out.push(newTable);
				table.removeCol(colName);
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
				fd.determinant.some((col) => table.names.includes(col) && !table.pkey.includes(col)) &&
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

				tables.push(newTable);
			}
		});
	});

	return out;
}

