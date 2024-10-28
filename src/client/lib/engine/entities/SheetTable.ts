import type { Engine } from '../engine';
import { Entity } from '../entity';
import { Point } from '../point';
import type { RenderEngine } from '../renderEngine';
import { CELL_PADDING_X, CELL_PADDING_Y, SheetCell } from './SheetCell';

export class SheetTable<Data> extends Entity {
	private readonly cells: SheetCell<Data>[][] = [];
	private readonly maxWidths: Record<string, number>;

	public constructor(engine: Engine, private readonly table: ITable<Data>) {
		super();

		this.maxWidths = Object.fromEntries(table.names.map((col) => [col, this._measureCol(engine.renderEngine, col)]));

		const header = table.names.map(
			(col) =>
				new SheetCell<Data>(
					() => col as Data,
					() => this.maxWidths[col],
					() => false,
					false
				)
		);
		this.cells.push(header);
		header.forEach((cell) => engine.add(cell, 1));

		for (let i = 0; i < table.length; i++) {
			const row = table.names.map(
				(col) =>
					new SheetCell<Data>(
						() => table.cols[col][i],
						() => this.maxWidths[col],
						typeof table.cols[col][i] === 'number' ? () => true : () => false,
						(data: Data) => {
							table.cols[col][i] = data;
							this.maxWidths[col] = this._measureCol(engine.renderEngine, col);
						}
					)
			);

			this.cells.push(row);
			row.forEach((cell) => engine.add(cell, 1));
		}
	}

	public render(renderEngine: RenderEngine): void {
		const totalWidth = this.table.names.reduce((total, col) => total + this._measureCol(renderEngine, col) + 2 * CELL_PADDING_X, 0);
		const totalHeight = 14 + 2 * CELL_PADDING_Y + (12 + 2 * CELL_PADDING_Y) * this.table.length;

		this.position = new Point(-renderEngine.width / 2 + 50 + totalWidth / 2, renderEngine.height / 2 - 50 - totalHeight / 2);
		const topLeft = this.position.subtract(new Point(totalWidth / 2, -totalHeight / 2));

		this.cells.forEach((row, i) => {
			const begin = topLeft.subtract(
				new Point(0, i === 0 ? (14 + 2 * CELL_PADDING_Y) / 2 : 14 + 2 * CELL_PADDING_Y + (12 + 2 * CELL_PADDING_Y) * (i - 0.5))
			);
			let prevWidth = 0;

			row.forEach((cell, j) => {
				const col = this.table.names[j];
				const width = this.maxWidths[col] + 2 * CELL_PADDING_X;

				cell.position = begin.add(new Point(prevWidth + width / 2));
				prevWidth += width;
			});
		});
	}

	public selectedBy(): boolean | Entity {
		return false;
	}

	public selectable(): boolean {
		return false;
	}

	private _measureCol(renderEngine: RenderEngine, col: string): number {
		let max = renderEngine.measure(col, { font: '14px sans-serif' }).width;

		for (let i = 0; i < this.table.length; i++) {
			let width = renderEngine.measure(`${this.table.cols[col][i]}`).width;

			if (width > max) max = width;
		}

		return max;
	}
}

