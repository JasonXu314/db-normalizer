interface Table<Data> {
	names: string[];
	cols: Record<string, Data[]>;
	length: number;
	sr: number;
	sc: number;
}

type DBPrimitive = string | number;

type NF0Table = Table<DBPrimitive | DBPrimitive[]>;
type NF1Table = Table<DBPrimitive>;
type NF2Table = Table<DBPrimitive>;
type NF3Table = Table<DBPrimitive>;
type BCNFTable = Table<DBPrimitive>;
type NF4Table = Table<DBPrimitive>;

