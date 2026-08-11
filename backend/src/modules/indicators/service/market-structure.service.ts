import {
  STRUCTURE_CONFIDENCE_MAX,
  STRUCTURE_CONFIRMATION_BEARISH_REJECTION_RETEST_POINTS,
  STRUCTURE_CONFIRMATION_EMA9_BELOW_EMA20_POINTS,
  STRUCTURE_CONFIRMATION_EMA20_FALLING_POINTS,
  STRUCTURE_CONFIRMATION_LAST_HL_BROKEN_POINTS,
  STRUCTURE_CONFIRMATION_LOWER_HIGH_POINTS,
  STRUCTURE_CONFIRMATION_MAX_SCORE,
  STRUCTURE_CONFIRMATION_PRICE_BELOW_EMA20_POINTS,
  STRUCTURE_CONFIRMATION_TRENDLINE_BREAK_POINTS,
  STRUCTURE_COMPRESSION_LOOKBACK,
  STRUCTURE_FALSE_BREAK_RECLAIM_PERCENT,
  STRUCTURE_QUALITY_EXCELLENT_MIN,
  STRUCTURE_QUALITY_GOOD_MIN,
  PULLBACK_QUALITY_AVERAGE_MIN,
  PULLBACK_QUALITY_EXCELLENT_MIN,
  PULLBACK_QUALITY_GOOD_MIN,
  PULLBACK_QUALITY_MAX_SCORE,
  STRUCTURE_LOOKBACK_LIMIT,
  STRUCTURE_MIN_SWING_MOVE_PERCENT,
  STRUCTURE_MIN_SWINGS_FOR_QUALITY,
  STRUCTURE_PIVOT_LEFT_BARS,
  STRUCTURE_PIVOT_RIGHT_BARS,
  STRUCTURE_RECENT_BOS_CANDLES,
  STRUCTURE_RETEST_TOLERANCE_PERCENT,
  STRUCTURE_STRONG_QUALITY_MIN,
  STRUCTURE_SQUEEZE_MAX_RANGE_PERCENT,
  STRUCTURE_TRIANGLE_RANGE_SHRINK_RATIO,
  STRUCTURE_WEAK_QUALITY_MAX
} from '../constants/indicator.constants.js';
import {
  BosDirection,
  ChochDirection,
  CompressionState,
  MarketStructureLabel,
  RetestStatus,
  StructureColumnState,
  StructurePhase,
  StructureQualityLabel,
  StructureTrend,
  SwingPoint,
  Trend
} from '../interfaces/indicator-result.interface.js';

export interface MarketStructureInput {
  readonly opens: readonly number[];
  readonly closes: readonly number[];
  readonly highs: readonly number[];
  readonly lows: readonly number[];
  readonly volumes: readonly number[];
  readonly price: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema20SlopePercent: number;
  readonly trend: Trend;
}

export interface MarketStructureResult {
  readonly structurePhase: StructurePhase;
  readonly structureConfirmationScore: number;
  readonly structureConfirmationReasons: readonly string[];
  readonly pullbackQualityScore: number;
  readonly pullbackQualityLabel: 'Excellent' | 'Good' | 'Average' | 'Poor';
  readonly lastHigherLowBroken: boolean;
  readonly lowerHighFormed: boolean;
  readonly bearishRejectionAfterRetest: boolean;
  readonly marketStructure: StructureTrend;
  readonly swingSequence: readonly MarketStructureLabel[];
  readonly swingStrength: number;
  readonly structureConfidence: number;
  readonly structureQualityScore: number;
  readonly structureQualityLabel: StructureQualityLabel;
  readonly bosStatus: BosDirection;
  readonly bosBreakPrice: number | null;
  readonly candlesSinceBos: number | null;
  readonly bosStrength: number;
  readonly chochStatus: ChochDirection;
  readonly chochDetected: boolean;
  readonly retestStatus: RetestStatus;
  readonly compressionState: CompressionState;
  readonly falseBreakdown: boolean;
  readonly nearestSwingResistance: number | null;
  readonly nearestSwingSupport: number | null;
  readonly resistanceDistancePercent: number | null;
  readonly supportDistancePercent: number | null;
  readonly structureColumnState: StructureColumnState;
  readonly recentSwingPoints: readonly SwingPoint[];
}

