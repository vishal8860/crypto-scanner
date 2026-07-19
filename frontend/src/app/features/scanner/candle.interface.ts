export interface Candle {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export type CandleInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d';
