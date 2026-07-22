import { AppError } from '../../../common/errors/app-error.js';
import { CANDLE_DEFAULT_LIMIT } from '../../candles/constants/candle.constants.js';
import { CandlesService } from '../../candles/service/candles.service.js';
import { IndicatorsQueryDto } from '../dto/indicators-query.dto.js';
import { IndicatorsResponseDto } from '../dto/indicators-response.dto.js';
import {
  EMA_PERIODS,
  EMA200_SLOPE_LOOKBACK,
  EMA9_SLOPE_LOOKBACK,
  EMA20_SLOPE_LOOKBACK,
  INDICATOR_CANDLE_LIMIT
} from '../constants/indicator.constants.js';
import {
  IndicatorResult,
  Trend,
  TrendClassification
} from '../interfaces/indicator-result.interface.js';
import { calculateEMA } from '../utils/calculate-ema.js';
import { calculateEMASeries } from '../utils/calculate-ema-series.js';
import { countCandlesSinceEMA200Cross } from '../utils/count-candles-since-ema200-cross.js';
import { resolveTrendAge } from '../utils/resolve-trend-age.js';
import { EntryPlannerService } from './entry-planner.service.js';
import { TradeEligibilityService } from './trade-eligibility.service.js';
import { TradeStageService } from './trade-stage.service.js';
import { TrendScoringService } from './trend-scoring.service.js';

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

const toSlopePercent = (
  series: readonly (number | null)[],
  lookback: number,
  label: string
): number => {
  const latestIndex = series.length - 1;
  const previousIndex = latestIndex - lookback;

  if (previousIndex < 0) {
    throw new AppError(400, `Not enough data points to calculate ${label}`);
  }

  const current = series[latestIndex];
  const previous = series[previousIndex];

  if (current === null || previous === null || current === undefined || previous === undefined) {
    throw new AppError(400, `Missing EMA values to calculate ${label}`);
  }

  if (previous === 0) {
    throw new AppError(500, `Invalid EMA baseline for ${label}`);
  }

  return ((current - previous) / Math.abs(previous)) * 100;
};

