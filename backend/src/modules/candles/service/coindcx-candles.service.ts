import { AxiosInstance } from 'axios';
import { AppError } from '../../../common/errors/app-error.js';
import { createAxiosClient } from '../../../common/http/axios-client.js';
import { environment } from '../../../config/environment.js';
import { KNOWN_QUOTE_ASSETS } from '../constants/candle.constants.js';
import { CandleDataProvider } from '../interfaces/candle-data-provider.interface.js';
import { Candle } from '../interfaces/candle.interface.js';
import { CoinDcxCandle } from '../interfaces/coindcx-candle.interface.js';
import { CandlesQuery } from '../types/candles-query.type.js';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeCandle = (raw: CoinDcxCandle): Candle | null => {
  if (
    !isFiniteNumber(raw.time) ||
    !isFiniteNumber(raw.open) ||
    !isFiniteNumber(raw.high) ||
    !isFiniteNumber(raw.low) ||
    !isFiniteNumber(raw.close) ||
    !isFiniteNumber(raw.volume)
  ) {
    return null;
  }

  return {
    timestamp: raw.time,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    close: raw.close,
    volume: raw.volume
  };
};

const symbolToPair = (symbol: string): string => {
  for (const quoteAsset of KNOWN_QUOTE_ASSETS) {
    if (symbol.endsWith(quoteAsset) && symbol.length > quoteAsset.length) {
      const baseAsset = symbol.slice(0, symbol.length - quoteAsset.length);
      return `B-${baseAsset}_${quoteAsset}`;
    }
  }

  throw new AppError(400, `Unsupported symbol format: ${symbol}`);
};

export class CoinDcxCandlesService implements CandleDataProvider {
  private readonly client: AxiosInstance;

  public constructor(client?: AxiosInstance) {
    this.client =
      client ??
      createAxiosClient({
        baseUrl: environment.coinDcxPublicApiBaseUrl,
        timeoutMs: environment.coinDcxApiTimeoutMs,
        retries: environment.coinDcxApiRetries
      });
  }

  public async listCandles(query: CandlesQuery): Promise<readonly Candle[]> {
    const startedAt = Date.now();

    try {
      const pair = symbolToPair(query.symbol);
      const response = await this.client.get<readonly CoinDcxCandle[]>('/market_data/candles', {
        params: {
          pair,
          interval: query.interval,
          limit: query.limit
        }
      });

      const normalized = response.data
        .map((entry) => normalizeCandle(entry))
        .filter((entry): entry is Candle => entry !== null)
        .sort((a, b) => a.timestamp - b.timestamp);

      console.info(
        JSON.stringify({
          module: 'coindcx-candles-service',
          symbol: query.symbol,
          interval: query.interval,
          limit: query.limit,
          count: normalized.length,
          durationMs: Date.now() - startedAt
        })
      );

      return normalized;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(502, `Failed to fetch candles from CoinDCX: ${message}`);
    }
  }
}
