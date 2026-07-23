import {
  SlopeCategory,
  EntryGrade,
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