interface RawSwing {
  readonly kind: 'high' | 'low';
  readonly price: number;
  readonly index: number;
}

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const average = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
};

export class MarketStructureService {
  public analyze(input: MarketStructureInput): MarketStructureResult {
    const swings = this.detectSwings(input.highs, input.lows);
    const labeledSwings = this.labelSwings(swings);
    const recentSwingPoints = labeledSwings.slice(-6);
    const swingSequence = recentSwingPoints.map((swing) => swing.label);
    const structurePhase = this.resolveStructurePhase(recentSwingPoints, input.ema20SlopePercent);
    const marketStructure = this.resolveStructureTrend(recentSwingPoints, input.trend);
    const bos = this.resolveBos(input.closes, recentSwingPoints, marketStructure);
    const lastHigherLowBroken = this.isLastHigherLowBroken(input.closes, recentSwingPoints);
    const lowerHighFormed = this.hasRecentLowerHigh(recentSwingPoints);
    const chochStatus = this.resolveChoch(input.price, recentSwingPoints, marketStructure);
    const chochDetected = chochStatus !== 'None';
    const retestStatus = this.resolveRetestStatus(input.highs, input.lows, bos, input.price);
    const bearishRejectionAfterRetest = this.resolveBearishRejectionAfterRetest({
      opens: input.opens,
      highs: input.highs,
      lows: input.lows,
      closes: input.closes,
      ema20: input.ema20,
      brokenPrice: bos.brokenPrice,
      retestStatus,
      bosDirection: bos.direction
    });
    const structureConfirmation = this.resolveStructureConfirmation({
      trendlineBroken: this.resolveTrendlineBreakSignal(structurePhase, bos.direction),
      lastHigherLowBroken,
      lowerHighFormed,
      priceBelowEma20: input.price < input.ema20,
      ema9BelowEma20: input.ema9 < input.ema20,
      ema20Falling: input.ema20SlopePercent < 0,
      bearishRejectionAfterRetest
    });
    const pullbackQuality = this.resolvePullbackQuality({
      opens: input.opens,
      highs: input.highs,
      lows: input.lows,
      closes: input.closes,
      volumes: input.volumes,
      ema9: input.ema9,
      ema20: input.ema20,
      retestStatus,
      bearishRejectionAfterRetest
    });
    const compressionState = this.resolveCompression(input.closes, input.highs, input.lows);
    const falseBreakdown = this.resolveFalseBreakdown(input.price, bos, marketStructure);
    const nearestSwingResistance = this.findNearestAbove(input.price, recentSwingPoints);
    const nearestSwingSupport = this.findNearestBelow(input.price, recentSwingPoints);
    const resistanceDistancePercent = this.distancePercent(input.price, nearestSwingResistance);
    const supportDistancePercent = this.distancePercent(input.price, nearestSwingSupport);
    const swingStrength = this.resolveSwingStrength(recentSwingPoints);
    const structureQualityScore = this.resolveQualityScore({
      swings: recentSwingPoints,
      marketStructure,
      compressionState,
      falseBreakdown,
      chochDetected,
      retestStatus,
      bosStatus: bos.direction,
      swingStrength
    });
    const structureQualityLabel = this.resolveStructureQualityLabel(structureQualityScore);
    const structureConfidence = this.resolveStructureConfidence({
      structureQualityScore,
      bosStatus: bos.direction,
      candlesSinceBos: bos.candlesSinceBos,
      chochDetected,
      compressionState,
      falseBreakdown
    });
    const structureColumnState = this.resolveColumnState(structureQualityScore, marketStructure, falseBreakdown);

    return {
      structurePhase,
      structureConfirmationScore: structureConfirmation.score,
      structureConfirmationReasons: structureConfirmation.reasons,
      pullbackQualityScore: pullbackQuality.score,
      pullbackQualityLabel: pullbackQuality.label,
      lastHigherLowBroken,
      lowerHighFormed,
      bearishRejectionAfterRetest,
      marketStructure,
      swingSequence,
      swingStrength,
      structureConfidence,
      structureQualityScore,
      structureQualityLabel,
      bosStatus: bos.direction,
      bosBreakPrice: bos.brokenPrice,
      candlesSinceBos: bos.candlesSinceBos,
      bosStrength: bos.strength,
      chochStatus,
      chochDetected,
      retestStatus,
      compressionState,
      falseBreakdown,
      nearestSwingResistance,
      nearestSwingSupport,
      resistanceDistancePercent,
      supportDistancePercent,
      structureColumnState,
      recentSwingPoints
    };
  }

