export class Table<Data> implements ITable<Data> {
	public constructor(
		public names: string[],
		public cols: Record<string, Data[]>,
		public length: number,
		public sr: number,
		public sc: number,
		public pkey: string[]
	) {}

	public clone(): ITable<Data> {
		return new Table(
			this.names.slice(),
			Object.fromEntries(
				Object.entries(this.cols).map(([colName, col]) => [colName, [...col.map((val) => (Array.isArray(val) ? [...val] : val) as Data)]])
			),
			this.length,
			this.sr,
			this.sc,
			this.pkey.slice()
		);
	}

	public get(i: number): Record<string, Data> {
		return Object.fromEntries(this.names.map((colName) => [colName, this.cols[colName][i]]));
	}

	public remove(i: number): void {
		this.names.forEach((colName) => this.cols[colName].splice(i, 1));
	}

	public replace(i: number, tuples: Record<string, Data>[]): void {
		for (const colName of this.names) {
			this.cols[colName].splice(i, 1, ...tuples.map((tuple) => tuple[colName]));
		}

		this.length += tuples.length - 1;
	}

	public insert(tuples: Record<string, Data>[]): void {
		for (const colName of this.names) {
			this.cols[colName].push(...tuples.map((tuple) => tuple[colName]));
		}

		this.length += tuples.length;
	}

	public removeCol(name: string): void {
		delete this.cols[name];
		this.names = this.names.filter((n) => n !== name);
		this.pkey = this.pkey.filter((n) => n !== name);
	}

	public addCol(name: string, values: Data[]): void {
		this.cols[name] = values.map((val) => (Array.isArray(val) ? [...val] : val) as Data);
		this.names.push(name);
	}

	public addKeyCol(name: string, values: Data[]): void {
		this.addCol(name, values);
		this.pkey.push(name);
	}

	public crunch(prime: boolean = true): void {
		for (let i = 0; i < this.length - 1; i++) {
			for (let j = i + 1; j < this.length; j++) {
				if ((prime ? this.pkey : this.names).every((colName) => this.cols[colName][i] === this.cols[colName][j])) {
					this.remove(j);
					this.length--;
					j--;
				}
			}
		}
	}

	public project(to: string[]): Table<Data> {
		const newTable = new Table<Data>(to.slice(), Object.fromEntries(to.map((col) => [col, []])), 0, -1, -1, to.slice());

		for (let i = 0; i < this.length; i++) {
			const tuple = this.get(i);

			const newTuple = Object.fromEntries(to.map((col) => [col, tuple[col]]));

			newTable.insert([newTuple]);
		}

		newTable.crunch();
		return newTable;
	}
}

