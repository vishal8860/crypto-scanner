import { CandlesQuery } from '../types/candles-query.type.js';
import { Candle } from './candle.interface.js';

export interface CandleDataProvider {
  listCandles(query: CandlesQuery): Promise<readonly Candle[]>;
}
