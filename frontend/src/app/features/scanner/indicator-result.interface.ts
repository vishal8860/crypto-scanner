export type Trend = 'Bullish' | 'Bearish' | 'Neutral';

export interface IndicatorResult {
  readonly symbol: string;
  readonly price: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly distanceFromEMA20: number;
  readonly distanceFromEMA200: number;
  readonly isBelowEMA200: boolean;
  readonly isBearishAlignment: boolean;
  readonly trend: Trend;
}
