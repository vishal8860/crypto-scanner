import { CANDLE_CACHE_TTL_MS } from '../constants/candle.constants.js';
import { CandlesQueryDto } from '../dto/candles-query.dto.js';
import { CandlesResponseDto } from '../dto/candles-response.dto.js';
import { CandleDataProvider } from '../interfaces/candle-data-provider.interface.js';
import { Candle } from '../interfaces/candle.interface.js';
import { CoinDcxCandlesService } from './coindcx-candles.service.js';

interface CachedCandles {
  readonly expiresAt: number;
  readonly data: readonly Candle[];
}

const toCacheKey = (query: CandlesQueryDto): string =>
  `${query.symbol}:${query.interval}:${query.limit}`;

export class CandlesService {
  private readonly cache = new Map<string, CachedCandles>();

  public constructor(private readonly provider: CandleDataProvider = new CoinDcxCandlesService()) {}

  public async list(query: CandlesQueryDto): Promise<CandlesResponseDto> {
    const key = toCacheKey(query);
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      return {
        data: cached.data,
        meta: {
          symbol: query.symbol,
          interval: query.interval,
          limit: query.limit,
          count: cached.data.length
        }
      };
    }

    const candles = await this.provider.listCandles(query);

    this.cache.set(key, {
      data: candles,
      expiresAt: now + CANDLE_CACHE_TTL_MS
    });

    return {
      data: candles,
      meta: {
        symbol: query.symbol,
        interval: query.interval,
        limit: query.limit,
        count: candles.length
      }
    };
  }
}
