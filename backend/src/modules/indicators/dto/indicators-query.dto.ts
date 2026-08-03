import { CandleInterval } from '../../candles/types/candle-interval.type.js';

export interface IndicatorsQueryDto {
  readonly symbol: string;
  readonly interval: CandleInterval;
  readonly marketCapUsd?: number;
  readonly marketVolume24hUsd?: number;
  readonly minimumMarketCapUsd?: number;
  readonly minimumVolume24hUsd?: number;
}
