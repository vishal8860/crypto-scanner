import {
  SlopeCategory,
  EntryGrade,
  BosDirection,
  CompressionState,
  ExtensionState,
  HigherTimeframeConfirmation,
  MarketStructureLabel,
  MultiTimeframeSnapshot,
  ProfitTarget,
  PullbackQuality,
  RiskLevel,
  RiskRewardBand,
  RetestStatus,
  StructureColumnState,
  StructureTrend,
  SwingPoint,
  TradeState,
  TradeWarning,
  TradeDecisionAdjustment,
  TradeDecisionVerdict,
  TradeVerdict,
  TradePriority,
  TradeStage,
  TrendGrade,
  Trend,
  TrendAge,
  TrendClassification,
  VolumeQuality
} from './indicator-result.interface';

export interface ScannerResult {
  readonly rank: number;
  readonly symbol: string;
  readonly price: number;
  readonly score: number;
  readonly trend: Trend;
  readonly trendAge: TrendAge;
  readonly freshCross: boolean;
  readonly belowEMA200: boolean;
  readonly bearishAlignment: boolean;
  readonly distanceEMA200: number;
  readonly candlesSinceCross: number;
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
  readonly priceEfficiency: number;
  readonly emaDistanceScore: number;
  readonly trendAgeScore: number;
  readonly alignmentScore: number;
  readonly slopeScore: number;
  readonly volumeScore: number;
  readonly momentumScore: number;
  readonly sidewaysPenalty: number;
  readonly finalScore: number;
  readonly distanceEMA20: number;
}
