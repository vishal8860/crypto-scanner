import { AxiosInstance } from 'axios';
import { AppError } from '../../common/errors/app-error.js';
import { createAxiosClient } from '../../common/http/axios-client.js';

interface CoinGeckoMarket {
  readonly symbol: string;
  readonly market_cap: number | null;
}

interface CachedMetadata {
  readonly expiresAt: number;
  readonly marketCapsBySymbol: ReadonlyMap<string, number>;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const PAGE_SIZE = 250;
const TOTAL_PAGES = 4;

export class AssetMetadataService {
  private readonly client: AxiosInstance;
  private cache: CachedMetadata | null = null;

  public constructor(client?: AxiosInstance) {
    this.client = client ?? createAxiosClient({
      baseUrl: 'https://api.coingecko.com/api/v3',
      timeoutMs: 12_000,
      retries: 1
    });
  }

  public async getMarketCapsBySymbols(baseSymbols: readonly string[]): Promise<ReadonlyMap<string, number>> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.filterSymbols(this.cache.marketCapsBySymbol, baseSymbols);
    }

    const marketCapsBySymbol = await this.fetchMarketCaps();
    this.cache = {
      expiresAt: now + CACHE_TTL_MS,
      marketCapsBySymbol
    };

    return this.filterSymbols(marketCapsBySymbol, baseSymbols);
  }

  private async fetchMarketCaps(): Promise<ReadonlyMap<string, number>> {
    try {
      const pages = await Promise.all(
        Array.from({ length: TOTAL_PAGES }, (_, index) =>
          this.client.get<readonly CoinGeckoMarket[]>('/coins/markets', {
            params: {
              vs_currency: 'usd',
              order: 'market_cap_desc',
              per_page: PAGE_SIZE,
              page: index + 1,
              sparkline: false
            }
          })
        )
      );

      const map = new Map<string, number>();
      for (const page of pages) {
        for (const asset of page.data) {
          const symbol = asset.symbol.trim().toUpperCase();
          const marketCap = asset.market_cap;
          if (!symbol || marketCap === null || !Number.isFinite(marketCap)) {
            continue;
          }

          const existing = map.get(symbol);
          if (existing === undefined || marketCap > existing) {
            map.set(symbol, marketCap);
          }
        }
      }

      return map;
    } catch (error) {
      throw new AppError(502, `Failed to fetch asset metadata: ${this.getErrorMessage(error)}`);
    }
  }

  private filterSymbols(source: ReadonlyMap<string, number>, baseSymbols: readonly string[]): ReadonlyMap<string, number> {
    const filtered = new Map<string, number>();
    for (const symbol of baseSymbols) {
      const marketCap = source.get(symbol.toUpperCase());
      if (marketCap !== undefined) {
        filtered.set(symbol.toUpperCase(), marketCap);
      }
    }

    return filtered;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
