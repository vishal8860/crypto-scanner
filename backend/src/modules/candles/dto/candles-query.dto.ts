import { CandleInterval } from '../types/candle-interval.type.js';

export interface CandlesQueryDto {
  readonly symbol: string;
  readonly interval: CandleInterval;
  readonly limit: number;
}
