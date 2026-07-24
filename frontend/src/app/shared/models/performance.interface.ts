export interface TradeHistoryRecord {
  readonly id: string;
  readonly symbol: string;
  readonly timestamp: string;
  readonly direction: 'Short';
  readonly trendScore: number;
  readonly entryScore: number;
  readonly decisionGrade: 'A+ Setup' | 'Strong Setup' | 'Watch' | 'Weak' | 'Avoid';
  readonly tradeStage: 'EARLY_BREAKDOWN' | 'PULLBACK_ENTRY' | 'TREND_CONTINUATION' | 'LATE_TREND' | 'SIDEWAYS';
  readonly trendGrade: 'Excellent' | 'Good' | 'Average' | 'Poor';
  readonly entryGrade: 'Ready' | 'Watch' | 'Developing' | 'Poor';
  readonly trendAge: 'Fresh' | 'Developing' | 'Old';
  readonly volumeQuality: 'Poor' | 'Average' | 'Good' | 'Excellent';
  readonly riskRewardAtEntry: number;
  readonly scannerVersion: string;
  readonly entryPrice: number;
  readonly stopLoss: number;
  readonly target: number;
  readonly exitPrice: number;
  readonly exitReason: 'TP1' | 'TP2' | 'Stop' | 'Manual' | 'Timeout';
  readonly holdingTimeMinutes: number;
  readonly profitLossPercent: number;
  readonly profitLossR: number;
  readonly winLoss: 'Win' | 'Loss';
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

export interface BreakdownsPayload {
  readonly decisionGrade: readonly BreakdownRow[];
  readonly trendGrade: readonly BreakdownRow[];
  readonly entryGrade: readonly BreakdownRow[];
  readonly tradeStage: readonly BreakdownRow[];
  readonly trendAge: readonly BreakdownRow[];
  readonly volumeQuality: readonly BreakdownRow[];
}

export interface HeatmapCell {
  readonly trendGrade: 'Excellent' | 'Good' | 'Average' | 'Poor';
  readonly entryGrade: 'Ready' | 'Watch' | 'Developing' | 'Poor';
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
