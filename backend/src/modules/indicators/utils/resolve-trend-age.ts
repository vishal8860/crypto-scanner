import {
  DEVELOPING_TREND_MAX_CANDLES,
  FRESH_CROSS_MAX_CANDLES
} from '../constants/indicator.constants.js';
import { TrendAge } from '../interfaces/indicator-result.interface.js';

export const resolveTrendAge = (candlesSinceEMA200Cross: number): TrendAge => {
  if (candlesSinceEMA200Cross <= FRESH_CROSS_MAX_CANDLES) {
    return 'Fresh';
  }

  if (candlesSinceEMA200Cross <= DEVELOPING_TREND_MAX_CANDLES) {
    return 'Developing';
  }

  return 'Old';
};
