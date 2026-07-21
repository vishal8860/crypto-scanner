export const countCandlesSinceEMA200Cross = (
  closes: readonly number[],
  ema200Series: readonly (number | null)[]
): number => {
  const latestIndex = closes.length - 1;

  for (let index = latestIndex; index > 0; index -= 1) {
    const previousEMA = ema200Series[index - 1];
    const currentEMA = ema200Series[index];

    if (previousEMA === null || currentEMA === null) {
      continue;
    }

    const previousClose = closes[index - 1];
    const currentClose = closes[index];

    if (
      previousClose === undefined ||
      currentClose === undefined ||
      previousEMA === undefined ||
      currentEMA === undefined
    ) {
      continue;
    }

    const crossedFromAboveToBelow = previousClose > previousEMA && currentClose <= currentEMA;

    if (crossedFromAboveToBelow) {
      return latestIndex - index;
    }
  }

  return closes.length;
};