  private detectSwings(highs: readonly number[], lows: readonly number[]): RawSwing[] {
    const start = Math.max(STRUCTURE_PIVOT_LEFT_BARS, highs.length - STRUCTURE_LOOKBACK_LIMIT);
    const end = highs.length - STRUCTURE_PIVOT_RIGHT_BARS;
    const swings: RawSwing[] = [];
    let lastSwingHigh: number | null = null;
    let lastSwingLow: number | null = null;

    for (let index = start; index < end; index += 1) {
      const high = highs[index];
      const low = lows[index];
      if (high === undefined || low === undefined) {
        continue;
      }

      let isSwingHigh = true;
      let isSwingLow = true;

      const maxOffset = Math.max(STRUCTURE_PIVOT_LEFT_BARS, STRUCTURE_PIVOT_RIGHT_BARS);
      for (let offset = 1; offset <= maxOffset; offset += 1) {
        const prevHigh = highs[index - offset];
        const nextHigh = highs[index + offset];
        const prevLow = lows[index - offset];
        const nextLow = lows[index + offset];

        if (prevHigh === undefined || nextHigh === undefined || prevLow === undefined || nextLow === undefined) {
          isSwingHigh = false;
          isSwingLow = false;
          break;
        }

        if (high <= prevHigh || high <= nextHigh) {
          isSwingHigh = false;
        }

        if (low >= prevLow || low >= nextLow) {
          isSwingLow = false;
        }
      }

      if (isSwingHigh) {
        const movePercent = lastSwingHigh === null ? STRUCTURE_MIN_SWING_MOVE_PERCENT : Math.abs(((high - lastSwingHigh) / lastSwingHigh) * 100);
        if (movePercent >= STRUCTURE_MIN_SWING_MOVE_PERCENT) {
          swings.push({ kind: 'high', price: high, index });
          lastSwingHigh = high;
        }
      }

      if (isSwingLow) {
        const movePercent = lastSwingLow === null ? STRUCTURE_MIN_SWING_MOVE_PERCENT : Math.abs(((low - lastSwingLow) / lastSwingLow) * 100);
        if (movePercent >= STRUCTURE_MIN_SWING_MOVE_PERCENT) {
          swings.push({ kind: 'low', price: low, index });
          lastSwingLow = low;
        }
      }
    }

    return swings.sort((left, right) => left.index - right.index);
  }

  private labelSwings(swings: readonly RawSwing[]): readonly SwingPoint[] {
    let lastHigh: number | null = null;
    let lastLow: number | null = null;

    return swings.map((swing) => {
      let label: MarketStructureLabel;

      if (swing.kind === 'high') {
        label = lastHigh === null || swing.price >= lastHigh ? 'HH' : 'LH';
        lastHigh = swing.price;
      } else {
        label = lastLow === null || swing.price <= lastLow ? 'LL' : 'HL';
        lastLow = swing.price;
      }

      return { label, price: roundTo(swing.price, 8), index: swing.index };
    });
  }

  private resolveStructurePhase(swings: readonly SwingPoint[], ema20SlopePercent: number): StructurePhase {
    const labels = swings.map((item) => item.label);
    const hasStrongBullishPattern = this.hasOrderedPattern(labels, ['HH', 'HL', 'HH', 'HL']);
    const hasStrongBearishPattern = this.hasOrderedPattern(labels, ['LL', 'LH', 'LL']);
    const hasTransitionBullish = this.hasOrderedPattern(labels, ['HH', 'HL']) && labels[labels.length - 1] === 'LH';
    const hasTransitionBearish = this.hasOrderedPattern(labels, ['LL', 'LH']);

    if (hasStrongBearishPattern && ema20SlopePercent < 0) {
      return 'Strong Bearish';
    }

    if (hasStrongBearishPattern || (hasTransitionBearish && labels.filter((label) => label === 'LL').length >= 2)) {
      return 'Bearish';
    }

    if (hasTransitionBearish) {
      return 'Transition Bearish';
    }

    if (hasStrongBullishPattern) {
      return 'Bullish';
    }

    if (hasTransitionBullish) {
      return 'Transition Bullish';
    }

    return 'Range';
  }

