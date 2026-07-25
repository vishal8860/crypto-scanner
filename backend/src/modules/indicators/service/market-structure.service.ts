import {
  STRUCTURE_COMPRESSION_LOOKBACK,
  STRUCTURE_FALSE_BREAK_RECLAIM_PERCENT,
  STRUCTURE_LOOKBACK_LIMIT,
  STRUCTURE_MIN_SWINGS_FOR_QUALITY,
  STRUCTURE_RETEST_TOLERANCE_PERCENT,
  STRUCTURE_STRONG_QUALITY_MIN,
  STRUCTURE_SQUEEZE_MAX_RANGE_PERCENT,
  STRUCTURE_SWING_WINDOW,
  STRUCTURE_TRIANGLE_RANGE_SHRINK_RATIO,
  STRUCTURE_WEAK_QUALITY_MAX
} from '../constants/indicator.constants.js';
import {
  BosDirection,
  CompressionState,
  MarketStructureLabel,
  RetestStatus,
  StructureColumnState,
  StructureTrend,
  SwingPoint,
  Trend
} from '../interfaces/indicator-result.interface.js';

export interface MarketStructureInput {
  readonly closes: readonly number[];
  readonly highs: readonly number[];
  readonly lows: readonly number[];
  readonly price: number;
  readonly trend: Trend;
}

export interface MarketStructureResult {
  readonly marketStructure: StructureTrend;
  readonly structureQualityScore: number;
  readonly bosStatus: BosDirection;
  readonly candlesSinceBos: number | null;
  readonly bosStrength: number;
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

export class MarketStructureService {
  public analyze(input: MarketStructureInput): MarketStructureResult {
    const swings = this.detectSwings(input.highs, input.lows);
    const labeledSwings = this.labelSwings(swings);
    const recentSwingPoints = labeledSwings.slice(-6);
    const marketStructure = this.resolveStructureTrend(recentSwingPoints, input.trend);
    const bos = this.resolveBos(input.closes, recentSwingPoints, marketStructure);
    const chochDetected = this.resolveChoch(input.price, recentSwingPoints, marketStructure);
    const retestStatus = this.resolveRetestStatus(input.highs, input.lows, bos, input.price);
    const compressionState = this.resolveCompression(input.closes, input.highs, input.lows);
    const falseBreakdown = this.resolveFalseBreakdown(input.price, bos, marketStructure);
    const nearestSwingResistance = this.findNearestAbove(input.price, recentSwingPoints);
    const nearestSwingSupport = this.findNearestBelow(input.price, recentSwingPoints);
    const resistanceDistancePercent = this.distancePercent(input.price, nearestSwingResistance);
    const supportDistancePercent = this.distancePercent(input.price, nearestSwingSupport);
    const structureQualityScore = this.resolveQualityScore(recentSwingPoints, marketStructure, compressionState, falseBreakdown, chochDetected);
    const structureColumnState = this.resolveColumnState(structureQualityScore, marketStructure, falseBreakdown);

    return {
      marketStructure,
      structureQualityScore,
      bosStatus: bos.direction,
      candlesSinceBos: bos.candlesSinceBos,
      bosStrength: bos.strength,
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
    const start = Math.max(STRUCTURE_SWING_WINDOW, highs.length - STRUCTURE_LOOKBACK_LIMIT);
    const end = highs.length - STRUCTURE_SWING_WINDOW;
    const swings: RawSwing[] = [];

    for (let index = start; index < end; index += 1) {
      const high = highs[index];
      const low = lows[index];
      if (high === undefined || low === undefined) {
        continue;
      }

      let isSwingHigh = true;
      let isSwingLow = true;

      for (let offset = 1; offset <= STRUCTURE_SWING_WINDOW; offset += 1) {
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
        swings.push({ kind: 'high', price: high, index });
      }

      if (isSwingLow) {
        swings.push({ kind: 'low', price: low, index });
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
      ? [...swings].reverse().find((swing) => swing.label === 'LL' || swing.label === 'HL')
      : structureTrend === 'Bullish Structure'
        ? [...swings].reverse().find((swing) => swing.label === 'HH' || swing.label === 'LH')
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

  private resolveChoch(price: number, swings: readonly SwingPoint[], structureTrend: StructureTrend): boolean {
    if (structureTrend === 'Bearish Structure') {
      const lastLH = [...swings].reverse().find((swing) => swing.label === 'LH');
      return lastLH !== undefined && price > lastLH.price;
    }

    if (structureTrend === 'Bullish Structure') {
      const lastHL = [...swings].reverse().find((swing) => swing.label === 'HL');
      return lastHL !== undefined && price < lastHL.price;
    }

    return false;
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

      return price < brokenPrice ? 'Broke then Retested' : 'Broke then Failed';
    }

    const retested = lowsSlice.some((low) => low >= brokenPrice - tolerance && low <= brokenPrice + tolerance);
    if (!retested) {
      return 'Broke and Continued';
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

  private resolveQualityScore(
    swings: readonly SwingPoint[],
    structureTrend: StructureTrend,
    compressionState: CompressionState,
    falseBreakdown: boolean,
    chochDetected: boolean
  ): number {
    let score = 5;

    if (swings.length >= STRUCTURE_MIN_SWINGS_FOR_QUALITY) {
      score += 2;
    }

    const consistency = swings.slice(-4).filter((swing) =>
      structureTrend === 'Bearish Structure'
        ? swing.label === 'LH' || swing.label === 'LL'
        : structureTrend === 'Bullish Structure'
          ? swing.label === 'HH' || swing.label === 'HL'
          : false
    ).length;
    score += Math.min(2, consistency * 0.5);

    if (compressionState !== 'None') {
      score -= 2;
    }

    if (falseBreakdown) {
      score -= 3;
    }

    if (chochDetected) {
      score -= 2;
    }

    if (structureTrend === 'Mixed Structure') {
      score -= 1.5;
    }

    return Math.max(0, Math.min(10, roundTo(score, 1)));
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
