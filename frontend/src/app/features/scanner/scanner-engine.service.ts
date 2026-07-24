import { Injectable, signal } from '@angular/core';
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
  readonly highPriority: number;
  readonly mediumPriority: number;
  readonly lowPriority: number;
}

const SCAN_BATCH_SIZE = 8;

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
  trendGrade: indicator.trendGrade,
  entryScore: indicator.entryScore,
  entryGrade: indicator.entryGrade,
  tradeVerdict: indicator.tradeVerdict,
  tradeDecisionScore: indicator.tradeDecisionScore,
  tradeDecisionVerdict: indicator.tradeDecisionVerdict,
  riskRewardBand: indicator.riskRewardBand,
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
    .sort((left, right) => right.score - left.score)
    .map((result, index) => ({ ...result, rank: index + 1 }));

const applyOpportunityFilter = (results: readonly ScannerResult[]): {
  readonly filtered: readonly ScannerResult[];
  readonly eligibleCount: number;
  readonly highPriorityCount: number;
  readonly mediumPriorityCount: number;
  readonly lowPriorityCount: number;
} => {
  const eligible = results.filter((result) => result.eligible);
  const filtered = rankByScore(eligible);
  const highPriorityCount = eligible.filter((result) => result.priority === 'High').length;
  const mediumPriorityCount = eligible.filter((result) => result.priority === 'Medium').length;
  const lowPriorityCount = eligible.filter((result) => result.priority === 'Low').length;

  return {
    filtered,
    eligibleCount: eligible.length,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount
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
    private readonly indicatorsService: IndicatorsService
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
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0
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
        highPriorityCount,
        mediumPriorityCount,
        lowPriorityCount
      } = applyOpportunityFilter(rankedAll);

      this.allResultsState.set(rankedAll);
      this.filteredResultsState.set(filtered);
      this.summaryState.set({
        marketsScanned: total,
        eligible: eligibleCount,
        rejected: total - eligibleCount,
        highPriority: highPriorityCount,
        mediumPriority: mediumPriorityCount,
        lowPriority: lowPriorityCount
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
      const indicator = await this.indicatorsService.getIndicators(market.symbol, interval);
      return toScannerResult(indicator);
    } catch {
      return null;
    }
  }
}