  private hasOrderedPattern(values: readonly MarketStructureLabel[], pattern: readonly MarketStructureLabel[]): boolean {
    let patternIndex = 0;

    for (const value of values) {
      if (value === pattern[patternIndex]) {
        patternIndex += 1;
        if (patternIndex === pattern.length) {
          return true;
        }
      }
    }

    return false;
  }

  private isLastHigherLowBroken(closes: readonly number[], swings: readonly SwingPoint[]): boolean {
    const lastHL = [...swings].reverse().find((swing) => swing.label === 'HL');
    if (!lastHL) {
      return false;
    }

    const latestClose = closes[closes.length - 1];
    return latestClose !== undefined && latestClose < lastHL.price;
  }

  private hasRecentLowerHigh(swings: readonly SwingPoint[]): boolean {
    const recentHighs = swings.filter((swing) => swing.label === 'LH' || swing.label === 'HH');
    const latest = recentHighs[recentHighs.length - 1];
    return latest?.label === 'LH';
  }

  private resolveTrendlineBreakSignal(structurePhase: StructurePhase, bosDirection: BosDirection): boolean {
    if (bosDirection === 'Bearish BOS') {
      return true;
    }

    return structurePhase === 'Transition Bearish' || structurePhase === 'Bearish' || structurePhase === 'Strong Bearish';
  }

  private resolveStructureConfirmation(input: {
    readonly trendlineBroken: boolean;
    readonly lastHigherLowBroken: boolean;
    readonly lowerHighFormed: boolean;
    readonly priceBelowEma20: boolean;
    readonly ema9BelowEma20: boolean;
    readonly ema20Falling: boolean;
    readonly bearishRejectionAfterRetest: boolean;
  }): { score: number; reasons: readonly string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (input.trendlineBroken) {
      score += STRUCTURE_CONFIRMATION_TRENDLINE_BREAK_POINTS;
      reasons.push('✓ Trendline broken');
    } else {
      reasons.push('✗ Trendline intact');
    }

    if (input.lastHigherLowBroken) {
      score += STRUCTURE_CONFIRMATION_LAST_HL_BROKEN_POINTS;
      reasons.push('✓ Previous HL broken');
    } else {
      reasons.push('✗ Previous HL intact');
    }

    if (input.lowerHighFormed) {
      score += STRUCTURE_CONFIRMATION_LOWER_HIGH_POINTS;
      reasons.push('✓ Lower high formed');
    } else {
      reasons.push('✗ Higher highs still present');
    }

    if (input.priceBelowEma20) {
      score += STRUCTURE_CONFIRMATION_PRICE_BELOW_EMA20_POINTS;
      reasons.push('✓ Price below EMA20');
    } else {
      reasons.push('✗ Price above EMA20');
    }

    if (input.ema9BelowEma20) {
      score += STRUCTURE_CONFIRMATION_EMA9_BELOW_EMA20_POINTS;
      reasons.push('✓ EMA9 below EMA20');
    } else {
      reasons.push('✗ EMA9 above EMA20');
    }

    if (input.ema20Falling) {
      score += STRUCTURE_CONFIRMATION_EMA20_FALLING_POINTS;
      reasons.push('✓ EMA20 falling');
    } else {
      reasons.push('✗ EMA20 rising');
    }

    if (input.bearishRejectionAfterRetest) {
      score += STRUCTURE_CONFIRMATION_BEARISH_REJECTION_RETEST_POINTS;
      reasons.push('✓ Bearish rejection after retest');
    } else {
      reasons.push('✗ Waiting for retest rejection');
    }

    return {
      score: Math.max(0, Math.min(STRUCTURE_CONFIRMATION_MAX_SCORE, score)),
      reasons
    };
  }

