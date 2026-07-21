import { Trend, TrendAge } from './indicator-result.interface';

export interface ScannerResult {
  readonly rank: number;
  readonly symbol: string;
  readonly price: number;
  readonly score: number;
  readonly trend: Trend;
  readonly trendAge: TrendAge;
  readonly freshCross: boolean;
  readonly belowEMA200: boolean;
  readonly bearishAlignment: boolean;
  readonly distanceEMA200: number;
  readonly candlesSinceCross: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly distanceEMA20: number;
}
