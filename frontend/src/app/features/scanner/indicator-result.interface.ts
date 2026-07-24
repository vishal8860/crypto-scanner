export type Trend = 'Bullish' | 'Bearish' | 'Neutral';
export type TrendAge = 'Fresh' | 'Developing' | 'Old';
export type SlopeCategory = 'Strong Down' | 'Moderate Down' | 'Flat' | 'Rising';
export type VolumeQuality = 'Poor' | 'Average' | 'Good' | 'Excellent';
export type TrendClassification = 'Strong Bearish' | 'Bearish' | 'Neutral' | 'Weak Bullish' | 'Bullish';
export type TradePriority = 'High' | 'Medium' | 'Low';
export type TradeStage =
  | 'EARLY_BREAKDOWN'
  | 'PULLBACK_ENTRY'
  | 'TREND_CONTINUATION'
  | 'LATE_TREND'
  | 'SIDEWAYS';
export type TrendGrade = 'Excellent' | 'Good' | 'Average' | 'Poor';
export type EntryGrade = 'Ready' | 'Watch' | 'Developing' | 'Poor';
export type TradeVerdict = 'READY' | 'WATCH' | 'DEVELOPING' | 'IGNORE';
export type TradeDecisionVerdict = 'A_PLUS_SETUP' | 'STRONG_SETUP' | 'WATCH' | 'WEAK' | 'AVOID';
export type RiskRewardBand = 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Unknown';
export type PullbackQuality = 'Perfect Pullback' | 'Acceptable Pullback' | 'Extended Move';
export type ExtensionState = 'Not Extended' | 'Slightly Extended' | 'Extended';

export interface TradeDecisionAdjustment {
  readonly label: string;
  readonly points: number;
  readonly reason: string;
}

export interface IndicatorResult {
  readonly symbol: string;
  readonly price: number;
  readonly ema9: number;
  readonly ema20: number;
  readonly ema200: number;
  readonly ema20SlopePercent: number;
  readonly ema20SlopeCategory: SlopeCategory;
  readonly ema200SlopePercent: number;
  readonly ema200SlopeCategory: SlopeCategory;
  readonly trendClassification: TrendClassification;
  readonly trendStrengthScore: number;
  readonly isSideways: boolean;
  readonly sidewaysScore: number;
  readonly volumeQuality: VolumeQuality;
  readonly priceEfficiency: number;
  readonly eligible: boolean;
  readonly eligibilityReasons: readonly string[];
  readonly priority: TradePriority;
  readonly tradeStage: TradeStage;
  readonly tradeStageLabel: string;
  readonly tradeStageColor: 'green' | 'blue' | 'orange' | 'red' | 'neutral';
  readonly tradeStageReason: string;
  readonly suggestedEntry: number | null;
  readonly suggestedStopLoss: number | null;
  readonly suggestedTakeProfit: number | null;
  readonly riskReward: number | null;
  readonly entryQuality: number;
  readonly planningReason: string;
  readonly trendScore: number;
  readonly trendGrade: TrendGrade;
  readonly entryScore: number;
  readonly entryGrade: EntryGrade;
  readonly tradeVerdict: TradeVerdict;
  readonly tradeDecisionScore: number;
  readonly tradeDecisionVerdict: TradeDecisionVerdict;
  readonly riskRewardBand: RiskRewardBand;
  readonly pullbackQuality: PullbackQuality;
  readonly extensionState: ExtensionState;
  readonly tradeDecisionAdjustments: readonly TradeDecisionAdjustment[];
  readonly finalRecommendation: string;
  readonly emaDistanceScore: number;
  readonly trendAgeScore: number;
  readonly alignmentScore: number;
  readonly slopeScore: number;
  readonly volumeScore: number;
  readonly momentumScore: number;
  readonly sidewaysPenalty: number;
  readonly finalScore: number;
  readonly distanceFromEMA20Percent: number;
  readonly distanceFromEMA200Percent: number;
  readonly isBelowEMA200: boolean;
  readonly isBearishAlignment: boolean;
  readonly trend: Trend;
  readonly candlesSinceEMA200Cross: number;
  readonly freshCross: boolean;
  readonly trendAge: TrendAge;
  readonly scannerScore: number;
}
