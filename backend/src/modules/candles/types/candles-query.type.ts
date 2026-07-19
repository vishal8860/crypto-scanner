import { CandleInterval } from './candle-interval.type.js';

export interface CandlesQuery {
  readonly symbol: string;
  readonly interval: CandleInterval;
  readonly limit: number;
}
