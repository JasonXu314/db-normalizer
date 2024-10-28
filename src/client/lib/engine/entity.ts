import { Point } from './point';
import type { RenderEngine } from './renderEngine';

export interface Metadata {
	selected: boolean;
	mouse: MouseData | null;
	selectedEntity: Entity | null;
	hoveredEntity: Entity | null;
}

export type MouseData = { position: Point | null } & ({ down: true; delta: Point } | { down: false; delta: null });

export abstract class Entity {
	public position: Point = new Point();

	public abstract render(renderEngine: RenderEngine, metadata: Metadata): void;
	public abstract selectedBy(point: Point): boolean | Entity;
	public abstract selectable(): boolean;
}

export abstract class DynamicEntity extends Entity {
	public abstract tick(metadata: Metadata): void;
}

