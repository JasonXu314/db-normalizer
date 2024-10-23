interface ITable<Data> {
	names: string[];
	cols: Record<string, Data[]>;
	length: number;
	sr: number;
	sc: number;
	pkey: string[];

	clone(): ITable<Data>;
	get(i: number): Record<string, Data>;
	replace(i: number, tuples: Record<string, Data>[]): void;
	insert(tuples: Record<string, Data>[]): void;
	removeCol(name: string): void;
	addCol(name: string, values: Data[]): void;
	addKeyCol(name: string, values: Data[]): void;
	crunch(): void;
}

type DBPrimitive = string | number;

type NF0Table = ITable<DBPrimitive | DBPrimitive[]>;
type NF1Table = ITable<DBPrimitive>;
type NF2Table = ITable<DBPrimitive>;
type NF3Table = ITable<DBPrimitive>;
type BCNFTable = ITable<DBPrimitive>;
type NF4Table = ITable<DBPrimitive>;
type NF5Table = ITable<DBPrimitive>;

interface FD {
	determinant: string[];
	dependent: string[];
}

