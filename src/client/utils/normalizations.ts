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
	}
}

export function normalize1NF(tables: NF0Table[], fds: FD[]): NF1Table[] {
	const out = [];

	tables.forEach((t) => {
		const table = t.clone();
		out.push(table);

		table.names.forEach((colName) => {
			if (Array.isArray(table.cols[colName][0]) && !table.pkey.includes(colName)) {
				const keys = table.pkey.concat(colName);

				const newTable = new Table(keys, Object.fromEntries(keys.map((k) => [k, []])), 0, -1, -1, table.pkey.slice());

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

