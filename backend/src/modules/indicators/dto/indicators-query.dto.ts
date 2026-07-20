import { CandleInterval } from '../../candles/types/candle-interval.type.js';

export interface IndicatorsQueryDto {
  readonly symbol: string;
  readonly interval: CandleInterval;
}
