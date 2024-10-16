interface Table {
	names: string[];
	cols: Record<string, (string | number)[]>;
	length: number;
	sr: number;
	sc: number;
}

