import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ScannerSettingsService } from '../../core/services/scanner-settings.service';
import { CandleInterval } from './candle.interface';
import { IndicatorResult } from './indicator-result.interface';
import { IndicatorsService } from './indicators.service';
import { Market } from './market.interface';
import { MarketsService } from './markets.service';
import { ScannerResult } from './scanner-result.interface';

interface ScanProgress {
  readonly current: number;
  readonly total: number;
}

export interface ScanSummary {
  readonly marketsScanned: number;
  readonly eligible: number;
  readonly rejected: number;
  readonly avoid: number;
  readonly weak: number;
  readonly watch: number;
  readonly strong: number;
  readonly aPlus: number;
}

const SCAN_BATCH_SIZE = 8;
const IGNORE_SCORE_THRESHOLD = 40;

const decisionRank = (verdict: ScannerResult['tradeDecisionVerdict']): number => {
  if (verdict === 'A_PLUS_SETUP') {
    return 5;
  }

  if (verdict === 'STRONG_SETUP') {
    return 4;
  }

  if (verdict === 'WATCH') {
    return 3;
  }

  if (verdict === 'WEAK') {
    return 2;
  }

  return 1;
};

const toScannerResult = (indicator: IndicatorResult): ScannerResult => ({
  rank: 0,
  symbol: indicator.symbol,
  price: indicator.price,
  score: indicator.tradeDecisionScore,
  trend: indicator.trend,
  trendAge: indicator.trendAge,
  freshCross: indicator.freshCross,
  belowEMA200: indicator.isBelowEMA200,
  bearishAlignment: indicator.isBearishAlignment,
  distanceEMA200: indicator.distanceFromEMA200Percent,
  candlesSinceCross: indicator.candlesSinceEMA200Cross,
  ema9: indicator.ema9,
  ema20: indicator.ema20,
  ema200: indicator.ema200,
  ema20SlopePercent: indicator.ema20SlopePercent,
  ema20SlopeCategory: indicator.ema20SlopeCategory,
  ema200SlopePercent: indicator.ema200SlopePercent,
  ema200SlopeCategory: indicator.ema200SlopeCategory,
  trendClassification: indicator.trendClassification,
  trendStrengthScore: indicator.trendStrengthScore,
  isSideways: indicator.isSideways,
  sidewaysScore: indicator.sidewaysScore,
  volumeQuality: indicator.volumeQuality,
  eligible: indicator.eligible,
  eligibilityReasons: [...indicator.eligibilityReasons],
  priority: indicator.priority,
  tradeStage: indicator.tradeStage,
  tradeStageLabel: indicator.tradeStageLabel,
  tradeStageColor: indicator.tradeStageColor,
  tradeStageReason: indicator.tradeStageReason,
  suggestedEntry: indicator.suggestedEntry,
  suggestedStopLoss: indicator.suggestedStopLoss,
  suggestedTakeProfit: indicator.suggestedTakeProfit,
  riskReward: indicator.riskReward,
  entryQuality: indicator.entryQuality,
  planningReason: indicator.planningReason,
  trendScore: indicator.trendScore,
  trendQualityScore: indicator.trendQualityScore,
  trendQualityLabel: indicator.trendQualityLabel,
  setupQualityScore: indicator.setupQualityScore,
  setupQualityGrade: indicator.setupQualityGrade,
  setupQualityBreakdown: indicator.setupQualityBreakdown,
  entryReadinessScore: indicator.entryReadinessScore,
  entryReadinessGrade: indicator.entryReadinessGrade,
  entryReadinessBreakdown: indicator.entryReadinessBreakdown,
  structureConfirmationScore: indicator.structureConfirmationScore,
  structurePhase: indicator.structurePhase,
  structureConfirmationReasons: indicator.structureConfirmationReasons,
  professionalMarketStructure: indicator.professionalMarketStructure,
  professionalMarketStructureReason: indicator.professionalMarketStructureReason,
  marketStructureWhySentence: indicator.marketStructureWhySentence,
  marketStructurePriority: indicator.marketStructurePriority,
  trendGrade: indicator.trendGrade,
  entryScore: indicator.entryScore,
  entryGrade: indicator.entryGrade,
  pullbackQualityScore: indicator.pullbackQualityScore,
  pullbackQualityLabel: indicator.pullbackQualityLabel,
  tradeVerdict: indicator.tradeVerdict,
  tradeDecisionScore: indicator.tradeDecisionScore,
  tradeDecisionVerdict: indicator.tradeDecisionVerdict,
  tradeDecisionBlockers: indicator.tradeDecisionBlockers,
  riskRewardBand: indicator.riskRewardBand,
  marketQuality: indicator.marketQuality,
  marketQualityScore: indicator.marketQualityScore,
  marketQualityReasons: indicator.marketQualityReasons,
  marketCapUsd: indicator.marketCapUsd,
  marketVolume24hUsd: indicator.marketVolume24hUsd,
  pullbackQuality: indicator.pullbackQuality,
  extensionState: indicator.extensionState,
  tradeDecisionAdjustments: indicator.tradeDecisionAdjustments,
  finalRecommendation: indicator.finalRecommendation,
  tradeState: indicator.tradeState,
  dynamicStopLoss: indicator.dynamicStopLoss,
  stopLossStrategy: indicator.stopLossStrategy,
  profitTargets: indicator.profitTargets,
  tradeProgressLabel: indicator.tradeProgressLabel,
  tradeProgressR: indicator.tradeProgressR,
  managementAdvice: indicator.managementAdvice,
  riskLevel: indicator.riskLevel,
  exitWarnings: indicator.exitWarnings,
  professionalSummary: indicator.professionalSummary,
  multiTimeframeAnalyses: indicator.multiTimeframeAnalyses,
  higherTimeframeConfirmation: indicator.higherTimeframeConfirmation,
  marketStructure: indicator.marketStructure,
  swingSequence: indicator.swingSequence,
  swingStrength: indicator.swingStrength,
  structureConfidence: indicator.structureConfidence,
  structureQualityScore: indicator.structureQualityScore,
  structureQualityLabel: indicator.structureQualityLabel,
  bosStatus: indicator.bosStatus,
  bosBreakPrice: indicator.bosBreakPrice,
  candlesSinceBos: indicator.candlesSinceBos,
  bosStrength: indicator.bosStrength,
  chochStatus: indicator.chochStatus,
  chochDetected: indicator.chochDetected,
  retestStatus: indicator.retestStatus,
  compressionState: indicator.compressionState,
  falseBreakdown: indicator.falseBreakdown,
  nearestSwingResistance: indicator.nearestSwingResistance,
  nearestSwingSupport: indicator.nearestSwingSupport,
  resistanceDistancePercent: indicator.resistanceDistancePercent,
  supportDistancePercent: indicator.supportDistancePercent,
  resistanceStrength: indicator.resistanceStrength,
  supportStrength: indicator.supportStrength,
  supportColumnState: indicator.supportColumnState,
  nearestLiquidityZone: indicator.nearestLiquidityZone,
  liquidityDirection: indicator.liquidityDirection,
  liquidityDistancePercent: indicator.liquidityDistancePercent,
  liquidityPressure: indicator.liquidityPressure,
  trendExhaustion: indicator.trendExhaustion,
  impulsiveCandleCount: indicator.impulsiveCandleCount,
  atrExpansionRatio: indicator.atrExpansionRatio,
  climaxVolumeRatio: indicator.climaxVolumeRatio,
  ema20ExtensionPercent: indicator.ema20ExtensionPercent,
  priceActionAnalysis: indicator.priceActionAnalysis,
  structureColumnState: indicator.structureColumnState,
  recentSwingPoints: indicator.recentSwingPoints,
  priceEfficiency: indicator.priceEfficiency,
  emaDistanceScore: indicator.emaDistanceScore,
  trendAgeScore: indicator.trendAgeScore,
  alignmentScore: indicator.alignmentScore,
  slopeScore: indicator.slopeScore,
  volumeScore: indicator.volumeScore,
  momentumScore: indicator.momentumScore,
  sidewaysPenalty: indicator.sidewaysPenalty,
  finalScore: indicator.finalScore,
  distanceEMA20: indicator.distanceFromEMA20Percent
});