  private resolveBearishRejectionAfterRetest(input: {
    readonly opens: readonly number[];
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly closes: readonly number[];
    readonly ema20: number;
    readonly brokenPrice: number | null;
    readonly retestStatus: RetestStatus;
    readonly bosDirection: BosDirection;
  }): boolean {
    if (input.bosDirection !== 'Bearish BOS') {
      return false;
    }

    if (input.retestStatus !== 'Retesting' && input.retestStatus !== 'Broke then Retested') {
      return false;
    }

    const index = input.closes.length - 1;
    const open = input.opens[index];
    const high = input.highs[index];
    const low = input.lows[index];
    const close = input.closes[index];
    if (open === undefined || high === undefined || low === undefined || close === undefined) {
      return false;
    }

    const toleranceEma = input.ema20 * 0.003;
    const touchedEma20 = high >= input.ema20 - toleranceEma && low <= input.ema20 + toleranceEma;
    const touchedBrokenLevel = input.brokenPrice === null
      ? false
      : high >= input.brokenPrice * 0.997 && low <= input.brokenPrice * 1.003;
    const bearishCandle = close < open;
    const upperWick = high - Math.max(open, close);
    const body = Math.abs(open - close);

    return (touchedEma20 || touchedBrokenLevel) && bearishCandle && upperWick >= body * 0.8;
  }

  private resolvePullbackQuality(input: {
    readonly opens: readonly number[];
    readonly highs: readonly number[];
    readonly lows: readonly number[];
    readonly closes: readonly number[];
    readonly volumes: readonly number[];
    readonly ema9: number;
    readonly ema20: number;
    readonly retestStatus: RetestStatus;
    readonly bearishRejectionAfterRetest: boolean;
  }): { score: number; label: 'Excellent' | 'Good' | 'Average' | 'Poor' } {
    const latestClose = input.closes[input.closes.length - 1] ?? 0;
    const latestHigh = input.highs[input.highs.length - 1] ?? latestClose;
    const latestLow = input.lows[input.lows.length - 1] ?? latestClose;
    const distanceToEma20 = input.ema20 === 0 ? 0 : Math.abs(((latestClose - input.ema20) / input.ema20) * 100);
    const distanceToEma9 = input.ema9 === 0 ? 0 : Math.abs(((latestClose - input.ema9) / input.ema9) * 100);

    let score = 10;

    if (distanceToEma20 <= 0.45) {
      score += 32;
    } else if (distanceToEma9 <= 0.35) {
      score += 22;
    } else if (distanceToEma20 <= 1.2) {
      score += 12;
    }

    const recentRanges = this.lastN(input.highs, 6).map((high, index) => {
      const low = this.lastN(input.lows, 6)[index];
      return high !== undefined && low !== undefined ? Math.max(0, high - low) : 0;
    });
    const baselineRanges = this.lastN(input.highs, 20).map((high, index) => {
      const low = this.lastN(input.lows, 20)[index];
      return high !== undefined && low !== undefined ? Math.max(0, high - low) : 0;
    });
    const recentAverageRange = average(recentRanges);
    const baselineAverageRange = average(baselineRanges);

    if (baselineAverageRange > 0 && recentAverageRange <= baselineAverageRange * 0.8) {
      score += 14;
    }

    const recentVolume = average(this.lastN(input.volumes, 5));
    const baselineVolume = average(this.lastN(input.volumes, 20));
    if (baselineVolume > 0 && recentVolume <= baselineVolume * 0.88) {
      score += 16;
    }

    if (input.bearishRejectionAfterRetest) {
      score += 20;
    }

    if (input.retestStatus === 'No Retest' && distanceToEma20 > 1.6) {
      score -= 24;
    }

    const bullishBodyPercent = latestHigh === latestLow
      ? 0
      : ((latestClose - (input.opens[input.opens.length - 1] ?? latestClose)) / (latestHigh - latestLow)) * 100;
    if (bullishBodyPercent > 55 && distanceToEma20 > 1.3) {
      score -= 18;
    }

    const normalized = Math.max(0, Math.min(PULLBACK_QUALITY_MAX_SCORE, roundTo(score, 2)));

    return {
      score: normalized,
      label: this.resolvePullbackQualityLabel(normalized)
    };
  }

