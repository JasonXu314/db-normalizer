import type { Cell, Row } from 'exceljs';

export function getRows(sheet: any): Row[] {
	return sheet._rows as Row[];
}

export function getCells(row: any): Cell[] {
	return row._cells as Cell[];
}

export function isTableCell(cell: Cell): boolean {
	return cell.border && (cell.border.top || cell.border.right || cell.border.bottom || cell.border.left) !== undefined;
}

