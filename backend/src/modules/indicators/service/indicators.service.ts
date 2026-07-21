import { AppError } from '../../../common/errors/app-error.js';
import { CANDLE_DEFAULT_LIMIT } from '../../candles/constants/candle.constants.js';
import { CandlesService } from '../../candles/service/candles.service.js';
import { IndicatorsQueryDto } from '../dto/indicators-query.dto.js';
import { IndicatorsResponseDto } from '../dto/indicators-response.dto.js';
import {
  EMA_PERIODS,
  FRESH_CROSS_MAX_CANDLES,
  INDICATOR_CANDLE_LIMIT
} from '../constants/indicator.constants.js';
import { IndicatorResult, Trend } from '../interfaces/indicator-result.interface.js';
import { calculateEMA } from '../utils/calculate-ema.js';
import { calculateEMASeries } from '../utils/calculate-ema-series.js';
import { calculateScannerScore } from '../utils/calculate-scanner-score.js';
import { countCandlesSinceEMA200Cross } from '../utils/count-candles-since-ema200-cross.js';
import { resolveTrendAge } from '../utils/resolve-trend-age.js';

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const toPercentageDistance = (price: number, ema: number): number => {
  if (ema === 0) {
    throw new AppError(500, 'EMA value is zero; cannot compute percentage distance');
  }

  return ((price - ema) / ema) * 100;
};

const resolveTrend = (price: number, ema9: number, ema20: number, ema200: number): Trend => {
  const isBullish = price > ema20 && ema9 > ema20 && ema20 > ema200;
  if (isBullish) {
    return 'Bullish';
  }

  const isBearish = price < ema20 && ema9 < ema20 && ema20 < ema200;
  if (isBearish) {
    return 'Bearish';
  }

  return 'Neutral';
};

export class IndicatorsService {
  public constructor(private readonly candlesService: CandlesService = new CandlesService()) {}

  public async getForMarket(query: IndicatorsQueryDto): Promise<IndicatorsResponseDto> {
    const candlesResponse = await this.candlesService.list({
      symbol: query.symbol,
      interval: query.interval,
      limit: Math.max(CANDLE_DEFAULT_LIMIT, INDICATOR_CANDLE_LIMIT)
    });

    const closes = candlesResponse.data.map((candle) => candle.close);

    if (closes.length < EMA_PERIODS.ema200) {
      throw new AppError(400, 'Not enough candle data to calculate indicators');
    }

    const price = closes[closes.length - 1];

    if (price === undefined) {
      throw new AppError(400, 'Unable to determine latest price from candles');
    }

    const ema9 = calculateEMA(closes, EMA_PERIODS.ema9);
    const ema20 = calculateEMA(closes, EMA_PERIODS.ema20);
    const ema200 = calculateEMA(closes, EMA_PERIODS.ema200);
    const ema200Series = calculateEMASeries(closes, EMA_PERIODS.ema200);

    const distanceFromEMA20Percent = toPercentageDistance(price, ema20);
    const distanceFromEMA200Percent = toPercentageDistance(price, ema200);
    const isBelowEMA200 = price < ema200;
    const isBearishAlignment = ema9 < ema20 && ema20 < ema200;
    const candlesSinceEMA200Cross = countCandlesSinceEMA200Cross(closes, ema200Series);
    const freshCross = candlesSinceEMA200Cross <= FRESH_CROSS_MAX_CANDLES;
    const trendAge = resolveTrendAge(candlesSinceEMA200Cross);
    const scannerScore = calculateScannerScore({
      isBelowEMA200,
      isBearishAlignment,
      freshCross,
      distanceFromEMA200Percent,
      trendAge
    });

    const result: IndicatorResult = {
      symbol: query.symbol,
      price: roundTo(price, 8),
      ema9: roundTo(ema9, 8),
      ema20: roundTo(ema20, 8),
      ema200: roundTo(ema200, 8),
      distanceFromEMA20Percent: roundTo(distanceFromEMA20Percent, 4),
      distanceFromEMA200Percent: roundTo(distanceFromEMA200Percent, 4),
      isBelowEMA200,
      isBearishAlignment,
      trend: resolveTrend(price, ema9, ema20, ema200),
      candlesSinceEMA200Cross,
      freshCross,
      trendAge,
      scannerScore
    };

    return { data: result };
  }
}
