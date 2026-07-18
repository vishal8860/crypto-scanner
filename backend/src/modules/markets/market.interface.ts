export interface Market {
	readonly symbol: string;
	readonly lastPrice: number | null;
	readonly change24HourPercent: number | null;
	readonly volume: number | null;
	readonly status: string;
}
