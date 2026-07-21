import { AppError } from '../../../common/errors/app-error.js';

export const calculateEMASeries = (values: readonly number[], period: number): readonly (number | null)[] => {
  if (period <= 0) {
    throw new AppError(500, 'EMA period must be greater than zero');
  }

  if (values.length < period) {
    throw new AppError(400, `Not enough candle data to calculate EMA${period} series`);
  }

  const series: Array<number | null> = Array.from({ length: values.length }, () => null);
  const smoothing = 2 / (period + 1);

  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  series[period - 1] = seed;

  let ema = seed;
  for (let index = period; index < values.length; index += 1) {
    const value = values[index];

    if (value === undefined) {
      break;
    }

    ema = (value - ema) * smoothing + ema;
    series[index] = ema;
  }

  return series;
};
