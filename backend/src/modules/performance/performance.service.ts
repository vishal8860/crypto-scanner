import { AppError } from '../../common/errors/app-error.js';
import {
  BreakdownRow,
  DashboardMetrics,
  HeatmapCell,
  IndicatorValidationPayload,
  TradeHistoryCreateInput,
  TradeHistoryRecord,
  TrendGrade,
  VersionMetrics
} from './trade-history.interface.js';
import { FileTradeHistoryRepository, TradeHistoryRepository } from './trade-history.repository.js';

const TREND_GRADES: readonly TrendGrade[] = ['Excellent', 'Good', 'Average', 'Poor'];
const ENTRY_GRADES = ['Ready', 'Watch', 'Developing', 'Poor'] as const;

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const mean = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export class PerformanceService {
  public constructor(private readonly repository: TradeHistoryRepository = new FileTradeHistoryRepository()) {}

  public async recordTrade(input: TradeHistoryCreateInput): Promise<TradeHistoryRecord> {
    this.validateTrade(input);
    return this.repository.create(input);
  }

  public async listTrades(scannerVersion?: string): Promise<readonly TradeHistoryRecord[]> {
    return this.repository.list(scannerVersion);
  }

  public async dashboard(scannerVersion?: string): Promise<DashboardMetrics> {
    const trades = await this.repository.list(scannerVersion);
    return this.computeDashboard(trades);
  }

  public async breakdowns(scannerVersion?: string): Promise<{
    readonly decisionGrade: readonly BreakdownRow[];
    readonly trendGrade: readonly BreakdownRow[];
    readonly entryGrade: readonly BreakdownRow[];
    readonly tradeStage: readonly BreakdownRow[];
    readonly trendAge: readonly BreakdownRow[];
    readonly volumeQuality: readonly BreakdownRow[];
  }> {
    const trades = await this.repository.list(scannerVersion);

    return {
      decisionGrade: this.computeBreakdown(trades, (trade) => trade.decisionGrade),
      trendGrade: this.computeBreakdown(trades, (trade) => trade.trendGrade),
      entryGrade: this.computeBreakdown(trades, (trade) => trade.entryGrade),
      tradeStage: this.computeBreakdown(trades, (trade) => trade.tradeStage),
      trendAge: this.computeBreakdown(trades, (trade) => trade.trendAge),
      volumeQuality: this.computeBreakdown(trades, (trade) => trade.volumeQuality)
    };
  }

  public async trendEntryHeatmap(scannerVersion?: string): Promise<readonly HeatmapCell[]> {
    const trades = await this.repository.list(scannerVersion);
    const rows: HeatmapCell[] = [];

    for (const trendGrade of TREND_GRADES) {
      for (const entryGrade of ENTRY_GRADES) {
        const cellTrades = trades.filter(
          (trade) => trade.trendGrade === trendGrade && trade.entryGrade === entryGrade
        );
        const wins = cellTrades.filter((trade) => trade.winLoss === 'Win').length;

        rows.push({
          trendGrade,
          entryGrade,
          trades: cellTrades.length,
          winRate: cellTrades.length === 0 ? 0 : roundTo((wins / cellTrades.length) * 100, 2),
          averageR: roundTo(mean(cellTrades.map((trade) => trade.profitLossR)), 2)
        });
      }
    }

    return rows;
  }

  public async indicatorValidation(scannerVersion?: string): Promise<IndicatorValidationPayload> {
    const trades = await this.repository.list(scannerVersion);

    return {
      trendAge: this.computeBreakdown(trades, (trade) => trade.trendAge),
      volumeQuality: this.computeBreakdown(trades, (trade) => trade.volumeQuality),
      emaDistanceBuckets: this.computeBreakdown(trades, (trade) => this.emaDistanceBucket(trade.distanceFromEMA20PercentAtEntry)),
      pullbackQualityBuckets: this.computeBreakdown(trades, (trade) => trade.pullbackQualityAtEntry),
      riskRewardBuckets: this.computeBreakdown(trades, (trade) => this.riskRewardBucket(trade.riskRewardAtEntry))
    };
  }

  public async versionComparison(): Promise<readonly VersionMetrics[]> {
    const trades = await this.repository.list();
    const versions = [...new Set(trades.map((trade) => trade.scannerVersion))].sort();

    return versions.map((version) => {
      const versionTrades = trades.filter((trade) => trade.scannerVersion === version);
      const dashboard = this.computeDashboard(versionTrades);

      return {
        scannerVersion: version,
        totalTrades: dashboard.totalTrades,
        winRate: dashboard.winRate,
        averageR: dashboard.averageR,
        profitFactor: dashboard.profitFactor
      };
    });
  }

  private computeBreakdown(
    trades: readonly TradeHistoryRecord[],
    bucketSelector: (trade: TradeHistoryRecord) => string
  ): readonly BreakdownRow[] {
    const grouped = new Map<string, TradeHistoryRecord[]>();

    for (const trade of trades) {
      const bucket = bucketSelector(trade);
      const bucketTrades = grouped.get(bucket) ?? [];
      bucketTrades.push(trade);
      grouped.set(bucket, bucketTrades);
    }

    return [...grouped.entries()]
      .map(([bucket, bucketTrades]) => {
        const wins = bucketTrades.filter((trade) => trade.winLoss === 'Win').length;
        const losses = bucketTrades.length - wins;

        return {
          bucket,
          trades: bucketTrades.length,
          wins,
          losses,
          winRate: bucketTrades.length === 0 ? 0 : roundTo((wins / bucketTrades.length) * 100, 2),
          averageR: roundTo(mean(bucketTrades.map((trade) => trade.profitLossR)), 2)
        };
      })
      .sort((left, right) => right.trades - left.trades || left.bucket.localeCompare(right.bucket));
  }

  private computeDashboard(trades: readonly TradeHistoryRecord[]): DashboardMetrics {
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        averageR: 0,
        averageWinner: 0,
        averageLoser: 0,
        profitFactor: 0,
        averageHoldingTimeMinutes: 0,
        longestWinningStreak: 0,
        longestLosingStreak: 0
      };
    }

    const winners = trades.filter((trade) => trade.winLoss === 'Win');
    const losers = trades.filter((trade) => trade.winLoss === 'Loss');
    const grossProfit = winners.reduce((sum, trade) => sum + trade.profitLossR, 0);
    const grossLossMagnitude = Math.abs(losers.reduce((sum, trade) => sum + trade.profitLossR, 0));

    return {
      totalTrades,
      winRate: roundTo((winners.length / totalTrades) * 100, 2),
      averageR: roundTo(mean(trades.map((trade) => trade.profitLossR)), 2),
      averageWinner: roundTo(mean(winners.map((trade) => trade.profitLossR)), 2),
      averageLoser: roundTo(mean(losers.map((trade) => trade.profitLossR)), 2),
      profitFactor: grossLossMagnitude === 0 ? roundTo(grossProfit, 2) : roundTo(grossProfit / grossLossMagnitude, 2),
      averageHoldingTimeMinutes: roundTo(mean(trades.map((trade) => trade.holdingTimeMinutes)), 2),
      longestWinningStreak: this.longestStreak(trades, 'Win'),
      longestLosingStreak: this.longestStreak(trades, 'Loss')
    };
  }

  private longestStreak(trades: readonly TradeHistoryRecord[], side: 'Win' | 'Loss'): number {
    let longest = 0;
    let current = 0;

    const ordered = [...trades].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    for (const trade of ordered) {
      if (trade.winLoss === side) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }

    return longest;
  }

  private emaDistanceBucket(distancePercent: number): string {
    const magnitude = Math.abs(distancePercent);

    if (magnitude <= 0.8) {
      return 'Near EMA20 (<=0.8%)';
    }

    if (magnitude <= 1.5) {
      return 'Moderate (0.8%-1.5%)';
    }

    return 'Extended (>1.5%)';
  }

  private riskRewardBucket(riskReward: number): string {
    if (riskReward > 2.5) {
      return 'Excellent (>2.5)';
    }

    if (riskReward >= 2) {
      return 'Good (2.0-2.5)';
    }

    if (riskReward >= 1.5) {
      return 'Average (1.5-2.0)';
    }

    return 'Poor (<1.5)';
  }

  private validateTrade(input: TradeHistoryCreateInput): void {
    if (!input.symbol || !input.timestamp || !input.scannerVersion) {
      throw new AppError(400, 'symbol, timestamp, and scannerVersion are required');
    }

    if (!Number.isFinite(input.trendScore) || !Number.isFinite(input.entryScore)) {
      throw new AppError(400, 'trendScore and entryScore must be valid numbers');
    }

    if (input.direction !== undefined && input.direction !== 'Short') {
      throw new AppError(400, 'Only Short direction is currently supported');
    }

    if (!Number.isFinite(input.profitLossR) || !Number.isFinite(input.profitLossPercent)) {
      throw new AppError(400, 'profitLossR and profitLossPercent must be valid numbers');
    }
  }
}