const resolvePriceEfficiency = (
  closes: readonly number[],
  currentPrice: number,
  candlesSinceEMA200Cross: number
): number => {
  const latestIndex = closes.length - 1;
  const crossIndex = Math.max(0, latestIndex - candlesSinceEMA200Cross);
  const crossPrice = closes[crossIndex];

  if (crossPrice === undefined || crossPrice === 0) {
    throw new AppError(400, 'Unable to determine cross price for efficiency');
  }

  const movePercent = ((crossPrice - currentPrice) / crossPrice) * 100;
  const candleSpan = Math.max(1, latestIndex - crossIndex);

  return movePercent / candleSpan;
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
  public constructor(
    private readonly candlesService: CandlesService = new CandlesService(),
    private readonly trendScoringService: TrendScoringService = new TrendScoringService(),
    private readonly tradeEligibilityService: TradeEligibilityService = new TradeEligibilityService(),
    private readonly tradeStageService: TradeStageService = new TradeStageService(),
    private readonly entryPlannerService: EntryPlannerService = new EntryPlannerService()
  ) {}

  public async getForMarket(query: IndicatorsQueryDto): Promise<IndicatorsResponseDto> {
    const candlesResponse = await this.candlesService.list({
      symbol: query.symbol,
      interval: query.interval,
      limit: Math.max(CANDLE_DEFAULT_LIMIT, INDICATOR_CANDLE_LIMIT)
    });

    const closes = candlesResponse.data.map((candle) => candle.close);
    const highs = candlesResponse.data.map((candle) => candle.high);
    const lows = candlesResponse.data.map((candle) => candle.low);
    const volumes = candlesResponse.data.map((candle) => candle.volume);

    if (closes.length < EMA_PERIODS.ema200) {
      throw new AppError(400, 'Not enough candle data to calculate indicators');
    }

    const price = closes[closes.length - 1];

    if (price === undefined) {
      throw new AppError(400, 'Unable to determine latest price from candles');
    }

    const ema9 = calculateEMA(closes, EMA_PERIODS.ema9);
    const ema9Series = calculateEMASeries(closes, EMA_PERIODS.ema9);
    const ema20 = calculateEMA(closes, EMA_PERIODS.ema20);
    const ema200 = calculateEMA(closes, EMA_PERIODS.ema200);
    const ema20Series = calculateEMASeries(closes, EMA_PERIODS.ema20);
    const ema200Series = calculateEMASeries(closes, EMA_PERIODS.ema200);
    const ema9SlopePercent = toSlopePercent(ema9Series, EMA9_SLOPE_LOOKBACK, 'EMA9 slope');
    const ema20SlopePercent = toSlopePercent(ema20Series, EMA20_SLOPE_LOOKBACK, 'EMA20 slope');
    const ema200SlopePercent = toSlopePercent(ema200Series, EMA200_SLOPE_LOOKBACK, 'EMA200 slope');

    const distanceFromEMA20Percent = toPercentageDistance(price, ema20);
    const distanceFromEMA200Percent = toPercentageDistance(price, ema200);
    const isBelowEMA200 = price < ema200;
    const isBearishAlignment = ema9 < ema20 && ema20 < ema200;
    const candlesSinceEMA200Cross = countCandlesSinceEMA200Cross(closes, ema200Series);
    const freshCross = candlesSinceEMA200Cross <= 3;
    const trendAge = resolveTrendAge(candlesSinceEMA200Cross);
    const trend = resolveTrend(price, ema9, ema20, ema200);
    const priceEfficiency = resolvePriceEfficiency(closes, price, candlesSinceEMA200Cross);
    const scoreResult = this.trendScoringService.score({
      price,
      closes,
      volumes,
      ema9Series,
      ema20Series,
      ema9,
      ema20,
      ema200,
      ema9SlopePercent,
      ema20SlopePercent,
      ema200SlopePercent,
      distanceFromEMA200Percent,
      candlesSinceEMA200Cross,
      isBearishAlignment,
      trend
    });
    const trendClassification = resolveTrendClassification(
      trend,
      scoreResult.trendStrengthScore,
      isBearishAlignment
    );
    const eligibility = this.tradeEligibilityService.evaluate({
      isBelowEMA200,
      trendClassification,
      trendStrengthScore: scoreResult.trendStrengthScore,
      volumeQuality: scoreResult.volumeQuality,
      sidewaysScore: scoreResult.sidewaysScore,
      trendAge,
      distanceFromEMA200Percent,
      candlesSinceEMA200Cross
    });
    const tradeStageResult = this.tradeStageService.classify({
      price,
      ema9,
      ema20,
      ema20SlopePercent,
      distanceFromEMA200Percent,
      candlesSinceEMA200Cross,
      isBearishAlignment,
      trendStrengthScore: scoreResult.trendStrengthScore,
      sidewaysScore: scoreResult.sidewaysScore,
      isBelowEMA200,
      priceEfficiency
    });
    const plan = this.entryPlannerService.plan({
      eligible: eligibility.eligible,
      tradeStage: tradeStageResult.tradeStage,
      price,
      ema9,
      ema20,
      ema200,
      distanceFromEMA20Percent,
      trendStrengthScore: scoreResult.trendStrengthScore,
      volumeQuality: scoreResult.volumeQuality,
      sidewaysScore: scoreResult.sidewaysScore,
      highs,
      lows
    });
    const effectiveScore = eligibility.eligible ? scoreResult.scannerScore : 0;

    const result: IndicatorResult = {
      symbol: query.symbol,
      price: roundTo(price, 8),
      ema9: roundTo(ema9, 8),
      ema20: roundTo(ema20, 8),
      ema200: roundTo(ema200, 8),
      ema20SlopePercent: roundTo(ema20SlopePercent, 4),
      ema20SlopeCategory: scoreResult.ema20SlopeCategory,
      ema200SlopePercent: roundTo(ema200SlopePercent, 4),
      ema200SlopeCategory: scoreResult.ema200SlopeCategory,
      trendClassification,
      trendStrengthScore: scoreResult.trendStrengthScore,
      isSideways: scoreResult.isSideways,
      sidewaysScore: scoreResult.sidewaysScore,
      volumeQuality: scoreResult.volumeQuality,
      priceEfficiency: roundTo(priceEfficiency, 4),
      eligible: eligibility.eligible,
      eligibilityReasons: eligibility.reasons,
      priority: eligibility.priority,
      tradeStage: tradeStageResult.tradeStage,
      tradeStageLabel: tradeStageResult.tradeStageLabel,
      tradeStageColor: tradeStageResult.tradeStageColor,
      tradeStageReason: tradeStageResult.tradeStageReason,
      suggestedEntry: plan.suggestedEntry === null ? null : roundTo(plan.suggestedEntry, 8),
      suggestedStopLoss: plan.suggestedStopLoss === null ? null : roundTo(plan.suggestedStopLoss, 8),
      suggestedTakeProfit: plan.suggestedTakeProfit === null ? null : roundTo(plan.suggestedTakeProfit, 8),
      riskReward: plan.riskReward === null ? null : roundTo(plan.riskReward, 2),
      entryQuality: roundTo(plan.entryQuality, 0),
      planningReason: plan.planningReason,
      emaDistanceScore: roundTo(scoreResult.emaDistanceScore, 2),
      trendAgeScore: roundTo(scoreResult.trendAgeScore, 2),
      alignmentScore: roundTo(scoreResult.alignmentScore, 2),
      slopeScore: roundTo(scoreResult.slopeScore, 2),
      volumeScore: roundTo(scoreResult.volumeScore, 2),
      momentumScore: roundTo(scoreResult.momentumScore, 2),
      sidewaysPenalty: roundTo(scoreResult.sidewaysPenalty, 2),
      finalScore: roundTo(effectiveScore, 2),
      distanceFromEMA20Percent: roundTo(distanceFromEMA20Percent, 4),
      distanceFromEMA200Percent: roundTo(distanceFromEMA200Percent, 4),
      isBelowEMA200,
      isBearishAlignment,
      trend,
      candlesSinceEMA200Cross,
      freshCross,
      trendAge,
      scannerScore: roundTo(effectiveScore, 2)
    };

    return { data: result };
  }
}

const resolveTrendClassification = (
  trend: Trend,
  trendStrengthScore: number,
  isBearishAlignment: boolean
): TrendClassification => {
  if (trend === 'Bearish') {
    if (isBearishAlignment && trendStrengthScore >= 7) {
      return 'Strong Bearish';
    }

    return 'Bearish';
  }

  if (trend === 'Bullish') {
    if (trendStrengthScore < 5) {
      return 'Weak Bullish';
    }

    return 'Bullish';
  }

  return 'Neutral';
};
