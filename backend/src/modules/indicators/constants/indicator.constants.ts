import { CANDLE_DEFAULT_INTERVAL, CANDLE_INTERVALS } from '../../candles/constants/candle.constants.js';

export const INDICATOR_SUPPORTED_INTERVALS = CANDLE_INTERVALS;
export const INDICATOR_DEFAULT_INTERVAL = CANDLE_DEFAULT_INTERVAL;
export const INDICATOR_CANDLE_LIMIT = 250;

export const EMA_PERIODS = {
  ema9: 9,
  ema20: 20,
  ema200: 200
} as const;

export const TREND_VALUES = ['Bullish', 'Bearish', 'Neutral'] as const;
