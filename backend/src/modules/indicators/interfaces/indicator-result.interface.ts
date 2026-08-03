export type Trend = 'Bullish' | 'Bearish' | 'Neutral';
export enum MarketStructure {
  StrongBearish = 'StrongBearish',
  Bearish = 'Bearish',
  TransitionalBearish = 'TransitionalBearish',
  Neutral = 'Neutral',
  TransitionalBullish = 'TransitionalBullish',
  Bullish = 'Bullish',
  StrongBullish = 'StrongBullish'
}
export type MarketQuality = 'Excellent' | 'Good' | 'Average' | 'Risky' | 'Avoid';
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
export type TradeState = 'Waiting' | 'Ready to Enter' | 'In Position' | 'Partial Profit' | 'Trail Stop' | 'Exit';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type WarningSeverity = 'low' | 'medium' | 'high';
export type HigherTimeframeConfirmation = 'Confirmed' | 'Neutral' | 'Counter Trend';
export type MarketStructureLabel = 'HH' | 'HL' | 'LH' | 'LL';
export type StructureTrend = 'Bullish Structure' | 'Bearish Structure' | 'Mixed Structure';
export type BosDirection = 'Bullish BOS' | 'Bearish BOS' | 'No BOS';
export type ChochDirection = 'Bullish CHoCH' | 'Bearish CHoCH' | 'None';
export type RetestStatus = 'Broke and Continued' | 'Retesting' | 'Broke then Retested' | 'Broke then Failed' | 'No Retest';
export type CompressionState = 'Triangle' | 'Range' | 'Low Volatility Squeeze' | 'None';
export type StructureColumnState = 'Strong' | 'Mixed' | 'Weak';
export type SupportResistanceStrength = 'Strong' | 'Medium' | 'Weak' | 'None';
export type SupportColumnState = 'Clear' | 'Near' | 'Strong Support';
export type LiquidityZoneType =
  | 'Equal Highs'
  | 'Equal Lows'
  | 'Previous Day High'
  | 'Previous Day Low'
  | 'Swing High Liquidity'
  | 'Swing Low Liquidity'
  | 'None';
export type LiquidityDirection = 'Above' | 'Below' | 'At Price' | 'None';
export type TrendExhaustionState = 'Healthy Trend' | 'Extended' | 'Exhausted' | 'Parabolic';
export type StructureQualityLabel = 'Excellent' | 'Good' | 'Average' | 'Poor';

export interface TradeDecisionAdjustment {
  readonly label: string;
  readonly points: number;
  readonly reason: string;
}

export interface ProfitTarget {
  readonly label: 'TP1' | 'TP2' | 'TP3';
  readonly price: number | null;
  readonly rMultiple: number | null;
}

export interface TradeWarning {
  readonly severity: WarningSeverity;
  readonly message: string;
}

export interface MultiTimeframeSnapshot {
  readonly timeframe: string;
  readonly trendScore: number;
  readonly entryScore: number;
  readonly trendGrade: TrendGrade;
  readonly tradeStage: TradeStage;
  readonly tradeStageLabel: string;
  readonly trend: Trend;
  readonly emaAlignment: boolean;
  readonly volumeQuality: VolumeQuality;
  readonly trendStrengthScore: number;
}

export interface SwingPoint {
  readonly label: MarketStructureLabel;
  readonly price: number;
  readonly index: number;
}

export interface PriceActionSnapshot {
  readonly structureTrend: StructureTrend;
  readonly swingSequence: readonly MarketStructureLabel[];
  readonly swingStrength: number;
  readonly structureConfidence: number;
  readonly structureQualityScore: number;
  readonly structureQualityLabel: StructureQualityLabel;
  readonly structureColumnState: StructureColumnState;
  readonly bosStatus: BosDirection;
  readonly bosBreakPrice: number | null;
  readonly candlesSinceBos: number | null;
  readonly bosStrength: number;
  readonly chochStatus: ChochDirection;
  readonly retestStatus: RetestStatus;
  readonly compressionState: CompressionState;
  readonly falseBreakdown: boolean;
  readonly nearestSupport: number | null;
  readonly nearestResistance: number | null;
  readonly supportDistancePercent: number | null;
  readonly resistanceDistancePercent: number | null;
  readonly supportStrength: SupportResistanceStrength;
  readonly resistanceStrength: SupportResistanceStrength;
  readonly supportColumnState: SupportColumnState;
  readonly nearestLiquidityZone: LiquidityZoneType;
  readonly liquidityDirection: LiquidityDirection;
  readonly liquidityDistancePercent: number | null;
  readonly liquidityPressure: boolean;
  readonly trendExhaustion: TrendExhaustionState;
  readonly impulsiveCandleCount: number;
  readonly atrExpansionRatio: number;
  readonly climaxVolumeRatio: number;
  readonly ema20ExtensionPercent: number;
  readonly swingPattern: string;
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
  readonly professionalMarketStructure: MarketStructure;
  readonly professionalMarketStructureReason: readonly string[];
  readonly marketStructureWhySentence: string;
  readonly marketStructurePriority: number;
  readonly trendGrade: TrendGrade;
  readonly entryScore: number;
  readonly entryGrade: EntryGrade;
  readonly tradeVerdict: TradeVerdict;
  readonly tradeDecisionScore: number;
  readonly tradeDecisionVerdict: TradeDecisionVerdict;
  readonly tradeDecisionBlockers: readonly string[];
  readonly riskRewardBand: RiskRewardBand;
  readonly marketQuality: MarketQuality;
  readonly marketQualityScore: number;
  readonly marketQualityReasons: readonly string[];
  readonly marketCapUsd: number | null;
  readonly marketVolume24hUsd: number | null;
  readonly pullbackQuality: PullbackQuality;
  readonly extensionState: ExtensionState;
  readonly tradeDecisionAdjustments: readonly TradeDecisionAdjustment[];
  readonly finalRecommendation: string;
  readonly tradeState: TradeState;
  readonly dynamicStopLoss: number | null;
  readonly stopLossStrategy: string;
  readonly profitTargets: readonly ProfitTarget[];
  readonly tradeProgressLabel: string;
  readonly tradeProgressR: number | null;
  readonly managementAdvice: string;
  readonly riskLevel: RiskLevel;
  readonly exitWarnings: readonly TradeWarning[];
  readonly professionalSummary: string;
  readonly multiTimeframeAnalyses: readonly MultiTimeframeSnapshot[];
  readonly higherTimeframeConfirmation: HigherTimeframeConfirmation;
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
  readonly resistanceStrength: SupportResistanceStrength;
  readonly supportStrength: SupportResistanceStrength;
  readonly supportColumnState: SupportColumnState;
  readonly nearestLiquidityZone: LiquidityZoneType;
  readonly liquidityDirection: LiquidityDirection;
  readonly liquidityDistancePercent: number | null;
  readonly liquidityPressure: boolean;
  readonly trendExhaustion: TrendExhaustionState;
  readonly impulsiveCandleCount: number;
  readonly atrExpansionRatio: number;
  readonly climaxVolumeRatio: number;
  readonly ema20ExtensionPercent: number;
  readonly priceActionAnalysis: PriceActionSnapshot;
  readonly structureColumnState: StructureColumnState;
  readonly recentSwingPoints: readonly SwingPoint[];
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
