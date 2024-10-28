import { dovetail } from '$lib/utils/utils';
import { DynamicEntity, Entity, type Metadata } from '../entity';
import { Point } from '../point';
import type { RenderEngine } from '../renderEngine';

export const CELL_PADDING_X = 4,
	CELL_PADDING_Y = 2,
	ANIM_TICKS = 150;

export class SheetCell<Data> extends DynamicEntity {
	private cursorTick: number = 0;
	private cursorPos: number = -1;

	public constructor(
		private readonly getData: () => Data,
		private readonly getWidth: () => number,
		private readonly isNumber: () => boolean,
		private readonly rewrite: false | ((val: Data) => void)
	) {
		super();
	}

	public tick(metadata: Metadata): void {
		if (metadata.selected) {
			if (this.cursorPos === -1) this.cursorPos = `${this.getData()}`.length;

			this.cursorTick++;
			if (this.cursorTick > ANIM_TICKS) this.cursorTick = 0;
		} else {
			this.cursorTick = 0;
			this.cursorPos = -1;
		}
	}

	public render(renderEngine: RenderEngine, metadata: Metadata): void {
		const height = !this.rewrite ? 14 : 12;

		if (!metadata.selected && this === metadata.hoveredEntity)
			renderEngine.fillRect(this.position, this.getWidth() + 2 * CELL_PADDING_X, height + 2 * CELL_PADDING_Y, 'rgba(200, 200, 255, 0.5)');

		renderEngine.rect(this.position, this.getWidth() + 2 * CELL_PADDING_X, height + 2 * CELL_PADDING_Y);
		renderEngine.text(this.position, `${this.getData()}`, { font: `${height}px sans-serif` });

		if (metadata.selected) {
			const textEnd = this.position
				.subtract(new Point(renderEngine.measure(`${this.getData()}`).width / 2, 0))
				.add(new Point(renderEngine.measure(`${this.getData()}`.slice(0, this.cursorPos), { font: `${height}px sans-serif` }).width, 0));

			renderEngine.line(
				textEnd.add(new Point(0, height / 2)),
				textEnd.subtract(new Point(0, height / 2)),
				1,
				`rgba(0, 0, 0, ${dovetail(this.cursorTick, ANIM_TICKS).toFixed(2)})`
			);
		}
	}

	public dispatch(key: string): void {
		if (this.rewrite) {
			if (key === 'ArrowLeft') {
				if (this.cursorPos > 0) {
					this.cursorPos--;
				}
			} else if (key === 'ArrowRight') {
				if (this.cursorPos < `${this.getData()}`.length) {
					this.cursorPos++;
				}
			} else {
				const stringified = `${this.getData()}`;
				const result =
					key === 'Backspace'
						? stringified.slice(0, this.cursorPos - 1) + stringified.slice(this.cursorPos)
						: `${stringified.slice(0, this.cursorPos)}${key}${stringified.slice(this.cursorPos)}`;

				this.rewrite(result as Data);

				if (key === 'Backspace') {
					this.cursorPos--;
				} else {
					this.cursorPos++;
				}
			}
		}
	}

	public blur(): void {
		if (this.isNumber() && this.rewrite) {
			this.rewrite(parseFloat(`${this.getData()}`) as Data);
			this.cursorPos = -1;
			this.cursorTick = 0;
		}
	}

	public selectedBy(point: Point): boolean | Entity {
		return (
			point.x >= this.position.x - this.getWidth() / 2 - CELL_PADDING_X &&
			point.x <= this.position.x + this.getWidth() / 2 + CELL_PADDING_X &&
			point.y >= this.position.y - 12 / 2 - CELL_PADDING_Y &&
			point.y <= this.position.y + 12 / 2 + CELL_PADDING_Y
		);
	}

	public selectable(): boolean {
		return !!this.rewrite;
	}
}

