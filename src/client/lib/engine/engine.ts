import { SheetCell } from './entities/SheetCell';
import { DynamicEntity, type Entity } from './entity';
import { Point } from './point';
import { RenderEngine } from './renderEngine';

interface EngineEvents {
	entityClicked: (entity: Entity, metadata: { button: MouseButton; spacePos: Point; pagePos: Point }) => void;
	entityDblClicked: (entity: Entity) => void;
	click: (evt: MouseEvent) => void;
}

export enum MouseButton {
	LEFT,
	MIDDLE,
	RIGHT,
	BACK,
	FORWARD
}

export class Engine {
	private readonly context: CanvasRenderingContext2D;
	private readonly layers: Entity[][] = [];
	public readonly renderEngine: RenderEngine;

	private _af: number | null = null;

	private _selectedEntity: Entity | null = null;
	private _hoveredEntity: Entity | null = null;
	private _mousePos: Point | null = null;
	private _mouseDown = false;
	private _mouseDelta: Point | null = null;

	private _listeners: { [K in keyof EngineEvents]: EngineEvents[K][] };

	private mouseListener: (evt: MouseEvent) => void = (evt) => {
		if (this._mousePos) {
			this._mousePos = this.renderEngine.canvasToSpace(new Point(evt.offsetX, evt.offsetY));

			if (this._mouseDelta) {
				this._mouseDelta.x += evt.movementX;
				this._mouseDelta.y -= evt.movementY;
			}
		}
	};

	constructor(private readonly canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');

		if (ctx) {
			this.context = ctx;
			this.renderEngine = new RenderEngine(ctx, canvas);

			this._listeners = { entityClicked: [], click: [], entityDblClicked: [] };

			canvas.addEventListener('mouseout', () => {
				this._mousePos = null;

				canvas.removeEventListener('mousemove', this.mouseListener);
			});

			canvas.addEventListener('mouseover', (evt) => {
				this._mousePos = new Point(evt.offsetX, evt.offsetY);

				canvas.addEventListener('mousemove', this.mouseListener);
			});

			canvas.addEventListener('mousedown', () => {
				this._mouseDown = true;
				this._mouseDelta = new Point();
			});

			canvas.addEventListener('mouseup', (evt: MouseEvent) => {
				this._mouseDown = false;
				this._mouseDelta = null;

				if (this._hoveredEntity) {
					for (const listener of this._listeners.entityClicked) {
						listener(this._hoveredEntity, {
							button: evt.button,
							spacePos: this._mousePos!,
							pagePos: this.renderEngine.spaceToCanvas(this._mousePos!).add(new Point(16, 52))
						});
					}
				} else {
					if (evt.button === MouseButton.LEFT) {
						if (this._selectedEntity instanceof SheetCell) {
							this._selectedEntity.blur();
						}

						this._selectedEntity = null;
					}

					for (const listener of this._listeners.click) {
						listener(evt);
					}
				}
			});

			canvas.addEventListener('dblclick', (evt: MouseEvent) => {
				if (this._hoveredEntity && this._hoveredEntity.selectable()) {
					if (evt.button === MouseButton.LEFT) {
						this._selectedEntity = this._hoveredEntity;
					}
				}

				if (this._selectedEntity) {
					for (const listener of this._listeners.entityDblClicked) {
						listener(this._selectedEntity);
					}
				}
			});

			canvas.addEventListener('contextmenu', (evt: MouseEvent) => {
				if (this._selectedEntity) {
					evt.preventDefault();
				}
			});

			document.addEventListener('keyup', (evt) => {
				if (this._selectedEntity && this._selectedEntity instanceof SheetCell) {
					if (/^\w$/.test(evt.key)) {
						if (!evt.ctrlKey && !evt.altKey) {
							this._selectedEntity.dispatch(evt.key);
						}
					} else {
						if (['Backspace', 'ArrowLeft', 'ArrowRight'].includes(evt.key)) {
							this._selectedEntity.dispatch(evt.key);
						} else if (evt.key === 'Tab') {
							console.log(evt.shiftKey);
						} else {
							console.log(evt.key);
						}
					}
				}
			});
		} else {
			throw new Error('Unable to get canvas context');
		}
	}

	public add(entity: Entity, layer: number): void {
		while (layer >= this.layers.length) {
			this.layers.push([]);
		}

		this.layers[layer].push(entity);
	}

	public remove(entity: Entity, layer?: number): void {
		if (layer === undefined) {
			for (const layer of this.layers) {
				if (layer.includes(entity)) {
					layer.splice(layer.indexOf(entity), 1);
				}
			}
		} else {
			if (!this.layers[layer]) {
				throw new Error(`Layer ${layer} does not exist!`);
			} else if (!this.layers[layer].includes(entity)) {
				throw new Error(`Layer ${layer} does not contain entity!`);
			} else {
				this.layers[layer].splice(this.layers[layer].indexOf(entity), 1);
			}
		}
	}

	public start(): void {
		this._tick();
	}

	public stop(): void {
		cancelAnimationFrame(this._af);
		this._af = null;
	}

	public on<T extends keyof EngineEvents>(evt: T, listener: EngineEvents[T]): () => void {
		this._listeners[evt].push(listener);

		return () => {
			this._listeners[evt].splice(this._listeners[evt].indexOf(listener), 1);
		};
	}

	private _tick(): void {
		this._af = requestAnimationFrame(() => this._tick());

		if (!this._mouseDown) {
			this._updateHoveredEntity();
		}

		if (this._hoveredEntity) {
			if (this._hoveredEntity instanceof SheetCell) {
				if (this._hoveredEntity === this._selectedEntity) {
					this.canvas.style.cursor = 'text';
				} else {
					this.canvas.style.cursor = 'cell';
				}
			} else {
				this.canvas.style.cursor = 'pointer';
			}
		} else {
			this.canvas.style.cursor = 'unset';
		}

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'white';
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'black';
		this.layers.forEach((layer) => {
			layer.forEach((entity) => {
				if (entity instanceof DynamicEntity) {
					entity.tick({
						selected: this._selectedEntity === entity,
						mouse: null,
						selectedEntity: this._selectedEntity,
						hoveredEntity: this._hoveredEntity
					});
				}
			});
		});
		this.layers.forEach((layer) => {
			layer.forEach((entity) => {
				entity.render(this.renderEngine, {
					selected: this._selectedEntity === entity,
					mouse: null,
					selectedEntity: this._selectedEntity,
					hoveredEntity: this._hoveredEntity
				});
			});
		});

		if (this._mouseDelta) {
			this._mouseDelta = new Point();
		}
	}

	private _updateHoveredEntity(): void {
		if (this._mousePos) {
			const reversedLayers = this.layers.toReversed();

			for (const layer of reversedLayers) {
				const reversedEntities = layer.toReversed();

				for (const entity of reversedEntities) {
					const selected = entity.selectedBy(this._mousePos);

					if (selected) {
						if (typeof selected === 'object') {
							this._hoveredEntity = selected;
						} else {
							this._hoveredEntity = entity;
						}
						return;
					}
				}
			}
		}

		this._hoveredEntity = null;
	}
}

