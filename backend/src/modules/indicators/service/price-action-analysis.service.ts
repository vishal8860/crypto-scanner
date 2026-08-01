import {
  PriceActionSnapshot,
  StructureQualityLabel,
  StructureTrend,
  SwingPoint
} from '../interfaces/indicator-result.interface.js';
import { LiquidityResult } from './liquidity.service.js';
import { MarketStructureResult } from './market-structure.service.js';
import { SupportResistanceResult } from './support-resistance.service.js';
import { TrendExhaustionResult } from './trend-exhaustion.service.js';

export interface PriceActionAnalysisInput {
  readonly marketStructure: MarketStructureResult;
  readonly supportResistance: SupportResistanceResult;
  readonly liquidity: LiquidityResult;
  readonly trendExhaustion: TrendExhaustionResult;
  readonly recentSwingPoints: readonly SwingPoint[];
}

export interface PriceActionAnalysisResult {
  readonly snapshot: PriceActionSnapshot;
}

export class PriceActionAnalysisService {
  public analyze(input: PriceActionAnalysisInput): PriceActionAnalysisResult {
    const swingPattern = this.resolveSwingPattern(input.recentSwingPoints);

    const snapshot: PriceActionSnapshot = {
      structureTrend: input.marketStructure.marketStructure,
      swingSequence: input.marketStructure.swingSequence,
      swingStrength: input.marketStructure.swingStrength,
      structureConfidence: input.marketStructure.structureConfidence,
      structureQualityScore: input.marketStructure.structureQualityScore,
      structureQualityLabel: input.marketStructure.structureQualityLabel,
      structureColumnState: input.marketStructure.structureColumnState,
      bosStatus: input.marketStructure.bosStatus,
      bosBreakPrice: input.marketStructure.bosBreakPrice,
      candlesSinceBos: input.marketStructure.candlesSinceBos,
      bosStrength: input.marketStructure.bosStrength,
      chochStatus: input.marketStructure.chochStatus,
      retestStatus: input.marketStructure.retestStatus,
      compressionState: input.marketStructure.compressionState,
      falseBreakdown: input.marketStructure.falseBreakdown,
      nearestSupport: input.supportResistance.nearestSupport,
      nearestResistance: input.supportResistance.nearestResistance,
      supportDistancePercent: input.supportResistance.supportDistancePercent,
      resistanceDistancePercent: input.supportResistance.resistanceDistancePercent,
      supportStrength: input.supportResistance.supportStrength,
      resistanceStrength: input.supportResistance.resistanceStrength,
      supportColumnState: input.supportResistance.supportColumnState,
      nearestLiquidityZone: input.liquidity.nearestLiquidityZone,
      liquidityDirection: input.liquidity.liquidityDirection,
      liquidityDistancePercent: input.liquidity.liquidityDistancePercent,
      liquidityPressure: input.liquidity.liquidityPressure,
      trendExhaustion: input.trendExhaustion.trendExhaustion,
      impulsiveCandleCount: input.trendExhaustion.impulsiveCandleCount,
      atrExpansionRatio: input.trendExhaustion.atrExpansionRatio,
      climaxVolumeRatio: input.trendExhaustion.climaxVolumeRatio,
      ema20ExtensionPercent: input.trendExhaustion.ema20ExtensionPercent,
      swingPattern
    };

    return { snapshot };
  }

  private resolveSwingPattern(swings: readonly SwingPoint[]): string {
    const sequence = swings.map((swing) => swing.label);

    if (sequence.length === 0) {
      return 'No clear swing structure';
    }

    const text = sequence.join(' -> ');

    if (this.isBearishPattern(sequence)) {
      return `Bearish sequence: ${text}`;
    }

    if (this.isBullishPattern(sequence)) {
      return `Bullish sequence: ${text}`;
    }

    return `Mixed sequence: ${text}`;
  }

  private isBearishPattern(sequence: readonly string[]): boolean {
    const tail = sequence.slice(-4);
    return tail.includes('LH') && tail.includes('LL');
  }

  private isBullishPattern(sequence: readonly string[]): boolean {
    const tail = sequence.slice(-4);
    return tail.includes('HH') && tail.includes('HL');
  }

  public static qualityScoreFromLabel(label: StructureQualityLabel): number {
    if (label === 'Excellent') {
      return 9;
    }

    if (label === 'Good') {
      return 7;
    }

    if (label === 'Average') {
      return 5;
    }

    return 3;
  }

  public static isBearishStructure(structureTrend: StructureTrend): boolean {
    return structureTrend === 'Bearish Structure';
  }
}
