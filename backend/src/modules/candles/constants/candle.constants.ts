export const CANDLE_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'] as const;

export const CANDLE_DEFAULT_INTERVAL = '15m' as const;
export const CANDLE_DEFAULT_LIMIT = 250;
export const CANDLE_MIN_LIMIT = 1;
export const CANDLE_MAX_LIMIT = 1000;

export const KNOWN_QUOTE_ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'INR'] as const;
