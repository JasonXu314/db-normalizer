export function dovetail(t: number, total: number): number {
	const x = (t % total) / total;

	return Math.max(1 / (x - 1) + 2, -1 / x + 2);
}

