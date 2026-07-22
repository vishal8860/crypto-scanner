import {
  EMA9_SLOPE_LOOKBACK,
  EMA20_SLOPE_LOOKBACK,
  MOMENTUM_LOOKBACK,
  MOMENTUM_SCORE_FULL_DECLINE_PERCENT,
  SCORE_MAX,
  SCORE_MIN,
  SIDEWAYS_MAX_DISTANCE_FROM_EMA200_PERCENT,
  SIDEWAYS_MIN_SIGN_FLIPS,
  SIDEWAYS_OSCILLATION_LOOKBACK,
  SIDEWAYS_PENALTY_HEAVY,
  SIDEWAYS_PENALTY_LIGHT,
  SIDEWAYS_PENALTY_MEDIUM,
  SIDEWAYS_PRICE_SIGN_FLIPS_MIN,
  SIDEWAYS_TIGHT_RANGE_MAX_PERCENT,
  SIDEWAYS_LOW_ATR_MAX_PERCENT,
  SLOPE_FLAT_THRESHOLD_PERCENT,
  SLOPE_MODERATE_DOWN_THRESHOLD_PERCENT,
  SLOPE_SCORE_FULL_DECLINE_PERCENT,
  SLOPE_STRONG_DOWN_THRESHOLD_PERCENT,
  TREND_STRENGTH_MAX,
  TREND_STRENGTH_MIN,
  VOLUME_AVERAGE_PERIOD,
  VOLUME_SCORE_RATIO_BASE,
  VOLUME_SCORE_RATIO_EXCELLENT,
  VOLUME_SCORE_RATIO_FAIR,
  VOLUME_SCORE_RATIO_GOOD,
  VOLUME_SCORE_RATIO_STRONG,
  VOLUME_QUALITY_EXCELLENT_THRESHOLD,
  VOLUME_QUALITY_GOOD_THRESHOLD,
  VOLUME_QUALITY_POOR_THRESHOLD
} from '../constants/indicator.constants.js';
import {
  SlopeCategory,
  Trend,
  VolumeQuality
} from '../interfaces/indicator-result.interface.js';

export interface TrendScoringInput {
  readonly price: number;
  readonly closes: readonly number[];
  readonly volumes: readonly number[];
  readonly ema9Series: readonly (number | null)[];
  readonly ema20Series: readonly (number | null)[];
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly ema9SlopePercent: number;
  readonly ema20SlopePercent: number;
  readonly ema200SlopePercent: number;
  readonly distanceFromEMA200Percent: number;
  readonly candlesSinceEMA200Cross: number;
  readonly isBearishAlignment: boolean;
  readonly trend: Trend;
}

