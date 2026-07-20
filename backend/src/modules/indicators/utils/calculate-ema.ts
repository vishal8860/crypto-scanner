import { AppError } from '../../../common/errors/app-error.js';

export const calculateEMA = (values: readonly number[], period: number): number => {
  if (period <= 0) {
    throw new AppError(500, 'EMA period must be greater than zero');
  }

  if (values.length < period) {
    throw new AppError(400, `Not enough candle data to calculate EMA${period}`);
  }

  const smoothing = 2 / (period + 1);
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  return values.slice(period).reduce((ema, value) => (value - ema) * smoothing + ema, seed);
};