  private resolvePullbackQualityLabel(score: number): 'Excellent' | 'Good' | 'Average' | 'Poor' {
    if (score >= PULLBACK_QUALITY_EXCELLENT_MIN) {
      return 'Excellent';
    }

    if (score >= PULLBACK_QUALITY_GOOD_MIN) {
      return 'Good';
    }

    if (score >= PULLBACK_QUALITY_AVERAGE_MIN) {
      return 'Average';
    }

    return 'Poor';
  }

  private lastN(values: readonly number[], count: number): readonly number[] {
    return values.slice(Math.max(0, values.length - count));
  }

  private resolveStructureTrend(swings: readonly SwingPoint[], fallbackTrend: Trend): StructureTrend {
    const recentHighs = swings.filter((swing) => swing.label === 'HH' || swing.label === 'LH').slice(-2);
    const recentLows = swings.filter((swing) => swing.label === 'HL' || swing.label === 'LL').slice(-2);

    const hasBearish = recentHighs.some((swing) => swing.label === 'LH') && recentLows.some((swing) => swing.label === 'LL');
    const hasBullish = recentHighs.some((swing) => swing.label === 'HH') && recentLows.some((swing) => swing.label === 'HL');

    if (hasBearish && !hasBullish) {
      return 'Bearish Structure';
    }

    if (hasBullish && !hasBearish) {
      return 'Bullish Structure';
    }

    if (fallbackTrend === 'Bearish') {
      return 'Bearish Structure';
    }

    if (fallbackTrend === 'Bullish') {
      return 'Bullish Structure';
    }

    return 'Mixed Structure';
  }

  private resolveBos(
    closes: readonly number[],
    swings: readonly SwingPoint[],
    structureTrend: StructureTrend
  ): { direction: BosDirection; candlesSinceBos: number | null; strength: number; brokenPrice: number | null } {
    const referenceSwing = structureTrend === 'Bearish Structure'
      ? [...swings].reverse().find((swing) => swing.label === 'HL')
      : structureTrend === 'Bullish Structure'
        ? [...swings].reverse().find((swing) => swing.label === 'LH')
        : undefined;

    if (!referenceSwing) {
      return { direction: 'No BOS', candlesSinceBos: null, strength: 0, brokenPrice: null };
    }

    const latestClose = closes[closes.length - 1] ?? 0;
    if (structureTrend === 'Bearish Structure' && latestClose < referenceSwing.price) {
      const candlesSinceBos = this.countCandlesSinceBreak(closes, referenceSwing.price, 'below');
      const strength = roundTo(((referenceSwing.price - latestClose) / referenceSwing.price) * 100, 2);
      return { direction: 'Bearish BOS', candlesSinceBos, strength, brokenPrice: referenceSwing.price };
    }

    if (structureTrend === 'Bullish Structure' && latestClose > referenceSwing.price) {
      const candlesSinceBos = this.countCandlesSinceBreak(closes, referenceSwing.price, 'above');
      const strength = roundTo(((latestClose - referenceSwing.price) / referenceSwing.price) * 100, 2);
      return { direction: 'Bullish BOS', candlesSinceBos, strength, brokenPrice: referenceSwing.price };
    }

    return { direction: 'No BOS', candlesSinceBos: null, strength: 0, brokenPrice: referenceSwing.price };
  }

  private resolveChoch(price: number, swings: readonly SwingPoint[], structureTrend: StructureTrend): ChochDirection {
    if (structureTrend === 'Bearish Structure') {
      const lastLH = [...swings].reverse().find((swing) => swing.label === 'LH');
      return lastLH !== undefined && price > lastLH.price ? 'Bullish CHoCH' : 'None';
    }

    if (structureTrend === 'Bullish Structure') {
      const lastHL = [...swings].reverse().find((swing) => swing.label === 'HL');
      return lastHL !== undefined && price < lastHL.price ? 'Bearish CHoCH' : 'None';
    }

    return 'None';
  }

