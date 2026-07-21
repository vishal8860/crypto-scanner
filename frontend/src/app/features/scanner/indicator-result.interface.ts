export type Trend = 'Bullish' | 'Bearish' | 'Neutral';
export type TrendAge = 'Fresh' | 'Developing' | 'Old';

export interface IndicatorResult {
  readonly symbol: string;
  readonly price: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly distanceFromEMA20Percent: number;
  readonly distanceFromEMA200Percent: number;
  readonly isBelowEMA200: boolean;
  readonly isBearishAlignment: boolean;
  readonly trend: Trend;
  readonly candlesSinceEMA200Cross: number;
  readonly freshCross: boolean;
  readonly trendAge: TrendAge;
  readonly scannerScore: number;
}
