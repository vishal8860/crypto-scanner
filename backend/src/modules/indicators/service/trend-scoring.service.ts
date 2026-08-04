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
  TREND_QUALITY_AVERAGE_MIN,
  TREND_QUALITY_EXCELLENT_MIN,
  TREND_QUALITY_GOOD_MIN,
  TREND_QUALITY_HEAVY_EMA20_CROSS_COUNT,
  TREND_QUALITY_HEAVY_FAKE_BREAKOUT_COUNT,
  TREND_QUALITY_LOOKBACK,
  TREND_QUALITY_MAX_SCORE,
  TREND_QUALITY_PULLBACK_BODY_RATIO_GOOD,
  TREND_QUALITY_PULLBACK_BODY_RATIO_POOR,
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
  TrendGrade,
  VolumeQuality
} from '../interfaces/indicator-result.interface.js';

export interface TrendScoringInput {
  readonly price: number;
  readonly opens: readonly number[];
  readonly highs: readonly number[];
  readonly lows: readonly number[];
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
  readonly trendQualityScore: number;
  readonly trendQualityLabel: TrendGrade;
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
    const trendQualityScore = this.resolveTrendQualityScore({
      opens: input.opens,
      highs: input.highs,
      lows: input.lows,
      closes: input.closes,
      ema20Series: input.ema20Series,
      sidewaysPenalty
    });
    const trendQualityLabel = this.resolveTrendQualityLabel(trendQualityScore);

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
      trendQualityScore,
      trendQualityLabel,
      finalScore,
      scannerScore: finalScore
    };
  }

  private resolveTrendQualityLabel(score: number): TrendGrade {
    if (score >= TREND_QUALITY_EXCELLENT_MIN) {
      return 'Excellent';
    }

    if (score >= TREND_QUALITY_GOOD_MIN) {
      return 'Good';
    }

    if (score >= TREND_QUALITY_AVERAGE_MIN) {
      return 'Average';
    }

    return 'Poor';
  }

  private resolveTrendQualityScore(input: {
    readonly opens: readonly number[];
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly closes: readonly number[];
    readonly ema20Series: readonly (number | null)[];
    readonly sidewaysPenalty: number;
  }): number {
    const tail = this.sliceTrendQualityWindow(input);
    if (tail.closes.length < 12) {
      return 0;
    }

    const crosses = this.countPriceCrossesEMA20(tail.closes, tail.ema20Series);
    const persistence = 1 - clamp(crosses / TREND_QUALITY_HEAVY_EMA20_CROSS_COUNT, 0, 1);

    const overlap = this.averageCandleOverlap(tail.highs, tail.lows);
    const alternation = this.alternatingBodyRatio(tail.opens, tail.closes);
    const wickNoise = this.averageWickNoise(tail.opens, tail.highs, tail.lows, tail.closes);
    const swingConsistency = this.swingConsistency(tail.highs, tail.lows);
    const pullbackDiscipline = this.pullbackDiscipline(tail.opens, tail.closes);
    const impulsePersistence = this.impulsePersistence(tail.opens, tail.highs, tail.lows, tail.closes);
    const slopeSmoothness = this.slopeSmoothness(tail.ema20Series);
    const fakeBreakoutCount = this.countFakeBreakouts(tail.lows, tail.closes);
    const fakeBreakoutPenalty = clamp(fakeBreakoutCount / TREND_QUALITY_HEAVY_FAKE_BREAKOUT_COUNT, 0, 1);
    const sidewaysDrag = clamp(input.sidewaysPenalty / SIDEWAYS_PENALTY_HEAVY, 0, 1);

    const qualityFactor =
      persistence * 0.24 +
      swingConsistency * 0.2 +
      impulsePersistence * 0.16 +
      pullbackDiscipline * 0.14 +
      slopeSmoothness * 0.12 +
      (1 - overlap) * 0.06 +
      (1 - alternation) * 0.04 +
      (1 - wickNoise) * 0.02 +
      (1 - fakeBreakoutPenalty) * 0.02;

    const normalized = qualityFactor * TREND_QUALITY_MAX_SCORE;
    const adjusted = normalized - sidewaysDrag * 2;

    return roundTo(clamp(adjusted, 0, TREND_QUALITY_MAX_SCORE), 2);
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

  private sliceTrendQualityWindow(input: {
    readonly opens: readonly number[];
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly closes: readonly number[];
    readonly ema20Series: readonly (number | null)[];
  }): {
    readonly opens: readonly number[];
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly closes: readonly number[];
    readonly ema20Series: readonly (number | null)[];
  } {
    const startIndex = Math.max(0, input.closes.length - TREND_QUALITY_LOOKBACK);

    return {
      opens: input.opens.slice(startIndex),
      highs: input.highs.slice(startIndex),
      lows: input.lows.slice(startIndex),
      closes: input.closes.slice(startIndex),
      ema20Series: input.ema20Series.slice(startIndex)
    };
  }

  private countPriceCrossesEMA20(closes: readonly number[], ema20Series: readonly (number | null)[]): number {
    let crosses = 0;
    let previousSign = 0;

    for (let index = 0; index < closes.length; index += 1) {
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
        crosses += 1;
      }

      previousSign = sign;
    }

    return crosses;
  }

  private averageCandleOverlap(highs: readonly number[], lows: readonly number[]): number {
    if (highs.length < 2 || lows.length < 2) {
      return 1;
    }

    const overlaps: number[] = [];

    for (let index = 1; index < highs.length; index += 1) {
      const high = highs[index];
      const low = lows[index];
      const previousHigh = highs[index - 1];
      const previousLow = lows[index - 1];

      if (
        high === undefined ||
        low === undefined ||
        previousHigh === undefined ||
        previousLow === undefined
      ) {
        continue;
      }

      const overlap = Math.max(0, Math.min(high, previousHigh) - Math.max(low, previousLow));
      const union = Math.max(high, previousHigh) - Math.min(low, previousLow);

      if (union <= 0) {
        continue;
      }

      overlaps.push(clamp(overlap / union, 0, 1));
    }

    return overlaps.length === 0 ? 1 : average(overlaps);
  }

  private alternatingBodyRatio(opens: readonly number[], closes: readonly number[]): number {
    if (opens.length < 2 || closes.length < 2) {
      return 1;
    }

    let alternations = 0;
    let transitions = 0;
    let previousDirection = 0;

    for (let index = 0; index < closes.length; index += 1) {
      const open = opens[index];
      const close = closes[index];

      if (open === undefined || close === undefined) {
        continue;
      }

      const body = close - open;
      const direction = body > 0 ? 1 : body < 0 ? -1 : 0;
      if (direction === 0) {
        continue;
      }

      if (previousDirection !== 0) {
        transitions += 1;
        if (direction !== previousDirection) {
          alternations += 1;
        }
      }

      previousDirection = direction;
    }

    if (transitions === 0) {
      return 1;
    }

    return clamp(alternations / transitions, 0, 1);
  }

  private averageWickNoise(
    opens: readonly number[],
    highs: readonly number[],
    lows: readonly number[],
    closes: readonly number[]
  ): number {
    const wickRatios: number[] = [];

    for (let index = 0; index < closes.length; index += 1) {
      const open = opens[index];
      const high = highs[index];
      const low = lows[index];
      const close = closes[index];

      if (open === undefined || high === undefined || low === undefined || close === undefined) {
        continue;
      }

      const range = high - low;
      if (range <= 0) {
        continue;
      }

      const body = Math.abs(close - open);
      const wick = Math.max(0, range - body);
      wickRatios.push(clamp(wick / range, 0, 1));
    }

    return wickRatios.length === 0 ? 1 : average(wickRatios);
  }

  private swingConsistency(highs: readonly number[], lows: readonly number[]): number {
    const swingHighs = this.collectPivotValues(highs, true);
    const swingLows = this.collectPivotValues(lows, false);

    const highConsistency = this.lowerSequenceRatio(swingHighs);
    const lowConsistency = this.lowerSequenceRatio(swingLows);

    return roundTo(clamp((highConsistency + lowConsistency) / 2, 0, 1), 4);
  }

  private collectPivotValues(values: readonly number[], isHigh: boolean): number[] {
    const pivots: number[] = [];

    for (let index = 2; index < values.length - 2; index += 1) {
      const value = values[index];
      if (value === undefined) {
        continue;
      }

      const leftOne = values[index - 1];
      const leftTwo = values[index - 2];
      const rightOne = values[index + 1];
      const rightTwo = values[index + 2];

      if (
        leftOne === undefined ||
        leftTwo === undefined ||
        rightOne === undefined ||
        rightTwo === undefined
      ) {
        continue;
      }

      const isPivot = isHigh
        ? value >= leftOne && value >= leftTwo && value >= rightOne && value >= rightTwo
        : value <= leftOne && value <= leftTwo && value <= rightOne && value <= rightTwo;

      if (isPivot) {
        pivots.push(value);
      }
    }

    return pivots;
  }

  private lowerSequenceRatio(values: readonly number[]): number {
    if (values.length < 2) {
      return 0.5;
    }

    let improving = 0;

    for (let index = 1; index < values.length; index += 1) {
      const current = values[index];
      const previous = values[index - 1];

      if (current !== undefined && previous !== undefined && current < previous) {
        improving += 1;
      }
    }

    return clamp(improving / (values.length - 1), 0, 1);
  }

  private pullbackDiscipline(opens: readonly number[], closes: readonly number[]): number {
    const bearishBodies: number[] = [];
    const bullishBodies: number[] = [];

    for (let index = 0; index < closes.length; index += 1) {
      const open = opens[index];
      const close = closes[index];

      if (open === undefined || close === undefined) {
        continue;
      }

      const body = Math.abs(close - open);
      if (body === 0) {
        continue;
      }

      if (close < open) {
        bearishBodies.push(body);
      } else if (close > open) {
        bullishBodies.push(body);
      }
    }

    if (bearishBodies.length === 0 || bullishBodies.length === 0) {
      return 0.5;
    }

    const bearishAvg = average(bearishBodies);
    const bullishAvg = average(bullishBodies);

    if (bearishAvg <= 0) {
      return 0;
    }

    const ratio = bullishAvg / bearishAvg;

    if (ratio <= TREND_QUALITY_PULLBACK_BODY_RATIO_GOOD) {
      return 1;
    }

    if (ratio >= TREND_QUALITY_PULLBACK_BODY_RATIO_POOR) {
      return 0;
    }

    const normalized =
      (TREND_QUALITY_PULLBACK_BODY_RATIO_POOR - ratio) /
      (TREND_QUALITY_PULLBACK_BODY_RATIO_POOR - TREND_QUALITY_PULLBACK_BODY_RATIO_GOOD);

    return clamp(normalized, 0, 1);
  }

  private impulsePersistence(
    opens: readonly number[],
    highs: readonly number[],
    lows: readonly number[],
    closes: readonly number[]
  ): number {
    let impulseCount = 0;
    let total = 0;

    for (let index = 0; index < closes.length; index += 1) {
      const open = opens[index];
      const high = highs[index];
      const low = lows[index];
      const close = closes[index];

      if (open === undefined || high === undefined || low === undefined || close === undefined) {
        continue;
      }

      const range = high - low;
      if (range <= 0) {
        continue;
      }

      total += 1;
      const bodyRatio = Math.abs(close - open) / range;
      const isBearishImpulse = close < open && bodyRatio >= 0.55;

      if (isBearishImpulse) {
        impulseCount += 1;
      }
    }

    if (total === 0) {
      return 0;
    }

    return clamp(impulseCount / total, 0, 1);
  }

  private slopeSmoothness(ema20Series: readonly (number | null)[]): number {
    const changes: number[] = [];

    for (let index = 1; index < ema20Series.length; index += 1) {
      const current = ema20Series[index];
      const previous = ema20Series[index - 1];

      if (current === null || previous === null || current === undefined || previous === undefined || previous === 0) {
        continue;
      }

      changes.push(((current - previous) / Math.abs(previous)) * 100);
    }

    if (changes.length < 3) {
      return 0.5;
    }

    const mean = average(changes);
    const variance = average(changes.map((value) => (value - mean) ** 2));
    const stdDev = Math.sqrt(variance);

    return clamp(1 - stdDev / 0.25, 0, 1);
  }

  private countFakeBreakouts(lows: readonly number[], closes: readonly number[]): number {
    let count = 0;

    for (let index = 5; index < closes.length - 2; index += 1) {
      const low = lows[index];
      const close = closes[index];
      const nextClose = closes[index + 1];
      const secondNextClose = closes[index + 2];

      if (
        low === undefined ||
        close === undefined ||
        nextClose === undefined ||
        secondNextClose === undefined
      ) {
        continue;
      }

      const priorLows = lows.slice(index - 5, index).filter((value): value is number => value !== undefined);
      if (priorLows.length < 5) {
        continue;
      }

      const priorLowest = Math.min(...priorLows);
      const madeBreakdown = low < priorLowest;
      const reclaim = nextClose > close && secondNextClose > close;

      if (madeBreakdown && reclaim) {
        count += 1;
      }
    }

    return count;
  }

}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};