export interface TrendScoringOutput {
  readonly ema20SlopeCategory: SlopeCategory;
  readonly ema200SlopeCategory: SlopeCategory;
  readonly trendStrengthScore: number;
  readonly isSideways: boolean;
  readonly sidewaysScore: number;
  readonly volumeQuality: VolumeQuality;
  readonly emaDistanceScore: number;
  readonly trendAgeScore: number;
  readonly alignmentScore: number;
  readonly slopeScore: number;
  readonly volumeScore: number;
  readonly momentumScore: number;
  readonly sidewaysPenalty: number;
  readonly finalScore: number;
  readonly scannerScore: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const average = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export class TrendScoringService {
  public categorizeSlope(slopePercent: number): SlopeCategory {
    if (slopePercent <= SLOPE_STRONG_DOWN_THRESHOLD_PERCENT) {
      return 'Strong Down';
    }

    if (slopePercent <= SLOPE_MODERATE_DOWN_THRESHOLD_PERCENT) {
      return 'Moderate Down';
    }

    if (Math.abs(slopePercent) <= SLOPE_FLAT_THRESHOLD_PERCENT) {
      return 'Flat';
    }

    return 'Rising';
  }

  public resolveVolumeQuality(volumes: readonly number[]): VolumeQuality {
    if (volumes.length === 0) {
      return 'Poor';
    }

    const latest = volumes[volumes.length - 1];
    if (latest === undefined) {
      return 'Poor';
    }

    const window = volumes.slice(Math.max(0, volumes.length - VOLUME_AVERAGE_PERIOD));
    const baseline = average(window);

    if (baseline <= 0) {
      return 'Poor';
    }

    const ratio = latest / baseline;

    if (ratio < VOLUME_QUALITY_POOR_THRESHOLD) {
      return 'Poor';
    }

    if (ratio < VOLUME_QUALITY_GOOD_THRESHOLD) {
      return 'Average';
    }

    if (ratio < VOLUME_QUALITY_EXCELLENT_THRESHOLD) {
      return 'Good';
    }

    return 'Excellent';
  }

  public calculateTrendStrength(input: {
    readonly ema20SlopeCategory: SlopeCategory;
    readonly ema200SlopeCategory: SlopeCategory;
    readonly isBearishAlignment: boolean;
    readonly trend: Trend;
  }): number {
    let score = 0;

    if (input.isBearishAlignment) {
      score += 4;
    } else if (input.trend === 'Bullish') {
      score += 2;
    } else {
      score += 1;
    }

    score += this.slopeWeightForTrendStrength(input.ema20SlopeCategory, true);
    score += this.slopeWeightForTrendStrength(input.ema200SlopeCategory, false);

    if (input.trend === 'Bearish') {
      score += 1;
    }

    return clamp(score, TREND_STRENGTH_MIN, TREND_STRENGTH_MAX);
  }

  public score(input: TrendScoringInput): TrendScoringOutput {
    const ema20SlopeCategory = this.categorizeSlope(input.ema20SlopePercent);
    const ema200SlopeCategory = this.categorizeSlope(input.ema200SlopePercent);
    const trendStrengthScore = this.calculateTrendStrength({
      ema20SlopeCategory,
      ema200SlopeCategory,
      isBearishAlignment: input.isBearishAlignment,
      trend: input.trend
    });

    const emaDistanceScore = this.scoreEMADistance(input.distanceFromEMA200Percent);
    const trendAgeScore = this.scoreTrendAge(input.candlesSinceEMA200Cross);
    const alignmentScore = this.scoreAlignment(input.ema9, input.ema20, input.ema200);
    const slopeScore = this.scoreEMASlope(input.ema9Series, input.ema20Series);
    const volumeQuality = this.resolveVolumeQuality(input.volumes);
    const volumeScore = this.scoreVolume(input.volumes);
    const momentumScore = this.scoreMomentum(input.closes);
    const sidewaysPenalty = this.resolveSidewaysPenalty({
      closes: input.closes,
      ema9Series: input.ema9Series,
      ema20Series: input.ema20Series,
      ema9SlopePercent: input.ema9SlopePercent,
      ema20SlopePercent: input.ema20SlopePercent,
      ema200SlopePercent: input.ema200SlopePercent,
      distanceFromEMA200Percent: input.distanceFromEMA200Percent
    });
    const sidewaysScore = this.resolveSidewaysScore(sidewaysPenalty);
    const isSideways = sidewaysPenalty > 0;

    const finalScore = clamp(
      emaDistanceScore + trendAgeScore + alignmentScore + slopeScore + volumeScore + momentumScore - sidewaysPenalty,
      SCORE_MIN,
      SCORE_MAX
    );

    return {
      ema20SlopeCategory,
      ema200SlopeCategory,
      trendStrengthScore,
      isSideways,
      sidewaysScore,
      volumeQuality,
      emaDistanceScore,
      trendAgeScore,
      alignmentScore,
      slopeScore,
      volumeScore,
      momentumScore,
      sidewaysPenalty,
      finalScore,
      scannerScore: finalScore
    };
  }

  private resolveSidewaysScore(sidewaysPenalty: number): number {
    if (sidewaysPenalty >= SIDEWAYS_PENALTY_HEAVY) {
      return 100;
    }

    if (sidewaysPenalty >= SIDEWAYS_PENALTY_MEDIUM) {
      return 75;
    }

    if (sidewaysPenalty >= SIDEWAYS_PENALTY_LIGHT) {
      return 50;
    }

    return 0;
  }

  private scoreEMADistance(distanceFromEMA200Percent: number): number {
    if (distanceFromEMA200Percent >= 0) {
      return 0;
    }

    if (distanceFromEMA200Percent >= -0.2) {
      return 20;
    }

    if (distanceFromEMA200Percent >= -0.5) {
      return 18;
    }

    if (distanceFromEMA200Percent >= -1) {
      return 15;
    }

    if (distanceFromEMA200Percent >= -2) {
      return 10;
    }

    if (distanceFromEMA200Percent >= -3) {
      return 6;
    }

    return 2;
  }

  private scoreTrendAge(candlesSinceCross: number): number {
    if (candlesSinceCross >= 10) {
      return 0;
    }

    return Math.max(0, 20 - candlesSinceCross * 2);
  }

  private scoreAlignment(ema9: number, ema20: number, ema200: number): number {
    const conditionOne = ema9 < ema20;
    const conditionTwo = ema20 < ema200;

    if (conditionOne && conditionTwo) {
      return 20;
    }

    if (conditionOne || conditionTwo) {
      return 10;
    }

    return 0;
  }

  private scoreEMASlope(
    ema9Series: readonly (number | null)[],
    ema20Series: readonly (number | null)[]
  ): number {
    const ema9SlopePercent = this.resolveSlopePercentFromSeries(ema9Series, EMA9_SLOPE_LOOKBACK);
    const ema20SlopePercent = this.resolveSlopePercentFromSeries(ema20Series, EMA20_SLOPE_LOOKBACK);

    const bearish9 = Math.max(0, -ema9SlopePercent);
    const bearish20 = Math.max(0, -ema20SlopePercent);
    const blendedDecline = bearish9 * 0.6 + bearish20 * 0.4;

    return roundTo(clamp((blendedDecline / SLOPE_SCORE_FULL_DECLINE_PERCENT) * 10, 0, 10), 2);
  }

  private scoreVolume(volumes: readonly number[]): number {
    const ratio = this.resolveVolumeRatio(volumes);

    if (ratio > VOLUME_SCORE_RATIO_EXCELLENT) {
      return 10;
    }

    if (ratio >= VOLUME_SCORE_RATIO_STRONG) {
      return 8;
    }

    if (ratio >= VOLUME_SCORE_RATIO_GOOD) {
      return 6;
    }

    if (ratio >= VOLUME_SCORE_RATIO_FAIR) {
      return 4;
    }

    if (ratio >= VOLUME_SCORE_RATIO_BASE) {
      return 2;
    }

    return 0;
  }

  private scoreMomentum(closes: readonly number[]): number {
    const latestIndex = closes.length - 1;
    const lookbackIndex = latestIndex - MOMENTUM_LOOKBACK;

    if (lookbackIndex < 0) {
      return 0;
    }

    const latest = closes[latestIndex];
    const previous = closes[lookbackIndex];

    if (latest === undefined || previous === undefined || previous === 0) {
      return 0;
    }

    const changePercent = ((latest - previous) / previous) * 100;

    if (changePercent >= 0) {
      return 0;
    }

    const decline = Math.abs(changePercent);
    return roundTo(clamp((decline / MOMENTUM_SCORE_FULL_DECLINE_PERCENT) * 20, 0, 20), 2);
  }

  private resolveSidewaysPenalty(input: {
    readonly closes: readonly number[];
    readonly ema9Series: readonly (number | null)[];
    readonly ema20Series: readonly (number | null)[];
    readonly ema9SlopePercent: number;
    readonly ema20SlopePercent: number;
    readonly ema200SlopePercent: number;
    readonly distanceFromEMA200Percent: number;
  }): number {
    const flatFast = Math.abs(input.ema9SlopePercent) <= SLOPE_FLAT_THRESHOLD_PERCENT;
    const flatMedium = Math.abs(input.ema20SlopePercent) <= SLOPE_FLAT_THRESHOLD_PERCENT;
    const flatSlow = Math.abs(input.ema200SlopePercent) <= SLOPE_FLAT_THRESHOLD_PERCENT;
    const nearEMA200 = Math.abs(input.distanceFromEMA200Percent) <= SIDEWAYS_MAX_DISTANCE_FROM_EMA200_PERCENT;
    const emaCrossing = this.countSeriesSignFlips(input.ema9Series, input.ema20Series) >= SIDEWAYS_MIN_SIGN_FLIPS;
    const priceOscillation = this.countPriceSignFlips(input.closes, input.ema20Series) >= SIDEWAYS_PRICE_SIGN_FLIPS_MIN;
    const tightRange = this.isTightRange(input.closes);
    const lowAtr = this.hasLowAtr(input.closes);

    const criteria = [flatFast && flatMedium, flatSlow, nearEMA200, emaCrossing, priceOscillation, tightRange, lowAtr]
      .filter(Boolean)
      .length;

    if (criteria >= 5) {
      return SIDEWAYS_PENALTY_HEAVY;
    }

    if (criteria >= 4) {
      return SIDEWAYS_PENALTY_MEDIUM;
    }

    if (criteria >= 3) {
      return SIDEWAYS_PENALTY_LIGHT;
    }

    return 0;
  }

  private slopeWeightForTrendStrength(category: SlopeCategory, isFast: boolean): number {
    if (category === 'Strong Down') {
      return isFast ? 3 : 2;
    }

    if (category === 'Moderate Down') {
      return isFast ? 2 : 1;
    }

    if (category === 'Flat') {
      return 0;
    }

    return isFast ? 0 : -1;
  }

  private resolveSlopePercentFromSeries(series: readonly (number | null)[], lookback: number): number {
    const latestIndex = series.length - 1;
    const previousIndex = latestIndex - lookback;

    if (previousIndex < 0) {
      return 0;
    }

    const current = series[latestIndex];
    const previous = series[previousIndex];

    if (current === null || previous === null || current === undefined || previous === undefined || previous === 0) {
      return 0;
    }

    return ((current - previous) / Math.abs(previous)) * 100;
  }

  private resolveVolumeRatio(volumes: readonly number[]): number {
    if (volumes.length === 0) {
      return 0;
    }

    const latest = volumes[volumes.length - 1];
    if (latest === undefined) {
      return 0;
    }

    const window = volumes.slice(Math.max(0, volumes.length - VOLUME_AVERAGE_PERIOD));
    const baseline = average(window);

    if (baseline <= 0) {
      return 0;
    }

    return latest / baseline;
  }

  private countSeriesSignFlips(
    seriesA: readonly (number | null)[],
    seriesB: readonly (number | null)[]
  ): number {
    const startIndex = Math.max(0, seriesA.length - SIDEWAYS_OSCILLATION_LOOKBACK);
    let flips = 0;
    let previousSign = 0;

    for (let index = startIndex; index < seriesA.length; index += 1) {
      const left = seriesA[index];
      const right = seriesB[index];

      if (left === null || right === null || left === undefined || right === undefined) {
        continue;
      }

      const delta = left - right;
      const sign = delta > 0 ? 1 : delta < 0 ? -1 : 0;

      if (sign === 0) {
        continue;
      }

      if (previousSign !== 0 && previousSign !== sign) {
        flips += 1;
      }

      previousSign = sign;
    }

    return flips;
  }

  private countPriceSignFlips(closes: readonly number[], ema20Series: readonly (number | null)[]): number {
    const startIndex = Math.max(0, closes.length - SIDEWAYS_OSCILLATION_LOOKBACK);
    let flips = 0;
    let previousSign = 0;

    for (let index = startIndex; index < closes.length; index += 1) {
      const close = closes[index];
      const ema20 = ema20Series[index];

      if (close === undefined || ema20 === null || ema20 === undefined) {
        continue;
      }

      const delta = close - ema20;
      const sign = delta > 0 ? 1 : delta < 0 ? -1 : 0;

      if (sign === 0) {
        continue;
      }

      if (previousSign !== 0 && previousSign !== sign) {
        flips += 1;
      }

      previousSign = sign;
    }

    return flips;
  }

  private isTightRange(closes: readonly number[]): boolean {
    const tail = closes.slice(Math.max(0, closes.length - SIDEWAYS_OSCILLATION_LOOKBACK));

    if (tail.length < 2) {
      return false;
    }

    const high = Math.max(...tail);
    const low = Math.min(...tail);
    const avg = average(tail);

    if (avg <= 0) {
      return false;
    }

    const rangePercent = ((high - low) / avg) * 100;
    return rangePercent <= SIDEWAYS_TIGHT_RANGE_MAX_PERCENT;
  }

  private hasLowAtr(closes: readonly number[]): boolean {
    const tail = closes.slice(Math.max(0, closes.length - SIDEWAYS_OSCILLATION_LOOKBACK));

    if (tail.length < 3) {
      return false;
    }

    const absoluteMoves: number[] = [];

    for (let index = 1; index < tail.length; index += 1) {
      const current = tail[index];
      const previous = tail[index - 1];

      if (current === undefined || previous === undefined) {
        continue;
      }

      absoluteMoves.push(Math.abs(current - previous));
    }

    if (absoluteMoves.length === 0) {
      return false;
    }

    const avgClose = average(tail);
    if (avgClose <= 0) {
      return false;
    }

    const atrPercent = (average(absoluteMoves) / avgClose) * 100;
    return atrPercent <= SIDEWAYS_LOW_ATR_MAX_PERCENT;
  }

}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};
