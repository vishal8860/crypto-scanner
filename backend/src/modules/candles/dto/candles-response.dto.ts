import { Candle } from '../interfaces/candle.interface.js';
import { CandleInterval } from '../types/candle-interval.type.js';

export interface CandlesResponseDto {
  readonly data: readonly Candle[];
  readonly meta: {
    readonly symbol: string;
    readonly interval: CandleInterval;
    readonly limit: number;
    readonly count: number;
  };
}
