import {
  EARLY_BREAKDOWN_MAX_CANDLES_SINCE_CROSS,
  EARLY_BREAKDOWN_MAX_SIDEWAYS_SCORE,
  EARLY_BREAKDOWN_MIN_TREND_STRENGTH,
  LATE_TREND_DISTANCE_FROM_EMA200_PERCENT,
  LATE_TREND_LOW_PRICE_EFFICIENCY,
  LATE_TREND_OLD_MIN_CANDLES_SINCE_CROSS,
  LATE_TREND_WEAKENING_TREND_STRENGTH,
  PULLBACK_ENTRY_MAX_CANDLES_SINCE_CROSS,
  PULLBACK_ENTRY_MAX_SIDEWAYS_SCORE,
  PULLBACK_ENTRY_MIN_CANDLES_SINCE_CROSS,
  PULLBACK_ENTRY_MIN_TREND_STRENGTH,
  PULLBACK_ENTRY_NEAR_EMA_MAX_DISTANCE_PERCENT,
  SIDEWAYS_STAGE_MAX_SCORE,
  SIDEWAYS_STAGE_MIN_TREND_STRENGTH,
  TREND_CONTINUATION_MIN_CANDLES_SINCE_CROSS,
  TREND_CONTINUATION_MIN_TREND_STRENGTH
} from '../constants/indicator.constants.js';
import { TradeStage } from '../interfaces/indicator-result.interface.js';

export interface TradeStageInput {
  readonly price: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema20SlopePercent: number;
  readonly distanceFromEMA200Percent: number;
  readonly candlesSinceEMA200Cross: number;
  readonly isBearishAlignment: boolean;
  readonly trendStrengthScore: number;
  readonly sidewaysScore: number;
  readonly isBelowEMA200: boolean;
  readonly priceEfficiency: number;
}

export interface TradeStageResult {
  readonly tradeStage: TradeStage;
  readonly tradeStageLabel: string;
  readonly tradeStageColor: 'green' | 'blue' | 'orange' | 'red' | 'neutral';
  readonly tradeStageReason: string;
}

const toDistancePercent = (price: number, ema: number): number => {
  if (ema === 0) {
    return 0;
  }

  return ((price - ema) / ema) * 100;
};

const stageResult = (
  tradeStage: TradeStage,
  tradeStageLabel: string,
  tradeStageColor: 'green' | 'blue' | 'orange' | 'red' | 'neutral',
  tradeStageReason: string
): TradeStageResult => ({
  tradeStage,
  tradeStageLabel,
  tradeStageColor,
  tradeStageReason
});

export class TradeStageService {
  public classify(input: TradeStageInput): TradeStageResult {
    if (this.isSideways(input)) {
      return stageResult(
        'SIDEWAYS',
        'Sideways',
        'neutral',
        'Market is ranging with weak directional conviction; wait for structure to break.'
      );
    }

    if (this.isEarlyBreakdown(input)) {
      return stageResult(
        'EARLY_BREAKDOWN',
        'Early Breakdown',
        'green',
        'Fresh EMA200 breakdown with strong bearish alignment and momentum.'
      );
    }

    if (this.isPullbackEntry(input)) {
      return stageResult(
        'PULLBACK_ENTRY',
        'Pullback Entry',
        'blue',
        'Trend is established and price is retesting fast EMAs while bearish conditions hold.'
      );
    }

    if (this.isTrendContinuation(input)) {
      return stageResult(
        'TREND_CONTINUATION',
        'Trend Continuation',
        'orange',
        'Bearish trend remains active below EMA200 with continued EMA20 downside slope.'
      );
    }

    if (this.isLateTrend(input)) {
      return stageResult(
        'LATE_TREND',
        'Late Trend',
        'red',
        'Trend is mature or extended; risk of chasing increases and follow-through can weaken.'
      );
    }

    return stageResult(
      'LATE_TREND',
      'Late Trend',
      'red',
      'Setup is valid but lacks early-cycle characteristics; treat as late-stage continuation risk.'
    );
  }

  private isSideways(input: TradeStageInput): boolean {
    return input.sidewaysScore > SIDEWAYS_STAGE_MAX_SCORE || input.trendStrengthScore < SIDEWAYS_STAGE_MIN_TREND_STRENGTH;
  }

  private isEarlyBreakdown(input: TradeStageInput): boolean {
    return (
      input.candlesSinceEMA200Cross <= EARLY_BREAKDOWN_MAX_CANDLES_SINCE_CROSS &&
      input.isBearishAlignment &&
      input.trendStrengthScore >= EARLY_BREAKDOWN_MIN_TREND_STRENGTH &&
      input.sidewaysScore <= EARLY_BREAKDOWN_MAX_SIDEWAYS_SCORE
    );
  }

  private isPullbackEntry(input: TradeStageInput): boolean {
    const inCrossWindow =
      input.candlesSinceEMA200Cross >= PULLBACK_ENTRY_MIN_CANDLES_SINCE_CROSS &&
      input.candlesSinceEMA200Cross <= PULLBACK_ENTRY_MAX_CANDLES_SINCE_CROSS;

    const distanceToEMA9 = Math.abs(toDistancePercent(input.price, input.ema9));
    const distanceToEMA20 = Math.abs(toDistancePercent(input.price, input.ema20));
    const nearFastEMA =
      distanceToEMA9 <= PULLBACK_ENTRY_NEAR_EMA_MAX_DISTANCE_PERCENT ||
      distanceToEMA20 <= PULLBACK_ENTRY_NEAR_EMA_MAX_DISTANCE_PERCENT;

    return (
      inCrossWindow &&
      nearFastEMA &&
      input.isBearishAlignment &&
      input.trendStrengthScore >= PULLBACK_ENTRY_MIN_TREND_STRENGTH &&
      input.sidewaysScore <= PULLBACK_ENTRY_MAX_SIDEWAYS_SCORE
    );
  }

  private isTrendContinuation(input: TradeStageInput): boolean {
    return (
      input.candlesSinceEMA200Cross >= TREND_CONTINUATION_MIN_CANDLES_SINCE_CROSS &&
      input.trendStrengthScore >= TREND_CONTINUATION_MIN_TREND_STRENGTH &&
      input.isBelowEMA200 &&
      input.ema20SlopePercent < 0
    );
  }

  private isLateTrend(input: TradeStageInput): boolean {
    const isOldTrend = input.candlesSinceEMA200Cross >= LATE_TREND_OLD_MIN_CANDLES_SINCE_CROSS;
    const deeplyExtended = input.distanceFromEMA200Percent <= LATE_TREND_DISTANCE_FROM_EMA200_PERCENT;
    const efficiencyDropping = input.priceEfficiency < LATE_TREND_LOW_PRICE_EFFICIENCY;
    const strengthDropping = input.trendStrengthScore <= LATE_TREND_WEAKENING_TREND_STRENGTH;

    return isOldTrend && (deeplyExtended || efficiencyDropping || strengthDropping);
  }
}