  private resolveRetestStatus(
    highs: readonly number[],
    lows: readonly number[],
    bos: { direction: BosDirection; candlesSinceBos: number | null; brokenPrice: number | null },
    price: number
  ): RetestStatus {
    if (bos.direction === 'No BOS' || bos.brokenPrice === null || bos.candlesSinceBos === null) {
      return 'No Retest';
    }

    const brokenPrice = bos.brokenPrice;

    const lookbackStart = Math.max(0, highs.length - bos.candlesSinceBos - 6);
    const highsSlice = highs.slice(lookbackStart);
    const lowsSlice = lows.slice(lookbackStart);
    const tolerance = brokenPrice * (STRUCTURE_RETEST_TOLERANCE_PERCENT / 100);

    if (bos.direction === 'Bearish BOS') {
      const retested = highsSlice.some((high) => high >= brokenPrice - tolerance && high <= brokenPrice + tolerance);
      if (!retested) {
        return 'Broke and Continued';
      }

      if (Math.abs(price - brokenPrice) <= tolerance) {
        return 'Retesting';
      }

      return price < brokenPrice ? 'Broke then Retested' : 'Broke then Failed';
    }

    const retested = lowsSlice.some((low) => low >= brokenPrice - tolerance && low <= brokenPrice + tolerance);
    if (!retested) {
      return 'Broke and Continued';
    }

    if (Math.abs(price - brokenPrice) <= tolerance) {
      return 'Retesting';
    }

    return price > brokenPrice ? 'Broke then Retested' : 'Broke then Failed';
  }

  private resolveCompression(
    closes: readonly number[],
    highs: readonly number[],
    lows: readonly number[]
  ): CompressionState {
    const start = Math.max(0, closes.length - STRUCTURE_COMPRESSION_LOOKBACK);
    const closeSlice = closes.slice(start);
    const highSlice = highs.slice(start);
    const lowSlice = lows.slice(start);
    if (closeSlice.length < STRUCTURE_COMPRESSION_LOOKBACK) {
      return 'None';
    }

    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    const latestClose = closeSlice[closeSlice.length - 1] ?? 0;
    const rangePercent = latestClose === 0 ? 0 : ((highest - lowest) / latestClose) * 100;
    const firstHalfRange = Math.max(...highSlice.slice(0, 6)) - Math.min(...lowSlice.slice(0, 6));
    const secondHalfRange = Math.max(...highSlice.slice(-6)) - Math.min(...lowSlice.slice(-6));
    const shrinkRatio = firstHalfRange === 0 ? 1 : secondHalfRange / firstHalfRange;

    if (rangePercent <= STRUCTURE_SQUEEZE_MAX_RANGE_PERCENT) {
      return 'Low Volatility Squeeze';
    }

    if (shrinkRatio <= STRUCTURE_TRIANGLE_RANGE_SHRINK_RATIO) {
      return 'Triangle';
    }

    if (rangePercent <= STRUCTURE_SQUEEZE_MAX_RANGE_PERCENT * 1.6) {
      return 'Range';
    }

    return 'None';
  }

  private resolveFalseBreakdown(
    price: number,
    bos: { direction: BosDirection; brokenPrice: number | null },
    structureTrend: StructureTrend
  ): boolean {
    if (bos.direction !== 'Bearish BOS' || bos.brokenPrice === null || structureTrend !== 'Bearish Structure') {
      return false;
    }

    const reclaimLevel = bos.brokenPrice * (1 + STRUCTURE_FALSE_BREAK_RECLAIM_PERCENT / 100);
    return price > reclaimLevel;
  }

  private resolveQualityScore(input: {
    readonly swings: readonly SwingPoint[];
    readonly marketStructure: StructureTrend;
    readonly compressionState: CompressionState;
    readonly falseBreakdown: boolean;
    readonly chochDetected: boolean;
    readonly retestStatus: RetestStatus;
    readonly bosStatus: BosDirection;
    readonly swingStrength: number;
  }): number {
    let score = 5;

    if (input.swings.length >= STRUCTURE_MIN_SWINGS_FOR_QUALITY) {
      score += 2;
    }

    const consistency = input.swings.slice(-4).filter((swing) =>
      input.marketStructure === 'Bearish Structure'
        ? swing.label === 'LH' || swing.label === 'LL'
        : input.marketStructure === 'Bullish Structure'
          ? swing.label === 'HH' || swing.label === 'HL'
          : false
    ).length;
    score += Math.min(2, consistency * 0.5);

    if (input.bosStatus !== 'No BOS') {
      score += 0.8;
    }

    if (input.retestStatus === 'Broke then Retested') {
      score += 0.8;
    }

    score += Math.min(1.5, input.swingStrength * 0.15);

    if (input.compressionState !== 'None') {
      score -= 2;
    }

    if (input.falseBreakdown) {
      score -= 3;
    }

    if (input.chochDetected) {
      score -= 2;
    }

    if (input.marketStructure === 'Mixed Structure') {
      score -= 1.5;
    }

    return Math.max(0, Math.min(10, roundTo(score, 1)));
  }

