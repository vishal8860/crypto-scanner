import {
  DECISION_EXTREME_EXTENSION_PERCENT,
  DECISION_HARD_BLOCK_RISK_REWARD_MIN,
  DECISION_MAJOR_SUPPORT_DISTANCE_PERCENT,
  DECISION_NEAR_SUPPORT_DISTANCE_PERCENT,
  DECISION_NEAR_SUPPORT_PENALTY,
  DECISION_SLIGHT_EXTENSION_PENALTY,
  TRADE_DECISION_A_PLUS_MIN,
  TRADE_DECISION_STRONG_MIN,
  TRADE_DECISION_WATCH_MIN,
  TRADE_DECISION_WEAK_MIN,
  TRADE_DECISION_WEIGHTS
} from '../constants/indicator.constants.js';
import {
  ExtensionState,
  HigherTimeframeConfirmation,
  MarketQuality,
  PullbackQuality,
  RiskRewardBand,
  TradeDecisionAdjustment,
  TradeDecisionVerdict,
  TradeStage,
  VolumeQuality
} from '../interfaces/indicator-result.interface.js';

export interface TradeDecisionInput {
  readonly trendScore: number;
  readonly entryScore: number;
  readonly riskReward: number | null;
  readonly volumeQuality: VolumeQuality;
  readonly tradeStage: TradeStage;
  readonly distanceFromEMA20Percent: number;
  readonly distanceFromEMA200Percent: number;
  readonly trendStrengthScore: number;
  readonly freshCross: boolean;
  readonly trendAge: 'Fresh' | 'Developing' | 'Old';
  readonly candlesSinceEMA200Cross: number;
  readonly isBelowEMA200: boolean;
  readonly isBearishAlignment: boolean;
  readonly ema20SlopePercent: number;
  readonly isSideways: boolean;
  readonly sidewaysScore: number;
  readonly higherTimeframeConfirmation: HigherTimeframeConfirmation;
  readonly marketQuality: MarketQuality;
  readonly marketQualityScore: number;
  readonly supportDistancePercent: number | null;
}