const rankByScore = (results: readonly ScannerResult[]): readonly ScannerResult[] =>
  [...results]
    .sort((left, right) => {
      if (right.setupQualityScore !== left.setupQualityScore) {
        return right.setupQualityScore - left.setupQualityScore;
      }

      if (right.entryReadinessScore !== left.entryReadinessScore) {
        return right.entryReadinessScore - left.entryReadinessScore;
      }

      const rightDecision = decisionRank(right.tradeDecisionVerdict);
      const leftDecision = decisionRank(left.tradeDecisionVerdict);
      if (rightDecision !== leftDecision) {
        return rightDecision - leftDecision;
      }

      return left.symbol.localeCompare(right.symbol);
    })
    .map((result, index) => ({ ...result, rank: index + 1 }));

const applyOpportunityFilter = (results: readonly ScannerResult[]): {
  readonly filtered: readonly ScannerResult[];
  readonly eligibleCount: number;
  readonly avoidCount: number;
  readonly weakCount: number;
  readonly watchCount: number;
  readonly strongCount: number;
  readonly aPlusCount: number;
} => {
  const eligible = results.filter((result) => result.eligible);
  const visible = eligible.filter(
    (result) => !(result.setupQualityScore < IGNORE_SCORE_THRESHOLD && result.entryReadinessScore < IGNORE_SCORE_THRESHOLD)
  );
  const filtered = rankByScore(visible);
  const avoidCount = results.filter((result) => result.tradeDecisionVerdict === 'AVOID').length;
  const weakCount = results.filter((result) => result.tradeDecisionVerdict === 'WEAK').length;
  const watchCount = results.filter((result) => result.tradeDecisionVerdict === 'WATCH').length;
  const strongCount = results.filter((result) => result.tradeDecisionVerdict === 'STRONG_SETUP').length;
  const aPlusCount = results.filter((result) => result.tradeDecisionVerdict === 'A_PLUS_SETUP').length;

  return {
    filtered,
    eligibleCount: visible.length,
    avoidCount,
    weakCount,
    watchCount,
    strongCount,
    aPlusCount
  };
};

