import type { Cell, Row, Worksheet } from 'exceljs';
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

					const table: NF0Table = new Table([], {}, 0, i, sx, []);

					for (let j = sx; j < ex; j++) {
						const val = row[j].value;
						const name = typeof val === 'string' ? val : val.toString();

						table.cols[name] = [];
						table.names.push(name);
					}

					for (let r = i + 1; rows[r] && isTableCell(getCells(rows[r])[sx]); r++) {
						const row = getCells(rows[r]);

						for (let c = sx; c < ex; c++) {
							const rawVal = row[c].value;

							try {
								let val: DBPrimitive | DBPrimitive[];

								if (typeof rawVal === 'string' && rawVal.trim().startsWith('{') && rawVal.trim().endsWith('}')) {
									const items = rawVal.trim().slice(1, -1).split(/,\s*/);

									val = items.every((item) => !Number.isNaN(parseFloat(item))) ? items.map((item) => parseFloat(item)) : items;
								} else if (typeof rawVal === 'number') {
									val = rawVal;
								} else {
									val = rawVal.toString();
									if (val === 'NONE') val = [];
								}

								table.cols[table.names[c - sx]].push(val);
							} catch (e) {
								console.log(row);
								console.log('err with', rawVal, 'at', r, c);
								console.error(e);
							}
						}

						table.length++;
					}

					// regularize multivalued attributes
					for (const name of table.names) {
						if (table.cols[name].some((val) => Array.isArray(val))) {
							table.cols[name] = table.cols[name].map((val) => (Array.isArray(val) ? val : [val]));
						}
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

	return tables;
}

export function resolveTransitive(fd: FD, fds: FD[], terminals: string[]): FD {
	const out: FD = { dependent: fd.dependent.slice(), determinant: [] };

	for (const det of fd.determinant) {
		if (!terminals.includes(det)) {
			const detFD = fds.find((fd) => fd.dependent.includes(det));

			if (detFD) {
				const resolvedFD = resolveTransitive({ dependent: [det], determinant: detFD.determinant }, fds, terminals);

				resolvedFD.determinant.forEach((col) => out.determinant.push(col));
			} else {
				out.determinant.push(det);
			}
		} else {
			out.determinant.push(det);
		}
	}

	return out;
}