export interface TradeDecisionResult {
  readonly tradeDecisionScore: number;
  readonly tradeDecisionVerdict: TradeDecisionVerdict;
  readonly tradeDecisionBlockers: readonly string[];
  readonly riskRewardBand: RiskRewardBand;
  readonly pullbackQuality: PullbackQuality;
  readonly extensionState: ExtensionState;
  readonly tradeDecisionAdjustments: readonly TradeDecisionAdjustment[];
  readonly finalRecommendation: string;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export class TradeDecisionService {
  public assess(input: TradeDecisionInput): TradeDecisionResult {
    const riskRewardBand = this.resolveRiskRewardBand(input.riskReward);
    const pullbackQuality = this.resolvePullbackQuality(input.tradeStage, input.distanceFromEMA20Percent);
    const extensionState = this.resolveExtensionState(input.distanceFromEMA20Percent, input.distanceFromEMA200Percent);
    const blockers = this.resolveHardBlockers(input, extensionState);

    const componentScores = {
      trendScore: input.trendScore,
      entryScore: input.entryScore,
      multiTimeframeScore: this.multiTimeframeScore(input.higherTimeframeConfirmation),
      marketQualityScore: input.marketQualityScore,
      riskRewardScore: this.riskRewardBandScore(riskRewardBand)
    } as const;

    const baseDecisionScore =
      componentScores.trendScore * TRADE_DECISION_WEIGHTS.trendScore +
      componentScores.entryScore * TRADE_DECISION_WEIGHTS.entryScore +
      componentScores.multiTimeframeScore * TRADE_DECISION_WEIGHTS.multiTimeframe +
      componentScores.marketQualityScore * TRADE_DECISION_WEIGHTS.marketQuality +
      componentScores.riskRewardScore * TRADE_DECISION_WEIGHTS.riskReward;
    const softPenalties = this.resolveSoftPenalties(input, extensionState);
    const softPenaltyTotal = softPenalties.reduce((total, item) => total + item.points, 0);
    const tradeDecisionScore = roundTo(clamp(baseDecisionScore + softPenaltyTotal, 0, 100), 2);

    const tradeDecisionVerdict = blockers.length > 0 ? 'AVOID' : this.resolveVerdictByScore(tradeDecisionScore);
    const tradeDecisionAdjustments = this.resolveDecisionExplanation(
      input,
      componentScores,
      riskRewardBand,
      blockers,
      softPenalties,
      tradeDecisionScore
    );

    return {
      tradeDecisionScore,
      tradeDecisionVerdict,
      tradeDecisionBlockers: blockers,
      riskRewardBand,
      pullbackQuality,
      extensionState,
      tradeDecisionAdjustments,
      finalRecommendation: this.resolveRecommendation(tradeDecisionVerdict, blockers)
    };
  }

  private resolveRiskRewardBand(riskReward: number | null): RiskRewardBand {
    if (riskReward === null) {
      return 'Unknown';
    }

    if (riskReward > 2.5) {
      return 'Excellent';
    }

    if (riskReward >= 2) {
      return 'Good';
    }

    if (riskReward >= 1.5) {
      return 'Average';
    }

    return 'Poor';
  }

  private resolvePullbackQuality(stage: TradeStage, distanceFromEMA20Percent: number): PullbackQuality {
    const distance = Math.abs(distanceFromEMA20Percent);

    if (stage === 'PULLBACK_ENTRY' && distance <= 0.8) {
      return 'Perfect Pullback';
    }

    if (distance <= 1.5) {
      return 'Acceptable Pullback';
    }

    return 'Extended Move';
  }

  private resolveHardBlockers(input: TradeDecisionInput, extensionState: ExtensionState): readonly string[] {
    const blockers: string[] = [];

    if (input.riskReward === null || input.riskReward < DECISION_HARD_BLOCK_RISK_REWARD_MIN) {
      blockers.push('Risk Reward below minimum threshold.');
    }

    if (input.marketQuality === 'Avoid') {
      blockers.push('Market Quality below threshold.');
    }

    if (input.higherTimeframeConfirmation === 'Counter Trend') {
      blockers.push('MTF conflict: higher timeframe is bullish against the setup.');
    }

    if (
      input.supportDistancePercent !== null &&
      Math.abs(input.supportDistancePercent) <= DECISION_MAJOR_SUPPORT_DISTANCE_PERCENT
    ) {
      blockers.push('Price is sitting directly on major support with no room to downside.');
    }

    if (
      Math.abs(input.distanceFromEMA20Percent) >= DECISION_EXTREME_EXTENSION_PERCENT ||
      extensionState === 'Extended'
    ) {
      blockers.push('Price is already extremely extended outside the acceptable zone.');
    }

    return blockers;
  }

  private resolveSoftPenalties(
    input: TradeDecisionInput,
    extensionState: ExtensionState
  ): readonly TradeDecisionAdjustment[] {
    const penalties: TradeDecisionAdjustment[] = [];

    if (
      input.supportDistancePercent !== null &&
      Math.abs(input.supportDistancePercent) > DECISION_MAJOR_SUPPORT_DISTANCE_PERCENT &&
      Math.abs(input.supportDistancePercent) <= DECISION_NEAR_SUPPORT_DISTANCE_PERCENT
    ) {
      penalties.push({
        label: 'Support Penalty',
        points: DECISION_NEAR_SUPPORT_PENALTY,
        reason: 'Price is close to nearby support, reducing immediate downside room.'
      });
    }

    if (extensionState === 'Slightly Extended') {
      penalties.push({
        label: 'Extension Penalty',
        points: DECISION_SLIGHT_EXTENSION_PENALTY,
        reason: 'Price is somewhat extended and may need consolidation first.'
      });
    }

    return penalties;
  }

  private resolveDecisionExplanation(
    input: TradeDecisionInput,
    componentScores: {
      readonly trendScore: number;
      readonly entryScore: number;
      readonly multiTimeframeScore: number;
      readonly marketQualityScore: number;
      readonly riskRewardScore: number;
    },
    riskRewardBand: RiskRewardBand,
    blockers: readonly string[],
    softPenalties: readonly TradeDecisionAdjustment[],
    tradeDecisionScore: number
  ): readonly TradeDecisionAdjustment[] {
    const items: TradeDecisionAdjustment[] = [
      {
        label: 'Trend Score',
        points: roundTo(componentScores.trendScore * TRADE_DECISION_WEIGHTS.trendScore, 2),
        reason: `Trend score ${roundTo(componentScores.trendScore, 2)} contributes 40% of the final decision.`
      },
      {
        label: 'Entry',
        points: roundTo(componentScores.entryScore * TRADE_DECISION_WEIGHTS.entryScore, 2),
        reason: `Entry score ${roundTo(componentScores.entryScore, 2)} contributes 30% of the final decision.`
      },
      {
        label: 'MTF',
        points: roundTo(componentScores.multiTimeframeScore * TRADE_DECISION_WEIGHTS.multiTimeframe, 2),
        reason: this.resolveMultiTimeframeReason(input.higherTimeframeConfirmation)
      },
      {
        label: 'Market Quality',
        points: roundTo(componentScores.marketQualityScore * TRADE_DECISION_WEIGHTS.marketQuality, 2),
        reason: `Market quality is ${input.marketQuality}.`
      },
      {
        label: 'Risk Reward',
        points: roundTo(componentScores.riskRewardScore * TRADE_DECISION_WEIGHTS.riskReward, 2),
        reason: `Risk/reward is classified as ${riskRewardBand}.`
      }
    ];

    items.push(...softPenalties);

    for (const blocker of blockers) {
      items.push({ label: 'Blocked because', points: 0, reason: blocker });
    }

    items.push({
      label: 'TOTAL',
      points: tradeDecisionScore,
      reason: 'Final calibrated decision score after weighted contributions and soft penalties.'
    });

    return items;
  }

  private resolveMultiTimeframeReason(confirmation: HigherTimeframeConfirmation): string {
    if (confirmation === 'Confirmed') {
      return '1H confirms the bearish setup.';
    }

    if (confirmation === 'Counter Trend') {
      return '1H is bullish against the setup.';
    }

    return '1H is neutral and does not strongly confirm the setup.';
  }

  private resolveExtensionState(distanceFromEMA20Percent: number, distanceFromEMA200Percent: number): ExtensionState {
    const ema20Distance = Math.abs(distanceFromEMA20Percent);
    const ema200Distance = Math.abs(distanceFromEMA200Percent);

    if (ema20Distance > 2.4 || ema200Distance > 9) {
      return 'Extended';
    }

    if (ema20Distance > 1.4 || ema200Distance > 6) {
      return 'Slightly Extended';
    }

    return 'Not Extended';
  }

  private riskRewardBandScore(band: RiskRewardBand): number {
    if (band === 'Excellent') {
      return 100;
    }

    if (band === 'Good') {
      return 82;
    }

    if (band === 'Average') {
      return 62;
    }

    if (band === 'Poor') {
      return 30;
    }

    return 40;
  }

  private multiTimeframeScore(confirmation: HigherTimeframeConfirmation): number {
    if (confirmation === 'Confirmed') {
      return 100;
    }

    if (confirmation === 'Counter Trend') {
      return 25;
    }

    return 60;
  }

  private resolveVerdictByScore(score: number): TradeDecisionVerdict {
    if (score >= TRADE_DECISION_A_PLUS_MIN) {
      return 'A_PLUS_SETUP';
    }

    if (score >= TRADE_DECISION_STRONG_MIN) {
      return 'STRONG_SETUP';
    }

    if (score >= TRADE_DECISION_WATCH_MIN) {
      return 'WATCH';
    }

    if (score >= TRADE_DECISION_WEAK_MIN) {
      return 'WEAK';
    }

    return 'AVOID';
  }

  private resolveRecommendation(verdict: TradeDecisionVerdict, blockers: readonly string[]): string {
    if (blockers.length > 0) {
      return `Rejected because: ${blockers.join(' ')}`;
    }

    if (verdict === 'A_PLUS_SETUP') {
      return 'High-conviction setup. Ready for entry on confirmation.';
    }

    if (verdict === 'STRONG_SETUP') {
      return 'Strong bearish candidate for the active watchlist.';
    }

    if (verdict === 'WATCH') {
      return 'Good setup quality, but execution still needs confirmation.';
    }

    if (verdict === 'WEAK') {
      return 'Setup is below preferred quality but not objectively invalid.';
    }

    return 'Setup quality is too weak for a bearish trade.';
  }
}