  private resolveStructureQualityLabel(score: number): StructureQualityLabel {
    if (score >= STRUCTURE_QUALITY_EXCELLENT_MIN) {
      return 'Excellent';
    }

    if (score >= STRUCTURE_QUALITY_GOOD_MIN) {
      return 'Good';
    }

    if (score >= 4.5) {
      return 'Average';
    }

    return 'Poor';
  }

  private resolveStructureConfidence(input: {
    readonly structureQualityScore: number;
    readonly bosStatus: BosDirection;
    readonly candlesSinceBos: number | null;
    readonly chochDetected: boolean;
    readonly compressionState: CompressionState;
    readonly falseBreakdown: boolean;
  }): number {
    let confidence = input.structureQualityScore * 10;

    if (input.bosStatus !== 'No BOS' && input.candlesSinceBos !== null) {
      confidence += input.candlesSinceBos <= STRUCTURE_RECENT_BOS_CANDLES ? 10 : 4;
    }

    if (input.chochDetected) {
      confidence -= 16;
    }

    if (input.compressionState !== 'None') {
      confidence -= 8;
    }

    if (input.falseBreakdown) {
      confidence -= 12;
    }

    return roundTo(Math.max(0, Math.min(STRUCTURE_CONFIDENCE_MAX, confidence)), 2);
  }

  private resolveColumnState(
    structureQualityScore: number,
    structureTrend: StructureTrend,
    falseBreakdown: boolean
  ): StructureColumnState {
    if (falseBreakdown || structureTrend === 'Mixed Structure' || structureQualityScore <= STRUCTURE_WEAK_QUALITY_MAX) {
      return 'Weak';
    }

    if (structureQualityScore >= STRUCTURE_STRONG_QUALITY_MIN) {
      return 'Strong';
    }

    return 'Mixed';
  }

  private resolveSwingStrength(swings: readonly SwingPoint[]): number {
    if (swings.length < 3) {
      return 0;
    }

    const amplitudes: number[] = [];
    for (let index = 1; index < swings.length; index += 1) {
      const previous = swings[index - 1];
      const current = swings[index];
      if (!previous || !current || previous.price === 0) {
        continue;
      }

      amplitudes.push(Math.abs(((current.price - previous.price) / previous.price) * 100));
    }

    if (amplitudes.length === 0) {
      return 0;
    }

    const averageAmplitude = amplitudes.reduce((total, value) => total + value, 0) / amplitudes.length;
    return roundTo(Math.max(0, Math.min(10, averageAmplitude * 1.8)), 2);
  }

  private countCandlesSinceBreak(closes: readonly number[], level: number, side: 'above' | 'below'): number | null {
    for (let index = closes.length - 1; index >= 0; index -= 1) {
      const close = closes[index];
      if (close === undefined) {
        continue;
      }

      if ((side === 'below' && close >= level) || (side === 'above' && close <= level)) {
        return closes.length - 1 - index;
      }
    }

    return closes.length - 1;
  }

  private findNearestAbove(price: number, swings: readonly SwingPoint[]): number | null {
    const values = swings.map((swing) => swing.price).filter((value) => value > price).sort((a, b) => a - b);
    return values[0] ?? null;
  }

  private findNearestBelow(price: number, swings: readonly SwingPoint[]): number | null {
    const values = swings.map((swing) => swing.price).filter((value) => value < price).sort((a, b) => b - a);
    return values[0] ?? null;
  }

  private distancePercent(price: number, level: number | null): number | null {
    if (level === null || level === 0) {
      return null;
    }

    return roundTo(((level - price) / price) * 100, 2);
  }
}
