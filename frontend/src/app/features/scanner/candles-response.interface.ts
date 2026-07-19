import { Candle, CandleInterval } from './candle.interface';

export interface CandlesResponse {
  readonly data: readonly Candle[];
  readonly meta: {
    readonly symbol: string;
    readonly interval: CandleInterval;
    readonly limit: number;
    readonly count: number;
  };
}
