export type ScannerMode = 'all' | 'watchlist';

export interface WatchlistDefinition {
  readonly id: string;
  readonly name: string;
  readonly symbols: readonly string[];
}

export const WATCHLIST = [
  'AAVEUSDT',
  'BILLUSDT',
  'BEATUSDT',
  'ZECUSDT',
  'LINKUSDT',
  'SOLUSDT',
  'ADAUSDT'
] as const;

export const WATCHLISTS: readonly WatchlistDefinition[] = [
  {
    id: 'professional',
    name: 'Professional',
    symbols: WATCHLIST
  }
];

export const DEFAULT_WATCHLIST_ID = 'professional';
export const DEFAULT_SCANNER_MODE: ScannerMode = 'watchlist';

export const resolveWatchlist = (id: string): WatchlistDefinition => {
  const selected = WATCHLISTS.find((watchlist) => watchlist.id === id);
  return selected ?? WATCHLISTS[0];
};
