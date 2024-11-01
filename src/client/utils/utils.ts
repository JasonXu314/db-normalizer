import type { Cell, CellValue, Row, Worksheet } from 'exceljs';
import { Table } from './Table';

export function getRows(sheet: any): Row[] {
	return sheet._rows as Row[];
}

export function getCells(row: any): Cell[] {
	return row._cells as Cell[];
}

export function isTableCell(cell: Cell): boolean {
	return cell.border && (cell.border.top || cell.border.right || cell.border.bottom || cell.border.left) !== undefined;
}

export function parseCell(val: CellValue): DBPrimitive | DBPrimitive[] {
	if (typeof val === 'string' && val.trim().startsWith('{') && val.trim().endsWith('}')) {
		const items = val.trim().slice(1, -1).split(/,\s*/);

		return items.every((item) => !Number.isNaN(parseFloat(item))) ? items.map((item) => parseFloat(item)) : items;
	} else if (typeof val === 'number') {
		return val;
	} else if (val instanceof Date) {
		return val.toDateString();
	} else if (val.toString() === 'NONE') {
		return [];
	} else {
		return val.toString();
	}
}

export function regularizeMVA<T>(table: ITable<T>): void {
	for (const name of table.names) {
		if (table.cols[name].some((val) => Array.isArray(val))) {
			table.cols[name] = table.cols[name].map((val) => (Array.isArray(val) ? val : [val])) as T[];
		}
	}
}

export function readSheet(sheet: Worksheet): NF0Table[] {
	const rows = getRows(sheet);

	const tables: NF0Table[] = [];
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

					const table: NF0Table = new Table([], {}, 0, i, sx, ['']);

					for (let j = sx; j < ex; j++) {
						const val = row[j].value;
						const name = typeof val === 'string' ? val : val.toString();

						table.addCol(name, []);
					}

					for (let r = i + 1; rows[r] && isTableCell(getCells(rows[r])[sx]); r++) {
						const row = getCells(rows[r]);

						for (let c = sx; c < ex; c++) {
							const rawVal = row[c].value;

							try {
								table.cols[table.names[c - sx]].push(parseCell(rawVal));
							} catch (e) {
								console.log(row);
								console.log('err with', rawVal, 'at', r, c);
								console.error(e);
							}
						}

						table.length++;
					}

					regularizeMVA(table);

					tables.push(table);
					if (table.length > maxLen) maxLen = table.length + 1;
				} else {
					break;
				}
			}

			i += maxLen;
		}
	}

	return tables;
}

export function resolveTransitive(fd: FD, fds: FD[], terminals: string[]): FD {
	const out: FD = { dependent: fd.dependent.slice(), determinant: [] };

	for (const det of fd.determinant) {
		if (!terminals.includes(det)) {
			const detFD = fds.find((fd) => fd.dependent.includes(det));

			if (detFD) {
				const resolvedFD = resolveTransitive({ dependent: [det], determinant: detFD.determinant }, fds, terminals);

				resolvedFD.determinant.forEach((col) => {
					if (!out.determinant.includes(col)) {
						out.determinant.push(col);
					}
				});
			} else {
				out.determinant.push(det);
			}
		} else {
			out.determinant.push(det);
		}
	}

	return out;
}

export function filterRedundant<T>(tables: ITable<T>[]): ITable<T>[] {
	const out: ITable<T>[] = [];

	tables.forEach((table, i) => {
		if (
			!tables.some(
				(t, j) =>
					i !== j &&
					table.pkey.every((key) => t.pkey.includes(key)) &&
					table.names.filter((col) => !table.pkey.includes(col)).every((col) => t.names.includes(col))
			)
		) {
			out.push(table);
		}
	});

	return out;
}

export function join<T>(a: ITable<T>, b: ITable<T>): ITable<T> {
	const cols = new Set<string>();
	a.names.forEach((col) => cols.add(col));
	b.names.forEach((col) => cols.add(col));

	const intersection = a.names.filter((col) => b.names.includes(col));
	const union = Array.from(cols);

	const newTable = new Table<T>(union.slice(), Object.fromEntries(union.map((col) => [col, []])), 0, -1, -1, union.slice());

	for (let i = 0; i < a.length; i++) {
		const aTuple = a.get(i);

		for (let j = 0; j < b.length; j++) {
			const bTuple = b.get(j);

			if (intersection.every((col) => aTuple[col] === bTuple[col])) {
				const newTuple = Object.fromEntries(union.map((col) => [col, col in aTuple ? aTuple[col] : bTuple[col]]));

				newTable.insert([newTuple]);
			}
		}
	}

	newTable.crunch();
	return newTable;
}

export function comb<T>(elems: T[]): T[][] {
	if (elems.length === 1) {
		return [[], [elems[0]]];
	} else {
		const combs = comb(elems.slice(1));

		return combs.concat(combs.map((comb) => [elems[0], ...comb]));
	}
}

export function partition<T>(elems: T[]): [T[], T[]][] {
	if (elems.length === 1) {
		return [
			[[elems[0]], []],
			[[], [elems[0]]]
		];
	} else {
		const partitions = partition(elems.slice(1));

		return partitions.flatMap(([a, b]) => [
			[[elems[0], ...a], [...b]],
			[[...a], [elems[0], ...b]]
		]);
	}
}

