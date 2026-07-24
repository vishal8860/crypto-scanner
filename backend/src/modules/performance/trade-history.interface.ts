export type TradeDirection = 'Short';
export type DecisionGrade = 'A+ Setup' | 'Strong Setup' | 'Watch' | 'Weak' | 'Avoid';
export type TrendGrade = 'Excellent' | 'Good' | 'Average' | 'Poor';
export type EntryGrade = 'Ready' | 'Watch' | 'Developing' | 'Poor';
export type TradeStage =
  | 'EARLY_BREAKDOWN'
  | 'PULLBACK_ENTRY'
  | 'TREND_CONTINUATION'
  | 'LATE_TREND'
  | 'SIDEWAYS';
export type TrendAge = 'Fresh' | 'Developing' | 'Old';
export type VolumeQuality = 'Poor' | 'Average' | 'Good' | 'Excellent';
export type ExitReason = 'TP1' | 'TP2' | 'Stop' | 'Manual' | 'Timeout';
export type WinLoss = 'Win' | 'Loss';

export interface TradeHistoryRecord {
  readonly id: string;
  readonly symbol: string;
  readonly timestamp: string;
  readonly direction: TradeDirection;
  readonly trendScore: number;
  readonly entryScore: number;
  readonly decisionGrade: DecisionGrade;
  readonly tradeStage: TradeStage;
  readonly trendGrade: TrendGrade;
  readonly entryGrade: EntryGrade;
  readonly trendAge: TrendAge;
  readonly volumeQuality: VolumeQuality;
  readonly riskRewardAtEntry: number;
  readonly scannerVersion: string;
  readonly entryPrice: number;
  readonly stopLoss: number;
  readonly target: number;
  readonly exitPrice: number;
  readonly exitReason: ExitReason;
  readonly holdingTimeMinutes: number;
  readonly profitLossPercent: number;
  readonly profitLossR: number;
  readonly winLoss: WinLoss;
  readonly distanceFromEMA20PercentAtEntry: number;
  readonly pullbackQualityAtEntry: 'Perfect Pullback' | 'Acceptable Pullback' | 'Extended Move';
}

export interface TradeHistoryCreateInput {
  readonly symbol: string;
  readonly timestamp: string;
  readonly direction?: TradeDirection;
  readonly trendScore: number;
  readonly entryScore: number;
  readonly decisionGrade: DecisionGrade;
  readonly tradeStage: TradeStage;
  readonly trendGrade: TrendGrade;
  readonly entryGrade: EntryGrade;
  readonly trendAge: TrendAge;
  readonly volumeQuality: VolumeQuality;
  readonly riskRewardAtEntry: number;
  readonly scannerVersion: string;
  readonly entryPrice: number;
  readonly stopLoss: number;
  readonly target: number;
  readonly exitPrice: number;
  readonly exitReason: ExitReason;
  readonly holdingTimeMinutes: number;
  readonly profitLossPercent: number;
  readonly profitLossR: number;
  readonly winLoss: WinLoss;
  readonly distanceFromEMA20PercentAtEntry: number;
  readonly pullbackQualityAtEntry: 'Perfect Pullback' | 'Acceptable Pullback' | 'Extended Move';
}

export interface DashboardMetrics {
  readonly totalTrades: number;
  readonly winRate: number;
  readonly averageR: number;
  readonly averageWinner: number;
  readonly averageLoser: number;
  readonly profitFactor: number;
  readonly averageHoldingTimeMinutes: number;
  readonly longestWinningStreak: number;
  readonly longestLosingStreak: number;
}

export interface BreakdownRow {
  readonly bucket: string;
  readonly trades: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly averageR: number;
}

export interface HeatmapCell {
  readonly trendGrade: TrendGrade;
  readonly entryGrade: EntryGrade;
  readonly trades: number;
  readonly winRate: number;
  readonly averageR: number;
}

export interface IndicatorValidationPayload {
  readonly trendAge: readonly BreakdownRow[];
  readonly volumeQuality: readonly BreakdownRow[];
  readonly emaDistanceBuckets: readonly BreakdownRow[];
  readonly pullbackQualityBuckets: readonly BreakdownRow[];
  readonly riskRewardBuckets: readonly BreakdownRow[];
}

export interface VersionMetrics {
  readonly scannerVersion: string;
  readonly totalTrades: number;
  readonly winRate: number;
  readonly averageR: number;
  readonly profitFactor: number;
}