@Injectable({ providedIn: 'root' })
export class ScannerEngineService {
  private readonly allResultsState = signal<readonly ScannerResult[]>([]);
  private readonly filteredResultsState = signal<readonly ScannerResult[]>([]);
  private readonly summaryState = signal<ScanSummary | null>(null);
  private readonly scanningState = signal(false);
  private readonly progressState = signal<ScanProgress | null>(null);
  private readonly errorState = signal<string | null>(null);

  public readonly allResults = this.allResultsState.asReadonly();
  public readonly filteredResults = this.filteredResultsState.asReadonly();
  public readonly opportunities = this.filteredResultsState.asReadonly();
  public readonly summary = this.summaryState.asReadonly();
  public readonly scanning = this.scanningState.asReadonly();
  public readonly progress = this.progressState.asReadonly();
  public readonly error = this.errorState.asReadonly();

  public constructor(
    private readonly marketsService: MarketsService,
    private readonly indicatorsService: IndicatorsService,
    private readonly scannerSettingsService: ScannerSettingsService
  ) {}

  public async scan(interval: CandleInterval): Promise<void> {
    if (this.scanningState()) {
      return;
    }

    this.scanningState.set(true);
    this.errorState.set(null);

    try {
      await this.marketsService.refresh();

      const marketsError = this.marketsService.error();
      if (marketsError) {
        throw new Error(marketsError);
      }

      const activeMarkets = this.marketsService
        .markets()
        .filter((market) => market.status.toLowerCase() === 'active');

      const total = activeMarkets.length;
      this.progressState.set({ current: 0, total });

      if (total === 0) {
        this.allResultsState.set([]);
        this.filteredResultsState.set([]);
        this.summaryState.set({
          marketsScanned: 0,
          eligible: 0,
          rejected: 0,
          avoid: 0,
          weak: 0,
          watch: 0,
          strong: 0,
          aPlus: 0
        });
        return;
      }

      const scanned: ScannerResult[] = [];
      let completed = 0;

      for (let start = 0; start < activeMarkets.length; start += SCAN_BATCH_SIZE) {
        const batch = activeMarkets.slice(start, start + SCAN_BATCH_SIZE);
        const batchResults = await Promise.all(batch.map((market) => this.scanSingleMarket(market, interval)));

        for (const result of batchResults) {
          completed += 1;
          this.progressState.set({ current: completed, total });

          if (result) {
            scanned.push(result);
          }
        }
      }

      const rankedAll = rankByScore(scanned);
      const {
        filtered,
        eligibleCount,
        avoidCount,
        weakCount,
        watchCount,
        strongCount,
        aPlusCount
      } = applyOpportunityFilter(rankedAll);

      this.allResultsState.set(rankedAll);
      this.filteredResultsState.set(filtered);
      this.summaryState.set({
        marketsScanned: total,
        eligible: eligibleCount,
        rejected: avoidCount,
        avoid: avoidCount,
        weak: weakCount,
        watch: watchCount,
        strong: strongCount,
        aPlus: aPlusCount
      });

      this.logCalibrationReport(rankedAll, {
        marketsScanned: total,
        eligible: eligibleCount,
        rejected: avoidCount,
        avoid: avoidCount,
        weak: weakCount,
        watch: watchCount,
        strong: strongCount,
        aPlus: aPlusCount
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan markets';
      this.errorState.set(message);
      this.allResultsState.set([]);
      this.filteredResultsState.set([]);
      this.summaryState.set(null);
    } finally {
      this.scanningState.set(false);
      this.progressState.set(null);
    }
  }

  private async scanSingleMarket(
    market: Market,
    interval: CandleInterval
  ): Promise<ScannerResult | null> {
    try {
      const indicator = await this.indicatorsService.getIndicators(market.symbol, interval, {
        marketCapUsd: market.marketCapUsd,
        marketVolume24hUsd: market.volume,
        settings: this.scannerSettingsService.settings()
      });
      return toScannerResult(indicator);
    } catch {
      return null;
    }
  }

  private logCalibrationReport(results: readonly ScannerResult[], summary: ScanSummary): void {
    if (environment.production) {
      return;
    }

    const average = (values: readonly number[]): number => {
      if (values.length === 0) {
        return 0;
      }

      return values.reduce((total, value) => total + value, 0) / values.length;
    };

    const hardBlockerCounts = {
      lowLiquidity: results.filter((result) => result.tradeDecisionBlockers.some((item) => item.includes('Liquidity below minimum'))).length,
      lowMarketCap: results.filter((result) => result.tradeDecisionBlockers.some((item) => item.includes('Market cap below minimum'))).length,
      poorRiskReward: results.filter((result) => result.tradeDecisionBlockers.some((item) => item.includes('Risk Reward below minimum'))).length,
      weakMtf: results.filter((result) => result.tradeDecisionBlockers.some((item) => item.includes('MTF conflict'))).length,
      lowEntryScore: results.filter((result) => result.tradeDecisionBlockers.some((item) => item.includes('Entry score below configured minimum'))).length
    };

    const rejectedRatio = summary.marketsScanned === 0 ? 0 : summary.avoid / summary.marketsScanned;
    const strongRatio = summary.marketsScanned === 0 ? 0 : (summary.strong + summary.aPlus) / summary.marketsScanned;

    let calibrationStatus: 'Healthy' | 'Too Strict' | 'Too Loose' = 'Healthy';
    if (rejectedRatio > 0.9 || strongRatio < 0.01) {
      calibrationStatus = 'Too Strict';
    } else if (rejectedRatio < 0.7 && strongRatio > 0.08) {
      calibrationStatus = 'Too Loose';
    }

    console.info('========== Scanner Health ==========', {
      marketsScanned: summary.marketsScanned,
      rejected: summary.avoid,
      weak: summary.weak,
      watch: summary.watch,
      strong: summary.strong,
      aPlus: summary.aPlus,
      averageTrendScore: average(results.map((result) => result.trendScore)).toFixed(2),
      averageEntryScore: average(results.map((result) => result.entryScore)).toFixed(2),
      averageDecisionScore: average(results.map((result) => result.tradeDecisionScore)).toFixed(2),
      hardBlockers: hardBlockerCounts,
      calibrationStatus,
      preview: results.slice(0, 10).map((result) => ({
        symbol: result.symbol,
        decisionScore: result.tradeDecisionScore,
        finalDecision: result.tradeDecisionVerdict,
        blockers: result.tradeDecisionBlockers,
        recommendation: result.finalRecommendation
      }))
    });
  }
}
