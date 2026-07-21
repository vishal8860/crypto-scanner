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

export const TREND_AGE_VALUES = ['Fresh', 'Developing', 'Old'] as const;

export const FRESH_CROSS_MAX_CANDLES = 8;
export const DEVELOPING_TREND_MAX_CANDLES = 20;

export const DISTANCE_BELOW_EMA200_BONUS_PERCENT = 3;
export const DISTANCE_BELOW_EMA200_PENALTY_PERCENT = 8;

export const SCORE_WEIGHTS = {
  belowEMA200: 25,
  bearishAlignment: 25,
  freshCross: 25,
  closeToEMA200: 25,
  farBelowEMA200Penalty: -20,
  oldTrendPenalty: -15
} as const;

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
