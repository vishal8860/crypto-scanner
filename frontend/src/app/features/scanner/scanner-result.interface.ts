import {
  SlopeCategory,
  EntryGrade,
  BosDirection,
  ChochDirection,
  CompressionState,
  ExtensionState,
  HigherTimeframeConfirmation,
  LiquidityDirection,
  LiquidityZoneType,
  MarketStructureLabel,
  MarketStructure,
  MultiTimeframeSnapshot,
  PriceActionSnapshot,
  ProfitTarget,
  PullbackQuality,
  RiskLevel,
  RiskRewardBand,
  RetestStatus,
  StructureQualityLabel,
  StructureColumnState,
  StructureTrend,
  SupportColumnState,
  SupportResistanceStrength,
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
  TrendExhaustionState,
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
