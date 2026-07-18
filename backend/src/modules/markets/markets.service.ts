import { CoinDcxApiService } from './coindcx-api.service.js';
import { MarketDto } from './market.dto.js';

const parseNumber = (value: string): number | null => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const pairToSymbol = (pair: string): string => {
	const normalized = pair.replace(/^B-/, '');
	const segments = normalized.split('_');

	if (segments.length !== 2 || !segments[0] || !segments[1]) {
		return '';
	}

	return `${segments[0]}${segments[1]}`;
};

export class MarketsService {
	public constructor(private readonly coinDcxApiService: CoinDcxApiService = new CoinDcxApiService()) {}

	public async list(): Promise<readonly MarketDto[]> {
		const [instruments, ticker] = await Promise.all([
			this.coinDcxApiService.getActiveFuturesInstruments(),
			this.coinDcxApiService.getTicker()
		]);

		const tickerBySymbol = new Map(ticker.map((entry) => [entry.market, entry]));
		const uniqueSymbols = new Set<string>();
		const markets: MarketDto[] = [];

		for (const instrument of instruments) {
			const symbol = pairToSymbol(instrument);

			if (!symbol || uniqueSymbols.has(symbol)) {
				continue;
			}

			uniqueSymbols.add(symbol);
			const tickerEntry = tickerBySymbol.get(symbol);

			markets.push({
				symbol,
				lastPrice: tickerEntry ? parseNumber(tickerEntry.last_price) : null,
				change24HourPercent: tickerEntry ? parseNumber(tickerEntry.change_24_hour) : null,
				volume: tickerEntry ? parseNumber(tickerEntry.volume) : null,
				status: 'active'
			});
		}

		return markets.sort((a, b) => a.symbol.localeCompare(b.symbol));
	}
}
