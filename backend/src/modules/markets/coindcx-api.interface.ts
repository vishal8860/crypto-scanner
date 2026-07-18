export type CoinDcxFuturesInstrument = string;

export interface CoinDcxTicker {
  readonly market: string;
  readonly last_price: string;
  readonly change_24_hour: string;
  readonly volume: string;
}
